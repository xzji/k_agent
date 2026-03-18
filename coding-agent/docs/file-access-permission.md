# Goal-Driven Agent 文件访问权限管理

## 概述

Goal-Driven Agent 实现了完整的文件访问权限管理系统，解决以下安全问题：

1. **绝对路径绕过漏洞** - 防止 Agent 直接使用绝对路径访问任意文件
2. **符号链接逃逸漏洞** - 防止通过符号链接访问敏感文件
3. **Bash 工具无防护** - 限制 Bash 命令执行能力

---

## 权限级别

系统提供三种权限级别：

| 级别 | 文件访问 | Bash 模式 | 适用场景 |
|------|----------|-----------|----------|
| `restricted` | 仅 goal 目录 | 禁用 | 高安全需求 |
| `standard` | goal + 知识库(只读) + /tmp + skills + extensions | 只读命令 | 默认推荐 |
| `full` | 无限制 | 完全访问 | 用户明确授权 |

## 共享目录

Agent 在 `standard` 和 `full` 模式下可以访问以下共享目录：

```typescript
export const SHARED_DIRECTORIES = {
  skills: '~/.agents/skills',       // Skills 定义和扩展
  extensions: '~/.agents/extensions', // Extension 配置
};
```

这些目录用于：
- **skills**: 存储技能定义文件（SKILL.md）和相关资源
- **extensions**: 存储扩展配置和访问记录

---

## 核心接口

### PermissionLevel & BashMode

```typescript
export type PermissionLevel = 'restricted' | 'standard' | 'full';
export type BashMode = 'disabled' | 'readonly' | 'full';
```

### FilePermissionConfig

```typescript
export interface FilePermissionConfig {
  level: PermissionLevel;
  bashMode: BashMode;
  goalId: string;
  taskId?: string;
  allowedPaths?: string[];
  deniedPaths?: string[];
  resolveSymlinks: boolean;
  maxFileSize?: number;
}
```

---

## 使用方法

### 1. 创建权限配置

```typescript
import { createPermissionConfig, PathGuard } from './security/index.js';

// 创建标准权限配置
const config = createPermissionConfig(goalId, agentDir, {
  level: 'standard',  // 默认值
  taskId: 'task-123', // 可选
});

// 创建受限权限配置
const restrictedConfig = createPermissionConfig(goalId, agentDir, {
  level: 'restricted',
  bashMode: 'disabled',
});
```

### 2. 使用 PathGuard 检查权限

```typescript
const guard = new PathGuard(config, cwd);

// 检查读取权限
const readResult = await guard.checkRead('/path/to/file');
if (!readResult.allowed) {
  console.log('Access denied:', readResult.reason);
}

// 检查写入权限
const writeResult = await guard.checkWrite('/path/to/file');

// 验证并获取路径（失败时抛出异常）
const validatedPath = await guard.validateRead('/path/to/file');

// 验证 Bash 命令
const cmdResult = guard.validateBashCommand('ls -la');
```

### 3. 创建带权限控制的工具

```typescript
import { createGuardedTools, getActiveToolNames } from './security/index.js';

// 获取原始工具
const originalTools = createAllTools(cwd, {...});

// 创建带权限控制的工具
const guardedTools = createGuardedTools({
  tools: originalTools,
  guard: pathGuard,
});

// 获取实际可用的工具名称
const activeToolNames = getActiveToolNames(
  ['read', 'write', 'edit', 'bash'],
  config
);
```

### 4. 在 Scheduler 中配置权限

```typescript
const scheduler = new UnifiedTaskScheduler(...);

// 设置权限配置
scheduler.setSecurityConfig('standard', 'readonly');
```

---

## 文件结构

```
src/core/goal-driven/security/
├── permission-config.ts   # 权限配置类型和工厂函数
├── path-validator.ts      # 路径验证核心逻辑
├── path-guard.ts          # PathGuard 类
├── guarded-tools.ts       # 带权限控制的工具
├── bash-sandbox.ts        # Bash 沙箱（可选）
├── index.ts               # 模块导出
└── __tests__/
    └── security.test.ts   # 测试文件
```

---

## 安全特性

### 1. 路径验证

- **展开 ~** - 自动展开用户主目录
- **规范化路径** - 处理 `.` 和 `..`
- **符号链接解析** - 使用 `realpath()` 解析真实路径
- **路径穿越检测** - 检测并阻止 `../` 攻击

### 2. Bash 命令过滤

**只读模式白名单命令：**
- 文件读取: `cat`, `head`, `tail`, `less`, `more`
- 目录查看: `ls`, `dir`, `find`
- 文本处理: `grep`, `wc`, `sort`, `uniq`
- Git 只读: `git status`, `git log`, `git diff`, `git show`

**危险命令黑名单：**
- 文件操作: `rm`, `mv`, `chmod`, `chown`
- 系统操作: `sudo`, `su`, `kill`, `dd`
- Shell 注入: `| sh`, `$(...)`, 反引号

### 3. OS 级沙箱（可选）

```typescript
import { executeInSandbox, isSandboxAvailable } from './security/index.js';

// 检查沙箱是否可用
if (await isSandboxAvailable()) {
  const result = await executeInSandbox(command, {
    allowedPaths: [...],
    networkAllowed: false,
    timeoutMs: 30000,
  });
}
```

**平台支持：**
- macOS: `sandbox-exec`
- Linux: `bubblewrap` (bwrap)

---

## 集成点

### BackgroundSessionManager

`BackgroundSessionConfig` 新增字段：

```typescript
interface BackgroundSessionConfig {
  // ... 现有字段 ...
  permissionLevel?: PermissionLevel;
  bashMode?: BashMode;
  customAllowedPaths?: string[];
}
```

### AgentPiBackgroundExecutor

`ExecuteTaskEvent` payload 新增字段：

```typescript
interface ExecuteTaskEvent {
  payload: {
    // ... 现有字段 ...
    permissionLevel?: PermissionLevel;
    bashMode?: BashMode;
    customAllowedPaths?: string[];
  };
}
```

---

## 测试

运行安全模块测试：

```bash
npx vitest run src/core/goal-driven/security/__tests__/security.test.ts
```

测试覆盖：
- 权限配置创建
- 路径验证（展开、规范化）
- 路径穿越检测
- 符号链接解析
- Bash 命令过滤
- 知识库只读访问

---

## 默认配置

```typescript
const DEFAULT_PERMISSION_CONFIGS = {
  restricted: {
    level: 'restricted',
    bashMode: 'disabled',
    resolveSymlinks: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  standard: {
    level: 'standard',
    bashMode: 'readonly',
    resolveSymlinks: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  full: {
    level: 'full',
    bashMode: 'full',
    resolveSymlinks: true,
    maxFileSize: 0, // unlimited
  },
};
```

---

## 最佳实践

1. **默认使用 `standard` 级别** - 平衡安全性和功能性
2. **仅在用户明确授权时使用 `full` 级别**
3. **对于敏感操作，考虑使用 `restricted` 级别并禁用 Bash**
4. **定期审计 `customAllowedPaths` 配置**
5. **在生产环境考虑启用 OS 级沙箱**
