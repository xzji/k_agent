# Goal-Driven Agent 落地实施方案评审

> 基于对 `Goal-Driven-Agent-Implementation-Plan.md` 的审阅和 `coding-agent` 源码的深入分析，以下是我的评审意见和分阶段执行方案。

---

## 一、原方案的高质量之处

实施方案在以下方面设计合理：

- **文件结构清晰**：`src/core/goal-driven/` 目录隔离所有新代码，非侵入式
- **类型体系完整**：`types.ts` 定义了完整的 GoalNode / DimensionNode / ActionPlan / KnowledgeEntry 等类型
- **双门价值裁决**：PreActionGate + PostActionGate 设计精准匹配原始设计文档
- **通知排队机制**：IdleDetector + NotificationQueue 实现了「用户空闲时才推送」的核心需求
- **分期策略合理**：P0→P5 的分期符合逐步交付、逐步验证的原则

---

## 二、需要调整的问题

### 2.1 BackgroundLLMChannel 与 pi-ai API 不匹配

> [!CAUTION]
> 原方案假设可以直接调用 `this.currentModel.provider.chat(...)` 来发起独立的 LLM 请求。但从 `model-registry.ts` 和 `@mariozechner/pi-ai` 的实际 API 来看，`Model` 对象没有 `.provider.chat()` 这样的直接调用方法。pi-ai 的流式 API 基于 `stream()` / `streamSimple()` 模式，不是简单的 request-response。

**调整方案**：`BackgroundLLMChannel` 应该使用 pi-ai 底层的 streaming API，通过 `streamSimple` 收集完整响应，而非假设存在同步 chat 接口。具体实现需要：
1. 从 `ModelRegistry` 获取模型配置
2. 使用 `AuthStorage` 获取 API key
3. 直接通过 `fetch` 构建 OpenAI-compatible API 请求（绝大多数 provider 都是 OpenAI 兼容的）
4. 或者复用 pi-ai 的 `stream()` 方法但人工收集全部 chunk

### 2.2 Extension API 集成方式需修正

> [!IMPORTANT]
> 原方案的 `extension.ts` 假设了一些不存在的 Extension API：
> - `pi.registerCommand()` → 实际 API 是 `pi.registerCommand(name, { handler, description })` ✅ 但 handler 签名不同
> - `pi.on("user_input")` → **不存在**，无此事件类型
> - `pi.on("model_change")` → 实际事件名是 `"model_select"`
> - `pi.interactiveMode` → **不存在**，Extension 无法直接访问 InteractiveMode

**调整方案**：
1. 使用 `pi.on("input", ...)` 替代 `user_input` 来检测用户活跃
2. 使用 `pi.on("model_select", ...)` 替代 `model_change`
3. 使用 `pi.on("agent_start")` / `pi.on("agent_end")` 跟踪 Agent 忙碌状态
4. 通知输出使用 `pi.sendMessage({ customType: "goal_notification", ... })` 注入消息流，而非直接操作 InteractiveMode
5. 注册 `pi.registerMessageRenderer("goal_notification", ...)` 来自定义通知渲染

### 2.3 工具执行方式需重新设计

> [!WARNING]
> 原方案中 Executor 假设可以直接调用 `tool.execute(step.input)`。但 `AgentTool.execute()` 的参数签名远比这复杂 — 需要 `toolCallId`、`AbortSignal`、`onUpdate` callback 等。并且 Extension 注册的 tool 也需要 `ExtensionContext`。

**调整方案**：后台循环中的工具执行有两种路径：
1. **LLM 推理/分析任务**：直接通过 `BackgroundLLMChannel` 完成，不经过工具系统
2. **文件/bash/搜索操作**：通过 `pi.exec(command, args)` 方法执行 bash 命令来间接实现工具功能（读写文件、执行搜索等），而非直接调用工具实例
3. **需要人参与的操作**：通过 NotificationQueue 将求助请求发送给用户

### 2.4 IdleDetector 集成方式

原方案要求 IdleDetector 监听「按键事件」，但 Extension API 中无法直接访问底层终端事件。

**调整方案**：
1. 使用 `pi.on("input", ...)` 事件标记用户活跃（每次用户提交消息时）
2. 使用 `pi.on("agent_start"/"agent_end", ...)` 标记 Agent 是否在工作
3. 空闲阈值调整为基于「最后一次 agent_end / input 事件」的时间差

---

## 三、分阶段执行方案

### Phase 0 (P0)：基础框架 — 可运行的最小骨架

**目标**：建立后台循环框架 + /goal 命令 + 目标创建 + 维度拆解

#### 新增文件

| 文件 | 说明 |
|------|------|
| [NEW] `src/core/goal-driven/types.ts` | 全局类型定义（从原方案提取，去除未用字段） |
| [NEW] `src/core/goal-driven/index.ts` | 模块导出 |
| [NEW] `src/core/goal-driven/utils.ts` | 通用工具函数（generateId, extractTextContent） |
| [NEW] `src/core/goal-driven/background-loop/background-agent-loop.ts` | 后台循环主体 |
| [NEW] `src/core/goal-driven/background-loop/llm-channel.ts` | 独立 LLM 通道（使用 fetch 直接调用 API） |
| [NEW] `src/core/goal-driven/background-loop/loop-scheduler.ts` | 循环调度器 |
| [NEW] `src/core/goal-driven/goal-manager/goal-manager.ts` | 目标管理 |
| [NEW] `src/core/goal-driven/goal-manager/goal-decomposer.ts` | 目标拆解 |
| [NEW] `src/core/goal-driven/goal-manager/source-discoverer.ts` | 信息源发现 |
| [NEW] `src/core/goal-driven/knowledge/knowledge-store.ts` | 知识池（基础版） |
| [NEW] `src/core/goal-driven/output-layer/notification-queue.ts` | 通知队列 |
| [NEW] `src/core/goal-driven/output-layer/idle-detector.ts` | 空闲检测器 |
| [NEW] `src/core/goal-driven/extension.ts` | Extension 入口 |

#### 关键实现细节

1. **`llm-channel.ts`**：使用直接 `fetch` 调用 OpenAI-compatible API，从 `ModelRegistry` + `AuthStorage` 获取 endpoint 和 key
2. **`extension.ts`**：注册 `/goal` 命令（add/list/status/tree/stop），使用 `pi.registerCommand()`
3. **通知输出**：使用 `pi.sendMessage()` + `pi.registerMessageRenderer()` 而非直接操作 TUI
4. **持久化**：使用 `~/.pi/agent/goal-driven/` 目录，JSON 文件存储

---

### Phase 1 (P1)：信息采集 + 相关性裁决

**目标**：让后台循环能真正采集信息并判断相关性

#### 新增文件

| 文件 | 说明 |
|------|------|
| [NEW] `src/core/goal-driven/info-engine/info-collector.ts` | 信息采集器 |
| [NEW] `src/core/goal-driven/info-engine/relevance-judge.ts` | 相关性裁决 |
| [NEW] `src/core/goal-driven/info-engine/source-adapters/web-search-adapter.ts` | 网络搜索适配器（通过 bash curl 实现） |

#### 关键实现细节

1. **WebSearchAdapter**：通过 `pi.exec("curl", [...])` 或类似方式调用搜索 API（如 SerpAPI / Brave Search API），无需依赖不存在的 `executeWebSearch`
2. **RelevanceJudge**：通过 BackgroundLLMChannel 让 LLM 批量判断信息相关性
3. 弱相关信息存入 KnowledgeStore

---

### Phase 2 (P2)：行动推理 + 执行

**目标**：推理、裁决、执行完整流水线

#### 新增文件

| 文件 | 说明 |
|------|------|
| [NEW] `src/core/goal-driven/action-pipeline/action-reasoner.ts` | 行动推理 |
| [NEW] `src/core/goal-driven/action-pipeline/pre-action-gate.ts` | 执行前裁决 |
| [NEW] `src/core/goal-driven/action-pipeline/capability-resolver.ts` | 能力适配 |
| [NEW] `src/core/goal-driven/action-pipeline/executor.ts` | 执行器 |

---

### Phase 3 (P3)：通知系统完善

**目标**：PostActionGate + 通知渲染

#### 新增文件

| 文件 | 说明 |
|------|------|
| [NEW] `src/core/goal-driven/output-layer/post-action-gate.ts` | 执行后裁决 |
| [NEW] `src/core/goal-driven/output-layer/notification-renderer.ts` | 通知渲染 |

---

### Phase 4-5 (P4-P5)：学习闭环 + 信息源增强

与原方案一致。

---

## 四、关于「后台运行不影响前台交互」的落地

这是用户明确提出的核心需求。方案如下：

| 机制 | 实现方式 |
|------|----------|
| **后台 LLM 独立通道** | `BackgroundLLMChannel` 使用独立 `fetch` 请求，与前台 `AgentSession` 完全解耦 |
| **通知排队** | `NotificationQueue` 缓存所有待输出通知，不立即渲染 |
| **空闲检测** | `IdleDetector` 基于 Extension 事件 (`input` / `agent_start` / `agent_end`) 判断用户活跃状态 |
| **空闲推送** | 用户空闲 ≥ 5 分钟且 Agent 不在工作时，通过 `pi.sendMessage()` 逐条推送 |
| **用户活跃时静默** | 用户正在与 Agent 交互时，通知静默排队；用户再次空闲后继续推送 |
| **urgent 加速** | high 优先级通知缩短空闲等待到 1 分钟 |

---

## 五、验证计划

### 单元测试

1. **目标管理测试**
   - `GoalManager`: create / addDimensions / getActiveGoals / persistGoal
   - `GoalDecomposer`: decompose (mock LLM 返回)
   - `LoopScheduler`: selectNextWorkItem 排序逻辑
   - 运行命令：`cd /Users/bytedance/Documents/claude_code/goal_driven_agent/coding-agent && npx vitest --run test/goal-driven/`

2. **通知系统测试**
   - `NotificationQueue`: enqueue / dequeue / priority / hasUrgent
   - `IdleDetector`: 空闲检测逻辑、threshold 计算
   - 运行命令：同上

3. **知识池测试**
   - `KnowledgeStore`: save / search / checkCrossActivation
   - 运行命令：同上

### 人工验证

由于后台循环涉及真实 LLM 调用和定时器，建议你在 P0 完成后进行以下手动测试：

1. 启动 `pi`，执行 `/goal add 帮我做一份 AI Agent 市场的行业调研报告`
2. 验证目标创建成功，输出维度列表
3. 执行 `/goal list` 查看目标
4. 执行 `/goal tree <id>` 查看维度树
5. 等待 5+ 分钟，检查是否收到后台通知
6. 在 Agent 正在输出时，检查后台通知是否被静默

---

## 六、建议先执行 P0

P0 是最小可验证单元，完成后可以立即体验完整的目标创建→维度拆解→后台循环启动流程。P1-P5 在 P0 验证后逐步推进。

**P0 预计新增文件 13 个，总代码量约 2000-2500 行。**
