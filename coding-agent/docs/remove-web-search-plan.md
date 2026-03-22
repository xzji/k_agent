# 删除内置 web_search 工具，统一使用 Pi 扩展 websearch

## Context

当前代码库中存在两个网络搜索工具：
- `web_search` - 内置工具 (`coding-agent/src/core/tools/web-search.ts`)
- `websearch` - Pi 扩展工具 (`~/.pi/agent/extensions/websearch.ts`)

目标：删除内置 `web_search`，所有地方统一使用 Pi 扩展的 `websearch`。

## Implementation Plan

### Step 1: 删除内置工具文件

**删除文件**: `coding-agent/src/core/tools/web-search.ts`

### Step 2: 修改工具导出文件

**文件**: `coding-agent/src/core/tools/index.ts`

移除所有 `web_search` 相关导出：

```typescript
// 删除这些行：
export {
  createWebSearchTool,
  type WebSearchResult,
  type WebSearchToolInput,
  type WebSearchToolOptions,
  webSearchTool,
} from "./web-search.js";

// 删除 import：
import { createWebSearchTool, webSearchTool } from "./web-search.js";

// 删除 allTools 中的 web_search：
export const allTools = {
  read: readTool,
  bash: bashTool,
  edit: editTool,
  write: writeTool,
  grep: grepTool,
  find: findTool,
  ls: lsTool,
  // web_search: webSearchTool,  // 删除这行
};

// 删除 createAllTools 中的 web_search：
export function createAllTools(cwd: string, options?: ToolsOptions): Record<ToolName, Tool> {
  return {
    read: createReadTool(cwd, options?.read),
    bash: createBashTool(cwd, options?.bash),
    edit: createEditTool(cwd),
    write: createWriteTool(cwd),
    grep: createGrepTool(cwd),
    find: createFindTool(cwd),
    ls: createLsTool(cwd),
    // web_search: createWebSearchTool(),  // 删除这行
  };
}
```

### Step 3: 修改默认工具列表

**文件**: `coding-agent/src/core/agent-session.ts` (第 2272 行)

```typescript
// 修改前：
: ["read", "bash", "edit", "write", "web_search"];

// 修改后：
: ["read", "bash", "edit", "write"];
```

**文件**: `coding-agent/src/core/sdk.ts` (第 241 行)

```typescript
// 修改前：
const defaultActiveToolNames: ToolName[] = ["read", "bash", "edit", "write", "web_search"];

// 修改后：
const defaultActiveToolNames: ToolName[] = ["read", "bash", "edit", "write"];
```

**文件**: `coding-agent/src/core/system-prompt.ts` (第 96 行)

```typescript
// 修改前：
const tools = selectedTools || ["read", "bash", "edit", "write", "web_search"];

// 修改后：
const tools = selectedTools || ["read", "bash", "edit", "write"];
```

### Step 4: 修改 Goal-Driven 相关文件

**文件**: `coding-agent/src/core/goal-driven/runtime/tool-provider.ts` (第 49 行)

```typescript
// 修改前：
{ name: "web_search", description: "网络搜索", category: "search" },

// 修改后：
{ name: "websearch", description: "网络搜索", category: "search" },
```

**文件**: `coding-agent/src/core/goal-driven/runtime/coding-agent-adapter.ts` (第 403 行)

```typescript
// 修改前：
if (requiredTools.includes('web_search')) {

// 修改后：
if (requiredTools.includes('websearch')) {
```

> **备注**: 第 438-440 行的方法名 `executeWithWebSearch` 可保持不变（方法名不影响运行时行为），也可选择性重命名为 `executeWithSearch`。

**文件**: `coding-agent/src/core/goal-driven/scheduler/unified-task-scheduler.ts` (第 802 行)

```typescript
// 修改前：
requiredTools: ['web_search', 'file_read'],

// 修改后：
requiredTools: ['websearch', 'read'],

// 注意：原代码中的 'file_read' 工具名不存在，一并修正为正确的 'read'
```

**文件**: `coding-agent/src/core/goal-driven/types/index.ts` (第 332 行)

```typescript
// 修改前：
type: 'web_search' | 'file_system' | 'api' | 'user_input';

// 修改后：
type: 'websearch' | 'file_system' | 'api' | 'user_input';
```

**文件**: `coding-agent/src/core/goal-driven/example.ts`

```typescript
// 第 92 行和第 108 行，修改前：
{ id: 'src-1', type: 'web_search', config: {}, priority: 'high' },

// 修改后：
{ id: 'src-1', type: 'websearch', config: {}, priority: 'high' },

// 第 210 行，修改前：
requiredTools: ['web_search'],

// 修改后：
requiredTools: ['websearch'],
```

**文件**: `coding-agent/extensions/goal-driven/index.ts` (第 599 行)

```typescript
// 修改前：
requiredTools: ["web_search"],

// 修改后：
requiredTools: ["websearch"],
```

### Step 5: 更新文档

**文件**: `coding-agent/src/core/goal-driven/README.md` (第 285 行)

**文件**: `coding-agent/docs/goal-driven-background-execution-design.md`

## 关键文件清单

| 文件 | 修改内容 | 备注 |
|------|----------|------|
| `coding-agent/src/core/tools/web-search.ts` | 删除整个文件 | |
| `coding-agent/src/core/tools/index.ts` | 移除导出和引用 | `ToolName` 类型会自动更新 |
| `coding-agent/src/core/agent-session.ts` | 移除默认工具 | 第 2272 行 |
| `coding-agent/src/core/sdk.ts` | 移除默认工具 | 第 241 行 |
| `coding-agent/src/core/system-prompt.ts` | 移除默认工具 | 第 96 行 |
| `coding-agent/src/core/goal-driven/runtime/tool-provider.ts` | 工具名替换 | 第 49 行 |
| `coding-agent/src/core/goal-driven/runtime/coding-agent-adapter.ts` | 工具名替换 | 第 403 行，方法名可选保留 |
| `coding-agent/src/core/goal-driven/scheduler/unified-task-scheduler.ts` | 工具名替换 + 修正错误工具名 | 第 802 行，`file_read` → `read` |
| `coding-agent/src/core/goal-driven/types/index.ts` | 类型定义修改 | 第 332 行 |
| `coding-agent/src/core/goal-driven/example.ts` | 工具名替换 | 第 92, 108, 210 行 |
| `coding-agent/extensions/goal-driven/index.ts` | 工具名替换 | 第 599 行 |

## Verification

1. **编译检查**
   ```bash
   cd coding-agent && npm run build
   ```
   确认无编译错误

2. **测试检查**
   ```bash
   cd coding-agent && npm test
   ```
   确认所有测试通过

3. **TypeScript 类型检查**
   - `ToolName` 类型应不再包含 `web_search`
   - 检查 `dist/core/tools/index.d.ts` 确认类型定义正确

4. **功能测试**
   - 启动 Pi，确认 `websearch` 扩展工具可用
   - 执行搜索任务，确认扩展工具正常工作

5. **后台 Session 测试**
   - 启动后台 session 执行搜索任务
   - 检查日志确认使用 `websearch` 工具（而非 `web_search`）
   - 确认搜索功能正常工作

6. **API 测试**
   - 测试 `createAgentSession()` API
   - 确认默认工具列表为 `["read", "bash", "edit", "write"]`
   - 确认扩展工具 `websearch` 自动激活
