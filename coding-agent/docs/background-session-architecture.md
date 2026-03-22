# 后台 Session 架构说明

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              主进程 (Node.js)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐                                         │
│  │      前台 Session              │                                         │
│  │      (用户主交互)               │                                         │
│  │                               │                                         │
│  │   ┌─────────────────────┐     │                                         │
│  │   │    AgentSession     │     │                                         │
│  │   │  - 用户输入/输出      │     │                                         │
│  │   │  - 模型选择          │     │                                         │
│  │   │  - ExtensionAPI     │     │                                         │
│  │   └─────────────────────┘     │                                         │
│  └───────────────┬───────────────┘                                         │
│                  │ currentModel (共享模型)                                  │
│                  ▼                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Goal-Driven Extension                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │ │
│  │  │ UnifiedTask     │  │ Background      │  │ BackgroundSession   │   │ │
│  │  │ Scheduler       │  │ Executor        │  │ Manager             │   │ │
│  │  │                 │──│                 │──│                     │   │ │
│  │  │ - 周期调度      │  │ - 任务队列      │  │ - 会话创建/销毁      │   │ │
│  │  │ - 任务派发      │  │ - 并发控制      │  │ - 心跳监控          │   │ │
│  │  │ - 结果处理      │  │ - 评分排序      │  │ - 事件监听          │   │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      │ createSession()                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        后台 Session 池                                  │ │
│  │                                                                        │ │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │ │
│  │   │ 后台任务 1       │  │ 后台任务 2       │  │ 后台任务 N       │       │ │
│  │   │                 │  │                 │  │  (最多 3 个并发)  │       │ │
│  │   │ AgentSession    │  │ AgentSession    │  │ AgentSession    │       │ │
│  │   │ (完全独立)       │  │ (完全独立)       │  │ (完全独立)       │       │ │
│  │   │                 │  │                 │  │                 │       │ │
│  │   │ session-abc.json│  │ session-def.json│  │ session-ghi.json│       │ │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘       │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          EventBus (事件总线)                            │ │
│  │                                                                        │ │
│  │   前台 ──► goal_driven:execute_task ──► 后台                          │ │
│  │   前台 ◄── goal_driven:task_result ◄── 后台                           │ │
│  │   前台 ◄── goal_driven:background_log ◄── 后台                        │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 任务执行流程图

```
用户: /goal add "帮我分析汽车报价"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Extension Handler                                         │
│    - 解析用户意图                                             │
│    - 调用 orchestrator.startGoal()                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GoalOrchestrator.startGoal()                             │
│    - 创建 Goal (目标)                                        │
│    - 创建 Dimensions (维度)                                  │
│    - 生成 Tasks (任务)                                       │
│    - 启动 Scheduler                                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. UnifiedTaskScheduler.runCycle() (每 60 秒)               │
│    - 获取 ready 状态的任务                                    │
│    - 按优先级排序                                            │
│    - 检查是否需要后台执行                                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. executeWithBackgroundExecutor()                          │
│    - 收集相关 Knowledge                                      │
│    - 构建 enhancedPrompt                                     │
│    - EventBus.emit('goal_driven:execute_task')              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. AgentPiBackgroundExecutor.handleExecuteTask()            │
│                                                             │
│    ┌──────────────────────────────────────────────────────┐ │
│    │ 有空闲槽位 (runningTasks < 3) ?                       │ │
│    │                                                      │ │
│    │  YES ──► executeTask() 立即执行                       │ │
│    │                                                      │ │
│    │  NO  ──► 加入 dispatchQueue 排队等待                  │ │
│    │           (每 5 秒重新评分派发)                        │ │
│    └──────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. BackgroundSessionManager.createSession()                 │
│    - 创建 SessionManager (文件管理)                          │
│    - 构建 AgentSessionConfig                                 │
│    - new AgentSession(agentConfig)  ◄── 独立实例            │
│    - 设置事件监听                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. BackgroundSessionManager.execute()                       │
│    - 启动心跳监控 (30 秒)                                    │
│    - session.prompt(enhancedPrompt)                         │
│    - 监控执行状态                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. AgentSession.prompt() - 实际执行                          │
│    - 调用 Agent Pi (LLM)                                    │
│    - 执行工具调用                                            │
│    - 产生输出                                                │
│    - 触发 turnEnd 事件                                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. 结果回传                                                  │
│                                                             │
│    BackgroundSessionManager                                 │
│         │                                                   │
│         ▼                                                   │
│    emitEvent({ type: "completed", result })                 │
│         │                                                   │
│         ▼                                                   │
│    AgentPiBackgroundExecutor.handleTaskSuccess()            │
│         │                                                   │
│         ▼                                                   │
│    EventBus.emit('goal_driven:task_result')                 │
│         │                                                   │
│         ▼                                                   │
│    UnifiedTaskScheduler.handleTaskResult()                  │
│         │                                                   │
│         ├── 更新任务状态为 completed                         │
│         ├── 提取知识存入 KnowledgeStore                     │
│         └── 触发通知 (如需要用户确认)                        │
└─────────────────────────────────────────────────────────────┘
```

## 关键关系说明

| 关系 | 说明 |
|------|------|
| **前台 ↔ 后台模型共享** | 后台 session 使用与前台相同的 `currentModel`，用户切换模型时后台也会更新 |
| **AgentSession 独立性** | 每个后台任务创建独立的 `AgentSession` 实例，互不干扰 |
| **通信机制** | 通过 `EventBus` 事件总线，前台派发任务，后台返回结果 |
| **并发限制** | 最多 3 个后台任务同时运行，超出则排队等待 |
| **日志流向** | 后台日志通过 `goal_driven:background_log` 事件发送到前台 |

## 核心组件说明

### 1. BackgroundSessionManager

**职责**: 管理后台会话的生命周期

**核心方法**:
- `createSession()`: 创建后台 AgentSession 实例
- `execute()`: 在后台会话中执行任务
- `terminateSession()`: 终止后台会话
- `setupSessionListeners()`: 监听会话事件

### 2. AgentPiBackgroundExecutor

**职责**: 任务队列管理和并发控制

**核心属性**:
- `dispatchQueue`: 排队等待的任务
- `runningTasks`: 正在运行的任务
- `maxConcurrent`: 最大并发数 (默认 3)

**任务评分机制**:
- 紧迫度: 基于截止时间、任务类型、优先级
- 价值: 基于预期产出、工具需求、目标进度
- 等待时间: 防止任务饥饿

### 3. UnifiedTaskScheduler

**职责**: 周期性调度和任务派发

**核心流程**:
- 每 60 秒执行一次 `runCycle()`
- 获取 ready 状态的任务
- 按优先级排序
- 派发到后台执行器

## 文件位置

```
coding-agent/src/core/goal-driven/
├── extension.ts                    # 扩展入口，初始化所有组件
├── runtime/
│   ├── background-session.ts       # BackgroundSessionManager
│   ├── agent-pi-executor.ts        # AgentPiBackgroundExecutor
│   ├── log-buffer.ts               # 日志内存缓冲
│   ├── log-persister.ts            # 日志文件持久化
│   └── ui-logger.ts                # UI 日志发送
├── scheduler/
│   └── unified-task-scheduler.ts   # 任务调度器
└── orchestrator/
    └── goal-orchestrator.ts        # 目标编排器
```

## 日志文件位置

| 日志类型 | 文件路径 | 格式 |
|----------|-----------|------|
| Goal-Driven Logs | `~/.pi/agent/logs/goal-driven-YYYY-MM-DD.log` | JSON Lines |
| Background Session Logs | `~/.pi/agent/goal-driven/logs/background-session.log` | Plain text with timestamps |
| Session Interaction Logs | `~/.pi/agent/session-logs/session-{sessionId}.jsonl` | JSON Lines |
| Session Files | `~/.pi/agent/sessions/{encoded-cwd}/` | JSON Lines |

## 关键代码路径

| 功能 | 文件路径 | 关键函数 |
|------|----------|----------|
| BackgroundSessionManager | `runtime/background-session.ts` | 类定义: 第 134 行 |
| 创建后台会话 | `runtime/background-session.ts` | `createSession()`: 第 164 行 |
| 执行后台任务 | `runtime/background-session.ts` | `execute()`: 第 241 行 |
| 构建 AgentSession 配置 | `runtime/background-session.ts` | `buildAgentSessionConfig()`: 第 437 行 |
| AgentPiBackgroundExecutor | `runtime/agent-pi-executor.ts` | 类定义: 第 170 行 |
| 处理执行请求 | `runtime/agent-pi-executor.ts` | `handleExecuteTask()`: 第 520 行 |
| 执行任务 | `runtime/agent-pi-executor.ts` | `executeTask()`: 第 600 行 |
| 任务评分排序 | `runtime/agent-pi-executor.ts` | `scoreAndSortQueue()`: 第 316 行 |
| UnifiedTaskScheduler | `scheduler/unified-task-scheduler.ts` | 类定义: 第 63 行 |
| 启动调度器 | `scheduler/unified-task-scheduler.ts` | `start()`: 第 179 行 |
| 执行周期 | `scheduler/unified-task-scheduler.ts` | `runCycle()`: 第 260 行 |
| 后台执行派发 | `scheduler/unified-task-scheduler.ts` | `executeWithBackgroundExecutor()`: 第 687 行 |
| 处理任务结果 | `scheduler/unified-task-scheduler.ts` | `handleTaskResult()`: 第 733 行 |
| Extension 初始化 | `extension.ts` | `initialize()`: 第 138 行 |
| 前台 Session 创建 | `sdk.ts` | `createAgentSession()`: 第 165 行 |
