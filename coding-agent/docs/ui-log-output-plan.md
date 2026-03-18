# 后台任务日志输出优化：避免覆盖 CLI 输入框

## Context

**问题表现**: 后台任务执行时的日志输出会直接覆盖 Agent PI CLI 的输入框，影响用户在前台与 Agent PI 的正常交互。

**用户需求**:
1. 所有日志输出应该在输入框上方滚动显示
2. 不应该影响输入框
3. 用户可以在前台继续与 Agent PI 对话

**问题根源**: 后台执行器使用 `console.log` 直接输出到终端，这会干扰 TUI（Terminal User Interface）渲染，导致日志覆盖输入框。

---

## 解决方案架构

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
│  │  pi.sendMessage({ customType: "background_log" })    │  │
│  │           │                                          │  │
│  │           ▼                                          │  │
│  │  聊天区域显示（输入框上方）                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 修改文件清单

| 文件 | 修改类型 | 修改内容 |
|------|----------|----------|
| `runtime/log-message-types.ts` | 新增 | 日志消息类型定义 |
| `runtime/ui-logger.ts` | 新增 | UI 日志器实现 |
| `runtime/agent-pi-executor.ts` | 修改 | 替换 console.log 为 UILogger |
| `runtime/background-session.ts` | 修改 | 替换 console.log 为 UILogger |
| `extension.ts` | 修改 | 注册消息渲染器和事件监听 |
| `config/types.ts` | 修改 | 添加日志配置项 |
| `config/store.ts` | 修改 | 添加日志配置默认值 |
| `index.ts` | 修改 | 导出新类型和类 |

---

## 详细实现

### 1. 新增：`runtime/log-message-types.ts`

```typescript
/**
 * 后台日志消息类型
 */
export type UILogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BackgroundLogPayload {
  /** 日志级别 */
  level: UILogLevel;
  /** 日志来源（如 "AgentPiExecutor", "BackgroundSession"） */
  source: string;
  /** 日志内容 */
  message: string;
  /** 关联的任务ID */
  taskId?: string;
  /** 关联的目标ID */
  goalId?: string;
  /** 时间戳 */
  timestamp: number;
  /** 结构化数据 */
  data?: Record<string, unknown>;
}

/**
 * 日志消息事件
 */
export interface BackgroundLogEvent {
  type: "goal_driven:background_log";
  payload: BackgroundLogPayload;
}
```

### 2. 新增：`runtime/ui-logger.ts`

```typescript
import type { UILogLevel, BackgroundLogPayload } from "./log-message-types.js";

/**
 * UI 日志器配置
 */
export interface UILoggerConfig {
  /** 最低日志级别 */
  minLevel: UILogLevel;
  /** 是否显示调试日志 */
  showDebug: boolean;
  /** 日志来源过滤 */
  sourceFilter?: string[];
}

/**
 * UI 日志器
 *
 * 将后台任务日志发送到前台聊天区域显示，避免 console.log 干扰 TUI
 */
export class UILogger {
  private config: UILoggerConfig;
  private eventBus: { emit: (type: string, payload: unknown) => void };

  constructor(
    eventBus: { emit: (type: string, payload: unknown) => void },
    config?: Partial<UILoggerConfig>
  ) {
    this.config = {
      minLevel: 'info',
      showDebug: false,
      ...config,
    };
    this.eventBus = eventBus;
  }

  /**
   * 记录日志
   */
  log(
    level: UILogLevel,
    source: string,
    message: string,
    options?: {
      taskId?: string;
      goalId?: string;
      data?: Record<string, unknown>;
    }
  ): void {
    // 检查日志级别
    if (!this.shouldLog(level)) return;

    // 检查来源过滤
    if (this.config.sourceFilter &&
        !this.config.sourceFilter.includes(source)) return;

    const payload: BackgroundLogPayload = {
      level,
      source,
      message,
      timestamp: Date.now(),
      taskId: options?.taskId,
      goalId: options?.goalId,
      data: options?.data,
    };

    // 发送到前台
    this.eventBus.emit("goal_driven:background_log", payload);
  }

  debug(source: string, message: string, options?: {...}): void {
    this.log('debug', source, message, options);
  }

  info(source: string, message: string, options?: {...}): void {
    this.log('info', source, message, options);
  }

  warn(source: string, message: string, options?: {...}): void {
    this.log('warn', source, message, options);
  }

  error(source: string, message: string, options?: {...}): void {
    this.log('error', source, message, options);
  }

  updateConfig(config: Partial<UILoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private shouldLog(level: UILogLevel): boolean {
    const levels: UILogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }
}
```

### 3. 修改：`runtime/agent-pi-executor.ts`

**关键修改点**:

1. 添加 UILogger 成员变量
2. 在构造函数中初始化 UILogger
3. 替换所有 `console.log` 调用

```typescript
import { UILogger } from "./ui-logger.js";

export class AgentPiBackgroundExecutor {
  private uiLogger: UILogger | null = null;

  constructor(
    private pi: ExtensionAPI,
    // ... 其他参数
  ) {
    // 初始化 UI Logger
    this.uiLogger = new UILogger(pi.events, {
      minLevel: 'info',
      showDebug: false,
    });

    // 替换 console.log
    // 原: console.log(`[AgentPiBackgroundExecutor] Session started`);
    // 改: this.uiLogger.info('AgentPiBackgroundExecutor', 'Session started');
  }
}
```

**需要替换的 console.log 调用**（约 30+ 处）:
- 行 218: 构造函数日志
- 行 253: 配置更新日志
- 行 264, 269, 280: 初始化日志
- 行 301: 队列处理日志
- 行 322: 任务派发日志
- 行 542, 570, 591: 任务执行日志
- 行 678, 722, 736, 744, 766, 773, 777: 会话事件日志
- 等等...

### 4. 修改：`extension.ts`

**添加消息渲染器和事件监听**:

```typescript
import { UILogger, type BackgroundLogPayload } from "./runtime/index.js";

// 注册后台日志消息渲染器
pi.registerMessageRenderer<BackgroundLogPayload>(
  "background_log",
  (message, _options, _theme) => {
    const log = message.details;
    // 使用默认 markdown 渲染器
    // 显示格式: `[时间] [级别] [来源] 消息`
    return undefined;
  }
);

// 在 initialize() 中监听后台日志事件
pi.events.on("goal_driven:background_log", (payload: unknown) => {
  const log = payload as BackgroundLogPayload;

  // 检查配置是否显示后台日志
  const config = configStore?.getConfig();
  if (config?.showBackgroundLogs === false) return;

  // 发送到聊天区域
  pi.sendMessage({
    customType: "background_log",
    content: formatLogMessage(log),
    display: true,
    details: log,
  });
});

function formatLogMessage(log: BackgroundLogPayload): string {
  const levelIcons: Record<string, string> = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  };
  const time = new Date(log.timestamp).toLocaleTimeString();
  const icon = levelIcons[log.level] ?? '📝';
  const taskInfo = log.taskId ? ` [${log.taskId.slice(0, 8)}]` : '';

  return `${icon} \`${time}\` **[${log.source}]**${taskInfo} ${log.message}`;
}
```

### 5. 修改：`config/types.ts`

**添加日志配置项**:

```typescript
export interface GoalDrivenConfig {
  // ... 现有配置

  /** UI 日志显示级别 */
  uiLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
  /** 是否在聊天区域显示后台日志 */
  showBackgroundLogs: boolean;
}
```

### 6. 修改：`config/store.ts`

**添加默认值**:

```typescript
export const DEFAULT_GOAL_DRIVEN_CONFIG: GoalDrivenConfig = {
  // ... 现有默认值
  uiLogLevel: 'info',
  showBackgroundLogs: true,
};
```

---

## 日志消息显示样式

```
┌──────────────────────────────────────────────────────────────┐
│ ℹ️ `10:30:45` **[AgentPiExecutor]** Task a1b2c3d4 started   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ❌ `10:31:15` **[AgentPiExecutor]** [a1b2c3d4] Task failed  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ ⚠️ `10:32:00` **[BackgroundSession]** Heartbeat timeout     │
└──────────────────────────────────────────────────────────────┘
```

---

## 验证方法

1. 启动 Agent PI CLI
2. 创建后台任务执行
3. 观察日志输出位置：
   - ✅ 日志显示在聊天区域（输入框上方）
   - ✅ 输入框不被覆盖
   - ✅ 用户可以继续输入
4. 测试配置选项：
   - `/goal config` 设置日志级别
   - 设置 `showBackgroundLogs: false` 隐藏日志
5. 检查文件日志仍然正常写入

---

## 关键设计决策

1. **使用 EventBus 而非直接 sendMessage**
   - 后台执行器通过 EventBus 发送日志事件
   - 前台 extension 监听事件并调用 sendMessage
   - 解耦后台执行与前台显示

2. **保持文件日志功能**
   - GoalDrivenLogger 继续写入文件日志
   - UILogger 专注于 UI 显示
   - 两者可以同时工作

3. **可配置的日志显示**
   - 用户可以选择隐藏后台日志
   - 可以调整显示级别
   - 可以按来源过滤
