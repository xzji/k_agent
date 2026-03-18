# 后台日志视图切换与通知分级机制

## Context

**当前状态**: 已实现后台任务日志输出到聊天区域，避免覆盖 CLI 输入框。

**新需求**:
1. **视图切换功能**: 用户可通过快捷键在两个独立视图之间切换
   - **前台视图**: 正常的 Agent PI 交互界面，只显示重要通知
   - **后台视图**: 专门的后台日志查看界面，显示所有后台 session 日志
2. **通知分级机制**: 重要通知在后台视图也能看到（如需要用户输入）
3. **日志流式输出**: 所有日志实时流式输出，不做聚合
4. **日志持久化**: 日志保存到文件用于后续回溯，CLI 重启后不需要加载历史

**关键理解**:
- 后台模式不是"把后台日志输出到前台聊天区域"
- 而是"切换到一个全新的后台视图，此视图下只显示后台日志，看不到前台信息"
- 类似于 IDE 中的"终端视图"和"编辑器视图"切换

---

## 解决方案架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI 视图切换                                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  cmd+b 切换                                              │   │
│  │                                                          │   │
│  │  ┌─────────────────┐      ┌─────────────────────────┐  │   │
│  │  │                 │      │                         │  │   │
│  │  │   前台视图       │ ◄──► │    后台视图              │  │   │
│  │  │                 │      │                         │  │   │
│  │  │  - 正常交互界面  │      │  - 专门显示后台日志     │  │   │
│  │  │  - 仅显示重要    │      │  - 流式实时输出         │  │   │
│  │  │    通知         │      │  - 看不到前台信息       │  │   │
│  │  │  - Agent PI     │      │  - 可接收用户输入       │  │   │
│  │  │    对话         │      │    (响应 action_required)│  │   │
│  │  │                 │      │                         │  │   │
│  │  └─────────────────┘      └─────────────────────────┘  │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    日志持久化（文件）                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ~/.pi/agent/goal-driven/logs/background-session.log    │   │
│  │  - 所有后台日志实时追加写入                               │   │
│  │  - 用于后续问题排查和回溯                                 │   │
│  │  - CLI 重启后不加载到内存                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    通知分级                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  前台视图显示（无论当前视图模式）                          │   │
│  │  - action_required: 需要用户输入（同时在后台视图显示）     │   │
│  │  - error: 错误日志                                        │   │
│  │  - 关键词匹配: "需要您的输入"、"failed"、"timeout"等       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  仅后台视图显示（流式输出）                                │   │
│  │  - debug: 调试日志                                        │   │
│  │  - info: 普通信息日志                                     │   │
│  │  - warn: 警告日志                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 修改文件清单

| 文件 | 修改类型 | 修改内容 |
|------|----------|----------|
| `runtime/view-mode-manager.ts` | 新增 | 视图模式管理器 |
| `runtime/log-buffer.ts` | 新增 | 内存日志缓冲区（存储最近日志用于视图切换） |
| `runtime/log-persister.ts` | 新增 | 日志文件持久化（用于后续问题排查） |
| `runtime/log-message-types.ts` | 修改 | 添加日志类别（category）字段 |
| `extension.ts` | 修改 | 注册快捷键 cmd+b、实现视图内容切换、日志处理逻辑 |
| `config/types.ts` | 修改 | 添加视图模式和日志缓冲区配置 |
| `config/store.ts` | 修改 | 添加默认配置 |
| `index.ts` | 修改 | 导出新类型 |

---

## 详细实现

### 1. 新增：`runtime/log-buffer.ts`

```typescript
import type { BackgroundLogPayload, UILogLevel } from "./log-message-types.js";

export interface LogBufferConfig {
  /** 最大保留日志条数 */
  maxSize: number;
}

/**
 * 内存日志缓冲区
 *
 * 存储最近的后台日志，用于视图切换时显示历史
 */
export class LogBuffer {
  private buffer: BackgroundLogPayload[] = [];
  private config: LogBufferConfig;

  constructor(config?: Partial<LogBufferConfig>) {
    this.config = {
      maxSize: 200,
      ...config,
    };
  }

  /**
   * 添加日志
   */
  add(log: BackgroundLogPayload): void {
    this.buffer.push(log);

    // 超出最大容量时移除最旧的
    if (this.buffer.length > this.config.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * 获取所有日志
   */
  getAll(): BackgroundLogPayload[] {
    return [...this.buffer];
  }

  /**
   * 清空缓冲区
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * 获取缓冲区大小
   */
  size(): number {
    return this.buffer.length;
  }
}
```

### 2. 新增：`runtime/log-persister.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BackgroundLogPayload } from "./log-message-types.js";

/**
 * 日志文件持久化器
 *
 * 将后台日志实时写入文件，用于后续问题排查
 * CLI 重启后不加载历史
 */
export class LogPersister {
  private logPath: string;
  private enabled: boolean = true;

  constructor(logPath?: string) {
    // 默认路径: ~/.pi/agent/goal-driven/logs/background-session.log
    this.logPath = logPath ?? path.join(
      os.homedir(), '.pi', 'agent', 'goal-driven', 'logs', 'background-session.log'
    );
    this.ensureDirectory();
  }

  /**
   * 写入日志到文件
   */
  write(log: BackgroundLogPayload): void {
    if (!this.enabled) return;

    try {
      const logLine = this.formatLogLine(log);
      fs.appendFileSync(this.logPath, logLine + '\n');
    } catch (error) {
      // 写入失败时禁用，避免影响性能
      console.warn('Log persistence failed, disabling:', error);
      this.enabled = false;
    }
  }

  /**
   * 格式化日志行
   */
  private formatLogLine(log: BackgroundLogPayload): string {
    const timestamp = new Date(log.timestamp).toISOString();
    const prefix = `[${timestamp}] [${log.level.toUpperCase()}] [${log.source}]`;
    const suffix = log.taskId ? ` [task:${log.taskId.slice(0, 8)}]` : '';
    return `${prefix}${suffix} ${log.message}`;
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(): void {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogPath(): string {
    return this.logPath;
  }
}
```

### 3. 新增：`runtime/view-mode-manager.ts`

```typescript
import type { EventBus } from "../../event-bus.js";

export type ViewMode = 'foreground' | 'background';

/**
 * 视图模式管理器
 *
 * 管理前台/后台视图模式的切换
 */
export class ViewModeManager {
  private currentMode: ViewMode;
  private eventBus: EventBus;
  private listeners: Set<(mode: ViewMode) => void> = new Set();

  constructor(
    eventBus: EventBus,
    defaultMode: ViewMode = 'foreground'
  ) {
    this.eventBus = eventBus;
    this.currentMode = defaultMode;
  }

  /**
   * 获取当前视图模式
   */
  getMode(): ViewMode {
    return this.currentMode;
  }

  /**
   * 切换视图模式
   */
  toggle(): ViewMode {
    this.currentMode = this.currentMode === 'foreground' ? 'background' : 'foreground';
    this.notifyListeners();
    this.eventBus.emit("goal_driven:view_mode_changed", { mode: this.currentMode });
    return this.currentMode;
  }

  /**
   * 检查是否在后台模式
   */
  isBackgroundMode(): boolean {
    return this.currentMode === 'background';
  }

  /**
   * 检查是否在前台模式
   */
  isForegroundMode(): boolean {
    return this.currentMode === 'foreground';
  }

  /**
   * 监听模式变化
   */
  onModeChange(listener: (mode: ViewMode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentMode);
    }
  }
}
```

### 4. 修改：`runtime/log-message-types.ts`

添加日志类别字段：

```typescript
export type UILogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志类别
 * - 'important': 重要日志，前台模式也显示
 * - 'normal': 普通日志，仅在后台模式显示
 */
export type LogCategory = 'important' | 'normal';

export interface BackgroundLogPayload {
  level: UILogLevel;
  source: string;
  message: string;
  taskId?: string;
  goalId?: string;
  timestamp: number;
  data?: Record<string, unknown>;
  /** 日志类别（新增） */
  category?: LogCategory;
}
```

### 5. 修改：`extension.ts`

#### 5.1 初始化组件

```typescript
import { ViewModeManager, LogBuffer, LogPersister } from "./runtime/index.js";

let viewModeManager: ViewModeManager;
let logBuffer: LogBuffer;
let logPersister: LogPersister;

// 在 initialize() 中
logBuffer = new LogBuffer({ maxSize: 200 });
logPersister = new LogPersister();
viewModeManager = new ViewModeManager(pi.events, 'foreground');
```

#### 5.2 注册快捷键

```typescript
// 注册快捷键切换视图模式 (cmd+b / ctrl+b)
pi.registerShortcut("cmd+b", {
  description: "切换前台/后台日志视图 (B for Background)",
  handler: async (ctx) => {
    const newMode = viewModeManager.toggle();

    if (newMode === 'background') {
      // 切换到后台视图：显示缓冲区历史日志
      const logs = logBuffer.getAll();
      if (logs.length > 0) {
        // 发送历史日志到聊天区域
        pi.sendMessage({
          customType: "background_log_history",
          content: formatLogHistory(logs),
          display: true,
        });
      }
      ctx.ui.notify("后台视图：显示所有后台日志", { type: "info" });
    } else {
      // 切换回前台视图
      ctx.ui.notify("前台视图：正常交互模式", { type: "info" });
    }
  },
});

function formatLogHistory(logs: BackgroundLogPayload[]): string {
  return logs.map(log => formatLogMessage(log)).join('\n');
}
```

#### 5.3 修改日志处理逻辑

```typescript
// 修改后台日志事件处理
pi.events.on("goal_driven:background_log", (payload: unknown) => {
  if (!isBackgroundLogPayload(payload)) return;

  // 1. 存入内存缓冲区（用于视图切换时显示历史）
  logBuffer.add(payload);

  // 2. 写入文件（用于后续问题排查）
  logPersister.write(payload);

  // 3. 根据当前视图模式决定是否显示
  const isImportant = isImportantLog(payload);
  const isBackgroundMode = viewModeManager.isBackgroundMode();

  if (isImportant) {
    // 重要日志：无论哪个视图都立即显示
    pi.sendMessage({
      customType: "background_log_important",
      content: formatLogMessage(payload),
      display: true,
      details: payload,
    });
  } else if (isBackgroundMode) {
    // 普通日志：仅在后台视图流式输出
    pi.sendMessage({
      customType: "background_log",
      content: formatLogMessage(payload),
      display: true,
      details: payload,
    });
  }
  // 前台视图下普通日志不显示
});
```

#### 5.4 重要日志判断函数

```typescript
function isImportantLog(log: BackgroundLogPayload): boolean {
  // 1. 显式标记为 important
  if (log.category === 'important') return true;

  // 2. error 级别日志
  if (log.level === 'error') return true;

  // 3. 特定来源的重要日志
  const importantSources = ['ActionRequired', 'UserInput'];
  if (importantSources.includes(log.source)) return true;

  // 4. 包含特定关键词
  const importantKeywords = ['需要您的输入', 'error', 'failed', 'timeout'];
  if (importantKeywords.some(kw => log.message.includes(kw))) return true;

  return false;
}
```

### 6. 修改：`config/types.ts`

```typescript
export interface GoalDrivenConfig {
  // ... 现有配置

  /** 视图模式相关配置 */
  viewMode: {
    /** 默认视图模式 */
    default: 'foreground' | 'background';
    /** 前台视图显示的日志级别 */
    foregroundLogLevel: 'important' | 'error' | 'warn' | 'all';
  };

  /** 日志缓冲区配置 */
  logBuffer: {
    /** 内存中最大保留日志条数 */
    maxSize: number;
  };
}
```

### 7. 修改：`config/store.ts`

```typescript
export const DEFAULT_GOAL_DRIVEN_CONFIG: GoalDrivenConfig = {
  // ... 现有默认值

  viewMode: {
    default: 'foreground',
    foregroundLogLevel: 'important',
  },

  logBuffer: {
    maxSize: 200,
  },
};
```

---

## 快捷键说明

| 快捷键 | 功能 |
|--------|------|
| `cmd+b` (macOS) / `ctrl+b` (Windows/Linux) | 切换前台/后台日志视图（B for Background） |

**切换行为**:
- **前台模式 → 后台模式**: 开始显示所有后台日志（流式输出）
- **后台模式 → 前台模式**: 停止显示普通后台日志，只显示重要通知

---

## 通知分级规则

### 前台立即显示（不依赖模式）

| 类别 | 条件 |
|------|------|
| `action_required` | 日志来自 ask_user 工具或需要用户确认 |
| `error` | 日志级别为 error |
| `urgent` | 日志类别显式标记为 important |
| 关键词匹配 | 包含"需要您的输入"、"failed"、"timeout"等关键词 |

### 仅后台模式显示

| 类别 | 条件 |
|------|------|
| `debug` | 调试日志 |
| `info` | 普通信息日志 |
| `warn` | 警告日志（可配置是否前台显示） |

---

## 用户交互流程

```
用户启动 CLI
    │
    ▼
默认前台视图
┌──────────────────────────────────┐
│ User: 帮我分析...                 │
│ Agent: 好的，我...               │
│ (仅显示重要通知，普通日志静默)     │
└──────────────────────────────────┘
    │
    ├── 后台任务产生普通日志 → 存入缓冲区 + 写入文件，不显示
    │
    ├── 后台任务产生重要通知 → 存入缓冲区 + 写入文件 + 立即显示
    │
    └── 用户按 cmd+b
         │
         ▼
    切换到后台视图
    ┌──────────────────────────────────┐
    │ [10:00] Task started             │
    │ [10:01] Processing...            │
    │ [10:02] Data fetched             │
    │ (显示历史日志 + 实时新日志)       │
    │ (看不到前台聊天内容)              │
    └──────────────────────────────────┘
         │
         └── 用户再次按 cmd+b
              │
              ▼
         切回前台视图
         ┌──────────────────────────────────┐
         │ User: 帮我分析...                 │
         │ Agent: 好的，我...               │
         │ (聊天内容保留)                    │
         └──────────────────────────────────┘
```

---

## 验证方法

1. **视图切换**:
   - 启动 CLI，确认默认为前台视图
   - 按 cmd+b，确认切换到后台视图
   - 后台视图显示历史日志（缓冲区内容）
   - 再按 cmd+b，确认切回前台视图
   - 前台聊天内容保留

2. **通知分级**:
   - 前台视图：创建后台任务产生普通日志，确认不显示
   - 切换到后台视图：确认能看到日志流式输出
   - 触发需要用户输入的场景：确认在前台和后台视图都能看到

3. **日志缓冲**:
   - 产生多条日志（如 50 条）
   - 切换到后台视图，确认能看到历史日志
   - 验证最多保留配置的条数（默认 200 条）

4. **日志持久化**:
   - 产生多条日志
   - 检查 `~/.pi/agent/goal-driven/logs/background-session.log` 文件
   - 确认日志已写入文件

5. **流式输出**:
   - 切换到后台视图
   - 触发后台任务产生日志
   - 确认日志实时显示（不聚合）

6. **配置项**:
   - `/goal config` 查看配置
   - 验证 viewMode 和 logBuffer 配置存在

---

## 与现有系统的集成

### 与 LogAggregator 的关系

- 移除 LogAggregator 的使用
- 所有日志直接流式输出，不做聚合

### 与 NotificationQueue 的关系

- `action_required` 类型的通知仍通过 `NotificationQueue` 入队
- Extension 监听 `NotificationQueue` 出队事件
- 出队时根据类型决定发送方式

---

## 用户确认决定

| 问题 | 用户决定 |
|------|----------|
| 快捷键选择 | `cmd+b` / `ctrl+b`（B for Background） |
| 日志输出方式 | 所有日志实时流式输出，不做聚合 |
| 日志持久化 | 保存到文件用于后续回溯 |
| 视图切换实现 | 内容切换方式 |
| 内存缓冲 | 需要，存储最近 200 条日志用于视图切换 |
| 前台聊天保留 | 切换回前台视图时聊天内容保留 |
