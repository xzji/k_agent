# 后台任务用户输入交互机制 - 实现记录

---

## 后台日志视图 Ctrl+C 信号隔离修复 - 实现记录

**实现日期**: 2026-03-19

### 问题描述

使用 `alt+b` 进入后台日志视图后，在 `less +F`（跟踪模式）下按 `Ctrl+C` 会直接杀死整个 Pi 进程，而不是停止跟踪。

### 根因分析

问题涉及三个层面的交互：

1. **终端模式切换**：`tui.stop()` 后终端恢复 cooked mode，Ctrl+C 会产生 SIGINT
2. **进程组共享**：`spawnSync` 不支持 `detached` 选项，子进程与 Pi 在同一前台进程组
3. **信号传播**：SIGINT 发送到整个进程组，Pi 进程收到信号后退出

### 尝试过的方案（都失败）

| 方案 | 原因 |
|------|------|
| `trap '' INT` shell 包装 | 只保护 shell，Node.js 进程仍收到 SIGINT |
| `process.on("SIGINT", () => {})` 空 handler | 不知为何不生效 |
| 保存并移除所有 SIGINT 监听器后再添加空 handler | 仍然不生效 |

### 最终解决方案

使用 `script` 命令创建独立伪终端（pty），让 `less` 在新进程组运行：

```typescript
spawnSync("script", [
  "-q",           // 静默模式
  "/dev/null",    // 不记录 session 日志
  "less",
  "-P", "📋 后台日志视图 | Ctrl+C 停止跟踪 | q 退出返回前台",
  "+F",
  logPath
], {
  stdio: "inherit",
});
```

**原理**：`script` 创建新的 pty，Ctrl+C 信号只发送到新进程组，完全隔离信号。

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `extension.ts` | 快捷键处理器中使用 `script` 命令包装 `less` |

### 验证结果

- `Ctrl+C` 停止跟踪：✅ 正常工作
- `q` 退出返回前台：✅ 正常工作
- TypeScript 编译：✅ 通过

---

## 后台日志视图切换与通知分级机制 - 实现记录

**实现日期**: 2026-03-18

### 概述

实现了后台日志视图切换功能，用户可通过快捷键在两个独立视图之间切换：
- **前台视图**: 正常的 Agent PI 交互界面，只显示重要通知
- **后台视图**: 专门的后台日志查看界面，显示所有后台 session 日志

### 新增功能

1. **视图切换**: 按 `cmd+b` (macOS) / `ctrl+b` (Windows/Linux) 切换视图
2. **通知分级**: 重要通知（error、需要用户输入、action_required）在前台也可见
3. **日志流式输出**: 所有日志实时流式输出到后台视图
4. **日志持久化**: 日志保存到 `~/.pi/agent/goal-driven/logs/background-session.log`

### 修改文件清单

#### 新建文件

| 文件 | 描述 |
|------|------|
| `runtime/log-buffer.ts` | 内存日志缓冲区，存储最近 200 条日志用于视图切换 |
| `runtime/log-persister.ts` | 日志文件持久化，实时写入日志文件 |
| `runtime/background-log-view.ts` | TUI 组件，后台日志视图界面 |

#### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `runtime/log-message-types.ts` | 添加 `LogCategory` 类型和 `category` 字段 |
| `config/types.ts` | 添加 `logBuffer.maxSize` 配置项 |
| `config/store.ts` | 添加嵌套配置键支持（如 "logBuffer.maxSize"） |
| `config/panel.ts` | 添加嵌套配置转换逻辑 |
| `extension.ts` | 添加快捷键注册、视图切换逻辑、重要日志过滤 |
| `index.ts` | 导出新类型和类 |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `ctrl+b` | 切换前台/后台日志视图 |
| `Escape` / `q` | 关闭后台日志视图 |
| `↑` / `↓` | 滚动查看历史日志 |
| `PageUp` / `PageDown` | 快速翻页 |
| `Home` | 跳到最新日志 |

### 通知分级规则

**前台立即显示**（不依赖模式）:
- `action_required`: 需要用户确认
- `error`: 错误日志
- `urgent`: 显式标记为 important 的日志
- 关键词匹配: "需要您的输入"、"failed"、"timeout" 等

**仅后台模式显示**:
- `debug`: 调试日志
- `info`: 普通信息日志
- `warn`: 警告日志

### 配置项

可通过 `/goal config` 修改：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `logBuffer.maxSize` | 内存中最大保留日志条数 | 200 |
| `uiLogLevel` | 日志显示级别 | info |

### 验证结果

- TypeScript 编译: 通过 ✅

---

## 后台任务日志输出优化 - 实现记录

**实现日期**: 2026-03-18

### 概述

解决了后台任务执行时的日志输出覆盖 Agent PI CLI 输入框的问题。

**问题表现**:
- 后台执行器使用 `console.log` 直接输出到终端
- 这会干扰 TUI（Terminal User Interface）渲染
- 日志覆盖输入框，影响用户交互

**解决方案**:
- 使用 EventBus 将日志发送到前台
- 前台监听事件并调用 `sendMessage` 显示在聊天区域
- 实现日志聚合机制避免消息泛滥

### 修改文件清单

#### 新建文件

| 文件 | 描述 |
|------|------|
| `runtime/log-message-types.ts` | 日志消息类型定义：`UILogLevel`、`BackgroundLogPayload`、`BackgroundLogEvent`、`isBackgroundLogPayload()` |
| `runtime/ui-logger.ts` | UI 日志器实现，将日志发送到 EventBus 而非 console |
| `runtime/log-aggregator.ts` | 日志聚合器，批量发送日志避免 UI 泛滥 |

#### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `config/types.ts` | 添加 `uiLogLevel` 配置项（`'debug' \| 'info' \| 'warn' \| 'error' \| 'none'`） |
| `runtime/agent-pi-executor.ts` | 1. 添加 `UILogger` 成员变量<br>2. 构造函数中初始化 UILogger<br>3. 替换所有 `console.log/warn/error` 为 UILogger 调用<br>4. 传入 `eventBus` 给 `initBackgroundSessionManager` |
| `runtime/background-session.ts` | 1. 添加 `UILogger` 成员变量<br>2. 构造函数添加 `eventBus` 参数<br>3. 替换所有 `console.log/warn/error` 为 UILogger 调用<br>4. 移除 `process.stdout.write` 调用 |
| `extension.ts` | 1. 导入新的日志类型<br>2. 注册 `background_log` 消息渲染器<br>3. 实现 `initLogAggregator()` 函数<br>4. 在配置变更时更新日志级别 |
| `index.ts` | 导出新类型：`UILogger`、`LogAggregator`、`formatLogMessage`、`formatAggregatedLogMessage` 等 |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Executor                       │
│  ┌─────────────────┐                                        │
│  │  Task Execution │ ──┬──> File Logger (GoalDrivenLogger) │
│  └─────────────────┘   │                                    │
│                        └──> UI Logger (UILogger)            │
│                                    │                        │
│                                    ▼                        │
│                            EventBus.emit()                  │
│                                    │                        │
└────────────────────────────────────│────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Extension (前台)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  EventBus.on("goal_driven:background_log")           │  │
│  │           │                                          │  │
│  │           ▼                                          │  │
│  │  LogAggregator.add() → 批量聚合                       │  │
│  │           │                                          │  │
│  │           ▼                                          │  │
│  │  pi.sendMessage({ customType: "background_log" })    │  │
│  │           │                                          │  │
│  │           ▼                                          │  │
│  │  聊天区域显示（输入框上方）                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 配置项

新增配置项 `uiLogLevel`，可通过 `/goal config` 设置：

| 值 | 说明 |
|----|------|
| `debug` | 显示所有日志 |
| `info` | 显示信息及以上（默认） |
| `warn` | 显示警告及以上 |
| `error` | 仅显示错误 |
| `none` | 不显示后台日志 |

### 日志显示格式

```
📋 **后台任务日志** (3 条: AgentPiExecutor: 2, BgSession: 1)

ℹ️ `10:30:45` **[AgentPiExecutor]** [a1b2c3d4] Starting task immediately
ℹ️ `10:30:46` **[AgentPiExecutor]** [a1b2c3d4] Session started
ℹ️ `10:31:15` **[BgSession]** [a1b2c3d4] Session Complete - Success: true
```

### 关键设计决策

1. **使用 EventBus 解耦**
   - 后台执行器通过 EventBus 发送日志事件
   - 前台 extension 监听事件并调用 sendMessage
   - 解耦后台执行与前台显示

2. **保持文件日志功能**
   - GoalDrivenLogger 继续写入文件日志
   - UILogger 专注于 UI 显示
   - 两者可以同时工作

3. **日志聚合机制**
   - 每 3 秒聚合一次
   - 最多 20 条日志强制刷新
   - 避免 UI 消息泛滥

4. **可配置的日志显示**
   - 用户可以选择隐藏后台日志
   - 可以调整显示级别

### 验证结果

- 后台执行器 console.log 数量: 0 ✅
- 后台会话管理器 console.log 数量: 0 ✅
- TypeScript 编译: 通过 ✅
- Goal-Driven 单元测试: 20/20 通过 ✅

### 保留的 console.log

以下文件中的 console.log 是前台初始化日志，不在后台执行循环中，不影响 TUI：

- `extension.ts` - 扩展初始化、配置更新日志
- `coding-agent-adapter.ts` - 前台 LLM 通道日志
- `tool-provider.ts` - 初始化警告日志

---

## 概述

本次实现了后台任务执行过程中的用户输入交互机制，允许 Agent 在执行过程中发现需要用户提供额外信息时：
1. 暂停任务执行
2. 生成通知请求用户输入
3. 等待用户响应
4. 拿到响应后继续执行

## 设计方案

### 核心思路：通过 `ask_user` 工具实现

让 Agent 主动调用一个 `ask_user` 工具来请求用户输入，而不是依赖 Agent Pi 核心的事件机制。

```
Agent 执行 → 调用 ask_user 工具 → 后台会话暂停 →
通知用户 → 用户响应 → 工具返回结果 → Agent 继续执行
```

## 修改文件清单

### 新建文件

| 文件 | 描述 |
|------|------|
| `tools/ask-user-tool.ts` | ask_user 工具定义，包含 AskUserParams、AskUserResult 接口 |
| `tools/index.ts` | 工具模块导出文件 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `types/index.ts` | 添加 `action_required` 通知类型和 `ActionRequired` 接口 |
| `runtime/background-session.ts` | 1. 添加 `waiting_input` 会话状态<br>2. 添加 `waiting_input`、`input_received` 事件类型<br>3. 实现 `provideUserInput` 方法<br>4. 实现 `getWaitingInputSessions`、`isWaitingForInput` 方法<br>5. 在 `buildAgentSessionConfig` 中创建 ask_user 工具并实现等待逻辑<br>6. 在 `terminateSession` 中清理 pendingInput |
| `runtime/tool-provider.ts` | 添加 `ask_user` 到默认工具列表 |
| `runtime/agent-pi-executor.ts` | 处理 `waiting_input` 和 `input_received` 事件，更新心跳时间戳 |
| `scheduler/unified-task-scheduler.ts` | 1. 添加 `taskSessionMap` 存储任务与会话映射<br>2. 订阅 background session 的 `waiting_input` 事件<br>3. 实现 `handleWaitingForInput` 方法创建通知<br>4. 实现 `handleUserInputForBackgroundTask` 方法<br>5. 更新 `handleUserResponse` 支持后台任务 |

## 核心实现细节

### 1. ask_user 工具定义

```typescript
export interface AskUserParams {
  question: string;        // 向用户提出的问题
  context?: string;        // 问题背景说明
  options?: string[];      // 可选的预设选项
  required?: boolean;      // 是否必须回答
}

export interface AskUserResult {
  response: string;        // 用户的回答
  timestamp: number;
}
```

### 2. 会话状态扩展

```typescript
type BackgroundSessionStatus =
  | "idle"
  | "running"
  | "waiting_input"  // 新增：等待用户输入
  | "completed"
  | "failed"
  | "terminated";
```

### 3. 事件类型扩展

```typescript
export type BackgroundSessionEvent =
  | { type: "waiting_input";    // 新增
      sessionId: string;
      taskId: string;
      question: AskUserParams;
      toolCallId: string; }
  | { type: "input_received";   // 新增
      sessionId: string;
      response: string; }
  // ... 其他事件
```

### 4. 工具执行等待机制

关键实现：在 ask_user 工具的 `execute` 函数中创建 Promise 等待用户输入：

```typescript
execute: async (toolCallId, params, _signal) => {
  // 更新状态为等待输入
  runningSession.handle.status = "waiting_input";

  // 发送等待输入事件
  this.emitEvent({ type: "waiting_input", ... });

  // 创建 Promise 等待用户输入
  return new Promise((resolve) => {
    runningSession.pendingInput = {
      toolCallId,
      question: params,
      resolve: (result) => {
        // 用户输入后恢复执行
        runningSession.handle.status = "running";
        resolve({ content: [{ type: 'text', text: result.response }] });
      },
      reject: (error) => {
        // 错误处理
        resolve({ content: [{ type: 'text', text: `Error: ${error.message}` }] });
      },
    };
  });
}
```

### 5. 用户输入恢复机制

```typescript
async provideUserInput(sessionId: string, response: string): Promise<void> {
  const runningSession = this.sessions.get(sessionId);

  // 验证状态
  if (runningSession.handle.status !== "waiting_input") {
    throw new Error(`Session is not waiting for input`);
  }

  // 解除等待
  runningSession.pendingInput.resolve({
    response,
    timestamp: now(),
  });
}
```

## 执行流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    后台任务执行流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 创建后台会话                                              │
│     └── BackgroundSessionManager.createSession()             │
│         └── 注册 ask_user 工具                                │
│                                                              │
│  2. 执行任务                                                  │
│     └── session.prompt(taskPrompt)                           │
│         │                                                    │
│         ▼                                                    │
│  3. Agent 发现需要用户输入                                    │
│     └── 调用 ask_user 工具                                    │
│         │                                                    │
│         ▼                                                    │
│  4. ask_user.execute() 执行                                   │
│     ├── 更新状态为 waiting_input                              │
│     ├── 创建 Promise 等待输入                                 │
│     └── 发送 waiting_input 事件                               │
│         │                                                    │
│         ▼                                                    │
│  5. UnifiedTaskScheduler 处理事件                            │
│     ├── 更新任务状态为 waiting_user                           │
│     ├── 存储 taskId → sessionId 映射                          │
│     └── 生成 action_required 通知                             │
│         │                                                    │
│         ▼                                                    │
│  6. 用户看到通知，输入响应                                     │
│     └── CLI/Frontend 接收输入                                 │
│         │                                                    │
│         ▼                                                    │
│  7. handleUserInputForBackgroundTask()                       │
│     ├── 更新任务状态为 in_progress                            │
│     └── 调用 provideUserInput()                               │
│         │                                                    │
│         ▼                                                    │
│  8. provideUserInput() 恢复执行                               │
│     ├── resolve Promise                                      │
│     └── 工具返回结果给 Agent                                  │
│         │                                                    │
│         ▼                                                    │
│  9. Agent 继续执行                                            │
│     └── 收到工具结果，继续任务                                  │
│         │                                                    │
│         ▼                                                    │
│  10. 任务完成                                                 │
│      └── agent_end 事件，发送完成通知                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 问题修复记录

### 问题4: 用户输入未正确路由到后台任务 (2024-03-18)

**问题**: 后台任务调用 `ask_user` 工具后，用户输入没有传递给后台会话，而是走到了通用的 Agent PI 事件处理中。

**原因分析**:
- `findActiveGoal()` 函数只根据 phase 优先级选择目标
- 没有考虑哪个目标有 `waiting_user` 任务
- 当后台任务等待用户输入时，如果另一个目标的 phase 优先级更高，用户输入就会被路由到错误的目标
- `ExecutionHandler.handle()` 在错误的目标中找不到 `waiting_user` 任务，返回 `{ action: "continue" }`

**问题场景示例**:
1. Goal A: phase = `"monitoring"`, 有任务状态为 `waiting_user`
2. Goal B: phase = `"collecting_info"`
3. `findActiveGoal()` 返回 Goal B（因为 `collecting_info` 优先级更高）
4. 用户输入被错误地路由到 Goal B，而不是 Goal A 的后台任务

**解决**: 修改 `findActiveGoal()` 函数，在检查 phase 优先级之前，优先检查是否有目标包含 `waiting_user` 状态的任务：

```typescript
// handlers/types.ts
export async function findActiveGoal(
  goals: Goal[],
  getState: (goalId: string) => OrchestrationState | undefined,
  taskStore: TaskStore  // 新增参数
): Promise<Goal | undefined> {
  // 最高优先级：有 waiting_user 任务的目标
  for (const goal of goals) {
    const tasks = await taskStore.getTasksByGoal(goal.id);
    if (tasks.some(t => t.status === "waiting_user")) {
      return goal;
    }
  }

  // 原有的 phase 优先级逻辑...
}
```

**修改文件**:
| 文件 | 修改内容 |
|------|----------|
| `handlers/types.ts` | 修改 `findActiveGoal()` 添加 `waiting_user` 任务优先检查 |
| `extension.ts` | 调用时传入 `taskStore` 参数 |

### 问题1: setBeforeToolCall 返回类型限制

**问题**: 最初尝试使用 `agent.setBeforeToolCall()` 钩子来拦截 ask_user 工具调用，但发现该钩子只能返回 `{ block: boolean, reason: string }` 或 `undefined`，不能返回工具执行结果。

**解决**: 改为在 ask_user 工具的 `execute` 函数中直接等待用户输入，通过 Promise 机制实现暂停/恢复。

### 问题2: 会话终止时 pendingInput 清理

**问题**: 如果在等待用户输入时会话被终止，pendingInput Promise 永远不会完成，可能导致资源泄漏。

**解决**: 在 `terminateSession()` 中检查并 reject 等待中的 pendingInput：
```typescript
if (runningSession.pendingInput) {
  runningSession.pendingInput.reject(new Error(`Session terminated: ${reason}`));
  runningSession.pendingInput = undefined;
}
```

### 问题3: 心跳超时问题

**问题**: 等待用户输入期间，心跳超时检测可能错误地终止会话。

**解决**: 在 `AgentPiBackgroundExecutor.handleSessionEvent()` 中处理 `waiting_input` 和 `input_received` 事件，更新心跳时间戳，防止超时。

## 测试验证

- TypeScript 编译通过
- 单元测试通过 (20 tests)

## 使用示例

```typescript
// 测试场景：调研任务需要用户澄清关注点

// 1. 用户创建任务："调研某车型的用户口碑"
// 2. Agent 开始执行，发现需要更多信息
// 3. Agent 调用：ask_user({
//      question: "您更关注哪个方面的口碑？",
//      options: ["动力性能", "油耗表现", "空间舒适", "可靠性"]
//    })
// 4. 系统暂停，通知用户
// 5. 用户选择 "油耗表现"
// 6. Agent 收到回复，针对性调研油耗口碑
// 7. 返回最终结果
```

## 后续优化建议

1. **超时机制**: 可考虑为等待用户输入设置超时时间，避免无限等待
2. **多轮交互**: 支持一次任务执行中多次调用 ask_user
3. **输入验证**: 在 options 提供时验证用户输入是否在选项范围内
4. **UI 集成**: 在 CLI/Frontend 中提供更好的交互体验
