# Goal-Driven Agent 后台执行架构设计

## 1. 概述

### 1.1 背景

当前 Goal-Driven Agent 的任务执行采用直接调用 ExecutionPipeline 的方式，仅使用 LLM 进行简单对话，无法充分利用 Agent Pi 的完整能力（工具调用、代码执行、文件操作等）。本方案设计一种后台执行架构，使任务能够：

1. **复用 Agent Pi 完整能力**：包括所有工具（websearch、read、edit、bash 等）
2. **后台异步执行**：不阻塞用户前端交互
3. **结果通知**：执行完成后主动通知用户

### 1.2 核心挑战

| 挑战 | 解决方案 |
|------|----------|
| 如何复用 Agent Pi | 使用 `sendUserMessage` + `newSession` 创建独立会话 |
| 如何避免阻塞用户 | EventBus 异步派发，scheduler 立即返回 |
| 如何协调执行状态 | EventBus 事件机制进行跨组件通信 |
| 如何获取执行结果 | 监听 idle 事件，提取 lastMessage 内容 |

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            User Session (Frontend)                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ GoalOrchestrator│───▶│ UnifiedTaskScheduler│───▶│ EventBus (pi.events)   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
│                              dispatchTask()              │                  │
└──────────────────────────────────────────────────────────┼──────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Background Execution Pool                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    AgentPiBackgroundExecutor                         │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │    │
│  │  │ Session Manager │  │ Execution Worker│  │ Result Collector    │  │    │
│  │  │  - newSession   │  │  - sendMessage  │  │  - onIdle listener  │  │    │
│  │  │  - setTools     │  │  - waitForIdle  │  │  - extractResult    │  │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Agent Pi Session (Isolated)                      │    │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │    │
│  │   │WebSearch│ │  Read   │ │  Edit   │ │  Bash   │ │  ...    │      │    │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Notification System                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ Result Processor│───▶│NotificationQueue│───▶│     User Notification    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 UnifiedTaskScheduler（调度器）

**职责**：任务调度，状态管理，事件派发

**修改点**：
- 不再直接调用 `executionPipeline.run(task)`
- 改为通过 EventBus 派发执行事件
- 更新任务状态为 `in_progress` 后立即返回

```typescript
// 关键代码变更
async executeTask(task: Task): Promise<void> {
  // 原实现：直接执行
  // const result = await this.executionPipeline.run(task);

  // 新实现：派发事件，后台执行
  await this.taskStore.updateStatus(task.id, 'in_progress');

  this.eventBus.emit('goal_driven:execute_task', {
    taskId: task.id,
    goalId: task.goalId,
    execution: task.execution,
    requiredTools: task.execution.requiredTools,
  });
}
```

#### 2.2.2 AgentPiBackgroundExecutor（后台执行器）

**职责**：监听事件，创建独立会话，执行 Agent Pi，收集结果

**位置**：`coding-agent/src/core/goal-driven/runtime/agent-pi-executor.ts`

**核心功能**：

1. **事件监听**：监听 `goal_driven:execute_task` 事件
2. **会话创建**：使用 `newSession` 创建隔离执行环境
3. **工具配置**：根据任务需求配置可用工具
4. **执行监控**：等待 idle 状态，提取执行结果
5. **结果通知**：通过 EventBus 返回执行结果

```typescript
interface AgentPiBackgroundExecutor {
  // 初始化，开始监听事件
  initialize(): void;

  // 处理执行任务请求
  onExecuteTask(event: ExecuteTaskEvent): Promise<void>;

  // 创建 Agent Pi 会话
  createSession(tools: string[]): Promise<SessionHandle>;

  // 执行具体任务
  executeInSession(session: SessionHandle, prompt: string): Promise<ExecutionResult>;

  // 处理执行结果
  handleResult(taskId: string, result: ExecutionResult): void;
}
```

### 2.3 事件定义

```typescript
// 执行任务请求事件
interface ExecuteTaskEvent {
  type: 'goal_driven:execute_task';
  payload: {
    taskId: string;
    goalId: string;
    execution: ExecutionConfig;
    requiredTools: string[];
    context?: KnowledgeEntry[];
  };
}

// 任务结果返回事件
interface TaskResultEvent {
  type: 'goal_driven:task_result';
  payload: {
    taskId: string;
    goalId: string;
    success: boolean;
    output?: string;
    outputType?: ExpectedResultType;
    error?: string;
    duration: number;
    tokenUsage?: number;
    knowledgeEntries?: KnowledgeEntry[];
  };
}

// 任务进度更新事件（可选，用于长任务）
interface TaskProgressEvent {
  type: 'goal_driven:task_progress';
  payload: {
    taskId: string;
    progress: number; // 0-100
    message?: string;
  };
}
```

## 3. 数据流设计

### 3.1 执行流程序列图

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────────┐     ┌─────────────┐
│   Scheduler │     │   EventBus   │     │  Executor   │     │ Agent Pi Session│     │  TaskStore  │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘     └───────┬────────┘     └──────┬──────┘
       │                   │                    │                     │                    │
       │  1. dispatch      │                    │                     │                    │
       │──────────────────▶│                    │                     │                    │
       │                   │                    │                     │                    │
       │  2. return        │  3. emit           │                     │                    │
       │◀──────────────────│───────────────────▶│                     │                    │
       │                   │                    │                     │                    │
       │                   │                    │  4. newSession      │                    │
       │                   │                    │────────────────────▶│                    │
       │                   │                    │                     │                    │
       │                   │                    │  5. session handle  │                    │
       │                   │                    │◀────────────────────│                    │
       │                   │                    │                     │                    │
       │                   │                    │  6. setActiveTools  │                    │
       │                   │                    │────────────────────▶│                    │
       │                   │                    │                     │                    │
       │                   │                    │  7. sendUserMessage │                    │
       │                   │                    │────────────────────▶│                    │
       │                   │                    │                     │                    │
       │                   │                    │  8. execute         │                    │
       │                   │                    │◀────────────────────│                    │
       │                   │                    │                     │                    │
       │                   │                    │  9. tool calls      │                    │
       │                   │                    │────────────────────▶│                    │
       │                   │                    │                     │                    │
       │                   │                    │  10. results        │                    │
       │                   │                    │◀────────────────────│                    │
       │                   │                    │                     │                    │
       │                   │                    │  11. idle event     │                    │
       │                   │                    │◀────────────────────│                    │
       │                   │                    │                     │                    │
       │                   │                    │  12. extract result │                    │
       │                   │                    │────┐                │                    │
       │                   │                    │    │                │                    │
       │                   │                    │◀───┘                │                    │
       │                   │                    │                     │                    │
       │                   │  13. emit result   │                     │                    │
       │                   │◀───────────────────│                     │                    │
       │                   │                    │                     │                    │
       │  14. receive      │                    │                     │                    │
       │◀──────────────────│                    │                     │                    │
       │                   │                    │                     │                    │
       │  15. update status│                    │                     │                    │
       │─────────────────────────────────────────────────────────────────────────────────▶│
       │                   │                    │                     │                    │
```

### 3.2 状态流转

```
                    ┌──────────────┐
                    │    ready     │
                    └──────┬───────┘
                           │ 1. Scheduler
                           │    dispatch
                           ▼
                    ┌──────────────┐
    ┌──────────────▶│  in_progress │◀────────────────┐
    │               └──────┬───────┘                 │
    │                      │ 2. Background            │
    │                      │    execution             │
    │                      ▼                          │
    │               ┌──────────────┐                  │
    │               │   running    │                  │
    │               │ (in session) │                  │
    │               └──────┬───────┘                  │
    │                      │                          │
    │           ┌─────────┼─────────┐                 │
    │           │         │         │                 │
    │           ▼         ▼         ▼                 │
    │    ┌─────────┐ ┌─────────┐ ┌─────────┐         │
    │    │success  │ │ failed  │ │ waiting │         │
    │    └────┬────┘ └────┬────┘ └────┬────┘         │
    │         │           │           │               │
    │         ▼           ▼           ▼               │
    │    ┌─────────┐ ┌─────────┐ ┌─────────┐         │
    └────│completed│ │ failed  │ │waiting_ │─────────┘
         └─────────┘ └─────────┘ │  user   │  (interactive)
                                 └─────────┘
```

## 4. 组件详细设计

### 4.1 AgentPiBackgroundExecutor

```typescript
// coding-agent/src/core/goal-driven/runtime/agent-pi-executor.ts

import type { ExtensionAPI, EventBus } from '../../extensions/types';
import type { Task, ExecutionResult, KnowledgeEntry } from '../types';

interface SessionHandle {
  sessionId: string;
  context: ExtensionCommandContext;
}

interface ExecuteTaskPayload {
  taskId: string;
  goalId: string;
  agentPrompt: string;
  requiredTools: string[];
  contextKnowledge?: KnowledgeEntry[];
}

export class AgentPiBackgroundExecutor {
  private runningSessions = new Map<string, SessionHandle>();

  constructor(
    private pi: ExtensionAPI,
    private eventBus: EventBus,
    private taskStore: ITaskStore,
    private knowledgeStore: IKnowledgeStore,
    private notificationQueue: INotificationQueue
  ) {}

  /**
   * 初始化执行器，开始监听事件
   */
  initialize(): void {
    // 监听执行任务请求
    this.eventBus.on('goal_driven:execute_task', this.handleExecuteTask.bind(this));

    console.log('[AgentPiBackgroundExecutor] Initialized and listening');
  }

  /**
   * 处理执行任务请求
   */
  private async handleExecuteTask(payload: ExecuteTaskPayload): Promise<void> {
    const { taskId, goalId, agentPrompt, requiredTools, contextKnowledge } = payload;

    console.log(`[AgentPiBackgroundExecutor] Starting task ${taskId}`);

    try {
      // 1. 创建独立会话
      const session = await this.createSession(taskId, requiredTools);
      this.runningSessions.set(taskId, session);

      // 2. 构建增强 prompt（注入知识）
      const enhancedPrompt = this.buildPrompt(agentPrompt, contextKnowledge);

      // 3. 在会话中执行
      const result = await this.executeInSession(session, enhancedPrompt);

      // 4. 清理会话
      this.runningSessions.delete(taskId);

      // 5. 保存知识条目
      if (result.knowledgeEntries) {
        for (const entry of result.knowledgeEntries) {
          await this.knowledgeStore.save(entry);
        }
      }

      // 6. 更新任务状态
      await this.taskStore.updateStatus(
        taskId,
        result.success ? 'completed' : 'failed',
        { executionResult: result }
      );

      // 7. 添加执行记录
      await this.taskStore.addExecutionRecord(taskId, {
        timestamp: Date.now(),
        status: result.success ? 'success' : 'failed',
        duration: result.duration,
        tokenUsage: result.tokenUsage,
        summary: result.output?.slice(0, 200),
      });

      // 8. 发送结果事件
      this.eventBus.emit('goal_driven:task_result', {
        taskId,
        goalId,
        ...result,
      });

      // 9. 如果配置了通知，加入队列
      const task = await this.taskStore.getTask(taskId);
      if (task?.shouldNotify && result.success) {
        this.notificationQueue.enqueue({
          type: 'report',
          priority: task.priority,
          title: `任务完成: ${task.title}`,
          content: result.output || '执行完成',
          goalId,
          taskId,
        });
      }

    } catch (error) {
      console.error(`[AgentPiBackgroundExecutor] Task ${taskId} failed:`, error);

      // 更新失败状态
      await this.taskStore.updateStatus(taskId, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // 发送失败事件
      this.eventBus.emit('goal_driven:task_result', {
        taskId,
        goalId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: 0,
      });
    }
  }

  /**
   * 创建新的 Agent Pi 会话
   */
  private async createSession(
    taskId: string,
    tools: string[]
  ): Promise<SessionHandle> {
    // 创建新会话
    const session = await this.pi.newSession({
      name: `goal-driven-task-${taskId.slice(0, 8)}`,
      context: {
        isBackgroundExecution: true,
        taskId,
      },
    });

    // 配置可用工具
    await this.pi.setActiveTools(tools, session.id);

    return {
      sessionId: session.id,
      context: session,
    };
  }

  /**
   * 在会话中执行 Agent Pi
   */
  private async executeInSession(
    session: SessionHandle,
    prompt: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // 发送用户消息触发 Agent Pi 执行
    await this.pi.sendUserMessage(prompt, {
      sessionId: session.sessionId,
    });

    // 等待会话进入 idle 状态
    await session.context.waitForIdle();

    // 提取执行结果
    const result = await this.extractResult(session);

    const duration = Date.now() - startTime;

    return {
      ...result,
      duration,
    };
  }

  /**
   * 从会话中提取执行结果
   */
  private async extractResult(session: SessionHandle): Promise<ExecutionResult> {
    // 获取会话的最后一条消息作为结果
    const messages = await this.pi.getSessionMessages(session.sessionId);
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage) {
      return {
        success: false,
        error: 'No response from Agent Pi',
        duration: 0,
      };
    }

    // 解析结果内容
    const content = lastMessage.content;

    // 检查是否有错误
    if (lastMessage.role === 'system' && lastMessage.isError) {
      return {
        success: false,
        error: content,
        output: content,
        duration: 0,
      };
    }

    return {
      success: true,
      output: content,
      outputType: 'information',
      outputFormat: 'markdown',
      duration: 0,
    };
  }

  /**
   * 构建增强 prompt，注入知识上下文
   */
  private buildPrompt(
    basePrompt: string,
    knowledgeEntries?: KnowledgeEntry[]
  ): string {
    if (!knowledgeEntries || knowledgeEntries.length === 0) {
      return basePrompt;
    }

    const knowledgeContext = knowledgeEntries
      .map(k => `- [${k.category}] ${k.content}`)
      .join('\n');

    return `## 相关背景知识\n${knowledgeContext}\n\n## 任务\n${basePrompt}`;
  }

  /**
   * 取消正在执行的任务
   */
  async cancelTask(taskId: string): Promise<void> {
    const session = this.runningSessions.get(taskId);
    if (session) {
      // 终止会话
      await this.pi.terminateSession(session.sessionId);
      this.runningSessions.delete(taskId);
    }
  }

  /**
   * 获取正在执行的任务列表
   */
  getRunningTasks(): string[] {
    return Array.from(this.runningSessions.keys());
  }
}
```

### 4.2 UnifiedTaskScheduler 修改

```typescript
// coding-agent/src/core/goal-driven/scheduler/unified-task-scheduler.ts

export class UnifiedTaskScheduler {
  // ... 现有代码 ...

  /**
   * 执行任务 - 修改为后台派发模式
   */
  private async executeTask(task: Task): Promise<void> {
    console.log(`[UnifiedTaskScheduler] Dispatching task ${task.id} to background executor`);

    // 更新任务状态为执行中
    await this.taskStore.updateStatus(task.id, 'in_progress', {
      startedAt: Date.now(),
    });

    // 获取相关知识点
    const knowledgeEntries = await this.knowledgeStore.getRelevantKnowledgeForTask(
      task,
      task.execution.agentPrompt,
      { maxResults: 5 }
    );

    // 派发到后台执行器（非阻塞）
    this.eventBus.emit('goal_driven:execute_task', {
      taskId: task.id,
      goalId: task.goalId,
      agentPrompt: task.execution.agentPrompt,
      requiredTools: task.execution.requiredTools,
      contextKnowledge: knowledgeEntries,
    });

    // 立即返回，不等待执行完成
    console.log(`[UnifiedTaskScheduler] Task ${task.id} dispatched`);
  }

  /**
   * 初始化 - 添加结果监听
   */
  async start(): Promise<void> {
    console.log('[UnifiedTaskScheduler] Starting...');

    this.isRunning = true;

    // 监听任务结果
    this.eventBus.on('goal_driven:task_result', this.handleTaskResult.bind(this));

    // 启动主循环
    this.runLoop();

    // 启动空闲检测（用于触发后续任务）
    this.idleDetector.start();
  }

  /**
   * 处理任务结果
   */
  private async handleTaskResult(payload: {
    taskId: string;
    goalId: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    console.log(`[UnifiedTaskScheduler] Received result for task ${payload.taskId}`);

    // 从执行中列表移除
    this.executingTasks.delete(payload.taskId);

    // 检查依赖，更新后续任务状态
    await this.dependencyGraph.updateAllTaskStatuses(payload.goalId);

    // 触发下一轮调度
    this.scheduleNext();
  }

  // ... 其余代码保持不变 ...
}
```

### 4.3 ExtensionAPI 扩展

```typescript
// coding-agent/src/core/extensions/types.ts

export interface ExtensionAPI {
  // ... 现有接口 ...

  /**
   * 获取会话的消息历史
   */
  getSessionMessages(
    sessionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isError?: boolean;
  }>>;

  /**
   * 终止指定会话
   */
  terminateSession(sessionId: string): Promise<void>;

  /**
   * 设置会话的活跃工具
   */
  setActiveTools(tools: string[], sessionId?: string): Promise<void>;
}
```

## 5. 工具映射配置

任务配置中的 `requiredTools` 到实际工具名称的映射：

```typescript
const TOOL_MAPPING: Record<string, string> = {
  // 基础工具
  'websearch': 'websearch',
  'web_fetch': 'web_fetch',
  'read': 'read',
  'write': 'write',
  'edit': 'edit',
  'bash': 'bash',
  'glob': 'glob',
  'grep': 'grep',

  // Agent 工具
  'agent': 'agent',

  // 可能的其他工具
  'skill': 'skill',
};

function resolveTools(requiredTools: string[]): string[] {
  return requiredTools
    .map(t => TOOL_MAPPING[t] || t)
    .filter(Boolean);
}
```

## 6. 错误处理与重试

### 6.1 错误分类

| 错误类型 | 处理策略 |
|----------|----------|
| 网络/工具失败 | 重试 3 次，指数退避 |
| 会话创建失败 | 立即失败，记录错误 |
| 执行超时 | 取消任务，标记失败 |
| 结果解析失败 | 返回原始输出，标记部分成功 |

### 6.2 重试机制

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelay: 1000, maxDelay: 30000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        );
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
```

## 7. 性能考量

### 7.1 资源限制

| 资源 | 限制策略 |
|------|----------|
| 并发会话数 | 最多 3 个后台会话同时运行 |
| 单任务超时 | 默认 10 分钟，可配置 |
| 会话生命周期 | 任务完成后立即终止 |
| Token 使用 | 继承用户会话的限制 |

### 7.2 并发控制

```typescript
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}
```

## 8. 集成步骤

### 8.1 实施顺序

1. **Phase 1**: 创建 `AgentPiBackgroundExecutor` 基础框架
2. **Phase 2**: 修改 `UnifiedTaskScheduler` 使用事件派发
3. **Phase 3**: 实现 ExtensionAPI 扩展方法（如果需要）
4. **Phase 4**: 集成测试，验证完整流程
5. **Phase 5**: 添加错误处理、重试、监控

### 8.2 依赖检查

```typescript
// 启动时检查必要的 API 是否可用
function validateExtensionAPI(pi: ExtensionAPI): void {
  const required = ['newSession', 'sendUserMessage', 'events'];
  const optional = ['getSessionMessages', 'terminateSession', 'setActiveTools'];

  for (const method of required) {
    if (!(method in pi)) {
      throw new Error(`Required ExtensionAPI method not available: ${method}`);
    }
  }

  for (const method of optional) {
    if (!(method in pi)) {
      console.warn(`Optional ExtensionAPI method not available: ${method}`);
    }
  }
}
```

## 9. 测试策略

### 9.1 单元测试

```typescript
describe('AgentPiBackgroundExecutor', () => {
  it('should dispatch task and emit result event', async () => {
    // 测试基本派发和结果返回
  });

  it('should handle execution errors gracefully', async () => {
    // 测试错误处理
  });

  it('should respect concurrency limits', async () => {
    // 测试并发控制
  });
});
```

### 9.2 集成测试

```typescript
describe('Background Execution Integration', () => {
  it('should execute exploration task end-to-end', async () => {
    // 创建 exploration 任务
    // 启动 scheduler
    // 验证任务完成
    // 验证通知队列
  });

  it('should handle multiple concurrent tasks', async () => {
    // 创建多个任务
    // 验证并发执行
    // 验证结果顺序
  });
});
```

## 10. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| newSession API 不可用 | 高 | 提供 LLM-only 降级方案 |
| 会话泄漏 | 中 | 确保 finally 中终止会话 |
| 无限循环执行 | 高 | 设置单任务超时和全局执行限制 |
| 资源竞争 | 中 | 限制并发会话数，合理排队 |
| 结果过大 | 低 | 限制输出大小，必要时截断 |

## 11. 附录

### 11.1 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `runtime/agent-pi-executor.ts` | 新增 | 后台执行器核心实现 |
| `scheduler/unified-task-scheduler.ts` | 修改 | 改用事件派发 |
| `runtime/coding-agent-adapter.ts` | 废弃 | 被新执行器替代 |
| `extensions/types.ts` | 可选修改 | 添加扩展 API 定义 |

### 11.2 配置选项

```typescript
interface BackgroundExecutionConfig {
  // 并发控制
  maxConcurrentSessions: number;      // 默认: 3

  // 超时设置
  taskTimeoutMs: number;              // 默认: 600000 (10分钟)
  sessionIdleTimeoutMs: number;       // 默认: 300000 (5分钟)

  // 重试设置
  maxRetries: number;                 // 默认: 3
  retryBaseDelayMs: number;           // 默认: 1000

  // 结果处理
  maxOutputLength: number;            // 默认: 100000 (字符)
  autoExtractKnowledge: boolean;      // 默认: true
}
```

---

**文档版本**: 1.0
**创建日期**: 2026-03-16
**作者**: Claude Code
**状态**: 设计方案，待评审
