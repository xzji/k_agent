# Goal-Driven Agent 落地实施方案

> 基于 pi-mono/packages/coding-agent 项目架构，实现目标驱动型自主 Agent 的完整技术方案。

---

## 一、架构总览：与现有项目的集成策略

### 1.1 核心设计原则

| 原则 | 说明 |
|------|------|
| **单模型架构** | 与现有 coding-agent 保持一致，前台交互与后台自主循环共用同一个模型配置（通过 `ModelRegistry` 统一管理），不区分重量/轻量模型 |
| **独立 LLM 调用通道** | 后台自主循环拥有完全独立的 LLM 请求通道，不阻塞、不等待前台交互，两条通道并行运行 |
| **非侵入式集成** | 以 Extension 机制 + 独立模块的方式接入现有架构，不修改 `AgentSession` / `Agent` 核心循环 |
| **目标树动态演化** | 目标维度是树状结构，可在任何阶段被增加、细化、剪枝 |
| **克制通知** | 用户空闲 5 分钟后才输出通知；用户活跃交互期间，通知静默排队 |

### 1.2 整体模块架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        pi-coding-agent (现有)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────────┐ │
│  │  cli.ts      │  │  main.ts    │  │  InteractiveMode (TUI)      │ │
│  └──────┬──────┘  └──────┬──────┘  │  ┌────────────────────────┐  │ │
│         │                │         │  │ IdleDetector (新增)     │  │ │
│         ▼                ▼         │  │ NotificationRenderer   │  │ │
│  ┌─────────────────────────────┐   │  │ (新增)                 │  │ │
│  │     AgentSession (现有)      │   │  └────────────────────────┘  │ │
│  │  - prompt() / event bus     │   └──────────────────────────────┘ │
│  │  - SessionManager / tools   │                                    │
│  └─────────────────────────────┘                                    │
│                                                                     │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Goal-Driven Extension (新增) ─ ─ ─ ─ ─ ─ ┐ │
│  │                                                                │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │              BackgroundAgentLoop (核心新增)                │  │ │
│  │  │  独立 LLM 通道 │ 独立事件循环 │ 不阻塞前台               │  │ │
│  │  └───────┬──────────────┬──────────────┬────────────────────┘  │ │
│  │          │              │              │                       │ │
│  │          ▼              ▼              ▼                       │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐            │ │
│  │  │ GoalManager│ │ InfoEngine │ │ ActionPipeline │            │ │
│  │  │  (目标树)   │ │ (信息采集)  │ │ (推理→裁决→    │            │ │
│  │  │            │ │            │ │  适配→执行)    │            │ │
│  │  └─────┬──────┘ └─────┬──────┘ └───────┬────────┘            │ │
│  │        │              │                │                      │ │
│  │        ▼              ▼                ▼                      │ │
│  │  ┌──────────────────────────────────────────────────────┐     │ │
│  │  │           KnowledgeStore (知识池)                      │     │ │
│  │  │           NotificationQueue (通知队列)                 │     │ │
│  │  │           FeedbackTracker (反馈追踪)                   │     │ │
│  │  └──────────────────────────────────────────────────────┘     │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 新增文件结构

```
packages/coding-agent/src/
├── core/
│   └── goal-driven/                    ← 所有新增代码在此目录
│       ├── index.ts                    ← 模块导出
│       ├── types.ts                    ← 全局类型定义
│       │
│       ├── background-loop/            ← 后台自主循环
│       │   ├── background-agent-loop.ts
│       │   ├── llm-channel.ts          ← 独立 LLM 调用通道
│       │   └── loop-scheduler.ts       ← 循环调度器
│       │
│       ├── goal-manager/               ← 目标管理（模块 A）
│       │   ├── goal-manager.ts
│       │   ├── goal-tree.ts            ← 目标树数据结构
│       │   ├── goal-decomposer.ts      ← 目标拆解（含维度树）
│       │   └── source-discoverer.ts    ← 信息源发现与确认
│       │
│       ├── info-engine/                ← 信息采集（模块 ①②）
│       │   ├── info-collector.ts       ← 信息采集器
│       │   ├── relevance-judge.ts      ← 相关性裁决
│       │   ├── source-registry.ts      ← 信息源注册表
│       │   └── source-adapters/        ← 各信息源适配器
│       │       ├── web-search-adapter.ts
│       │       ├── rss-adapter.ts
│       │       ├── github-adapter.ts
│       │       └── custom-url-adapter.ts
│       │
│       ├── action-pipeline/            ← 行动流水线（模块 ③④⑤⑥）
│       │   ├── action-reasoner.ts      ← 行动推理
│       │   ├── pre-action-gate.ts      ← 执行前价值裁决
│       │   ├── capability-resolver.ts  ← 能力适配
│       │   └── executor.ts             ← 行动执行
│       │
│       ├── output-layer/               ← 输出层（模块 ⑦⑧）
│       │   ├── post-action-gate.ts     ← 执行后价值裁决
│       │   ├── notification-queue.ts   ← 通知队列
│       │   └── notification-renderer.ts← 通知渲染（TUI 组件）
│       │
│       ├── feedback/                   ← 反馈学习（模块 ⑨）
│       │   └── feedback-tracker.ts
│       │
│       ├── knowledge/                  ← 知识池（支撑系统 B）
│       │   ├── knowledge-store.ts
│       │   └── cross-activator.ts      ← 交叉关联激活
│       │
│       └── extension.ts               ← Extension 入口，注册到 pi 扩展系统
│
├── modes/interactive/
│   └── components/
│       ├── idle-detector.ts            ← 新增：用户空闲检测
│       └── goal-status-component.ts    ← 新增：目标状态 TUI 组件
```

---

## 二、全局类型定义（types.ts）

这是所有模块共享的核心类型。后续各模块实现基于此类型体系。

```typescript
// ============================================================
// 目标相关
// ============================================================

/** 目标节点 — 目标树的基本单元 */
export interface GoalNode {
  id: string;
  parentId: string | null;          // null 表示根目标
  title: string;                     // "调研 AI Agent 市场"
  description: string;               // 详细描述
  status: "active" | "paused" | "completed" | "abandoned";
  authorizationDepth: "full_auto" | "assisted" | "monitor" | "mixed";
  priority: number;                  // 1-10
  constraints: GoalConstraint[];
  createdAt: number;
  updatedAt: number;
}

/** 目标约束 */
export interface GoalConstraint {
  type: "deadline" | "budget" | "quality" | "scope" | "custom";
  description: string;
  value?: string;                    // "2026-03-31" / "$500"
}

/** 维度节点 — 维度树的基本单元 */
export interface DimensionNode {
  id: string;
  goalId: string;                    // 归属的目标 ID
  parentDimensionId: string | null;  // null 表示顶层维度
  title: string;                     // "市场规模与增长"
  description: string;
  status: "pending" | "exploring" | "explored" | "needs_deeper";
  explorationDepth: number;          // 当前探索深度 0=未探索
  maxDepth: number;                  // 预估需要的最大深度
  timeliness: "urgent" | "normal" | "can_wait";
  valueScore: number;                // 1-10，该维度对目标的价值
  children: DimensionNode[];
  dataSources: DataSourceBinding[];  // 绑定的信息源
  createdAt: number;
  updatedAt: number;
  discoveredDuring?: string;         // 在哪个阶段被发现的（如 "action_reasoning"）
}

/** 信息源绑定 */
export interface DataSourceBinding {
  sourceId: string;
  query: string;                     // 针对该维度的具体查询
  lastFetchedAt: number | null;
  fetchInterval: number;             // ms, 采集间隔
  accessible: boolean;               // 是否确认可访问
  accessCheckResult?: string;        // 可访问性检查结果描述
}

// ============================================================
// 信息源相关
// ============================================================

/** 信息源定义 */
export interface DataSource {
  id: string;
  type: "web_search" | "rss" | "github" | "api" | "url_monitor" | "custom";
  name: string;                      // "Google Scholar" / "Hacker News RSS"
  config: Record<string, unknown>;   // 各适配器的配置参数
  reachable: boolean;                // 最近一次可达性检查结果
  lastCheckedAt: number | null;
}

/** 采集到的信息条目 */
export interface InfoItem {
  id: string;
  sourceId: string;
  dimensionId: string | null;        // 关联的维度
  goalId: string;
  content: string;
  url?: string;
  fetchedAt: number;
  relevanceScore: number | null;     // 由 RelevanceJudge 填充
  relevanceLevel: "strong" | "weak" | "irrelevant" | null;
  metadata: Record<string, unknown>;
}

// ============================================================
// 行动相关
// ============================================================

/** 行动方案 — ActionReasoner 的输出 */
export interface ActionPlan {
  id: string;
  goalId: string;
  dimensionId?: string;
  triggerInfoIds: string[];           // 触发该行动的信息 ID
  what: string;                       // 要做什么
  why: string;                        // 为什么
  expectedOutcome: string;
  goalImpact: string;
  costEstimate: "low" | "medium" | "high";
  urgency: "urgent" | "normal" | "can_wait";
  successProbability: number;         // 1-10
  requiresUserInvolvement: boolean;
  reversible: boolean;
  reasoningTrace: string;             // 完整思考过程
  alternativeActions: ActionPlan[];
  knowledgeToSave: string;
  status: "proposed" | "approved" | "executing" | "completed" | "failed" | "shelved";
  createdAt: number;
}

/** 能力适配结果 */
export interface CapabilityResolution {
  level: 1 | 2 | 3 | 4;              // 直接匹配/组合/创造/求助
  toolChain: ToolStep[];
  fallbackPlan?: string;
  needsUserHelp: boolean;
  userHelpRequest?: UserHelpRequest;
}

export interface ToolStep {
  toolName: string;
  input: Record<string, unknown>;
  description: string;
  dependsOn?: string[];               // 依赖的前序步骤 ID
}

export interface UserHelpRequest {
  whatAgentWantsToDo: string;
  why: string;
  blockedBy: string;
  whatUserNeedsToDo: string;
  agentPreparedParts: string;
}

// ============================================================
// 通知相关
// ============================================================

/** 通知条目 */
export interface Notification {
  id: string;
  type: "delivery" | "report" | "suggestion" | "help_request" | "confirmation" | "progress";
  goalId: string;
  title: string;
  content: string;                    // Markdown 格式
  priority: "high" | "normal" | "low";
  actionPlanId?: string;
  createdAt: number;
  deliveredAt: number | null;
  userReaction?: "acknowledged" | "acted" | "dismissed" | "ignored";
}

// ============================================================
// 知识池相关
// ============================================================

/** 知识条目 */
export interface KnowledgeEntry {
  id: string;
  content: string;
  source: "relevance_filter" | "pre_action_shelved" | "post_action_silent" | "execution_byproduct" | "user_feedback" | "dimension_discovery";
  relatedGoalIds: string[];
  relatedDimensionIds: string[];
  status: "raw" | "analyzed" | "pending_supplement" | "stale";
  tags: string[];
  supplementNeeded?: string;
  createdAt: number;
  lastActivatedAt: number | null;
  activationCount: number;
}

// ============================================================
// 后台循环相关
// ============================================================

/** 循环状态 */
export interface LoopState {
  status: "idle" | "collecting" | "reasoning" | "executing" | "waiting";
  currentGoalId: string | null;
  currentDimensionId: string | null;
  currentActionPlanId: string | null;
  lastCycleAt: number | null;
  cycleCount: number;
  errors: LoopError[];
}

export interface LoopError {
  module: string;
  message: string;
  timestamp: number;
  recoverable: boolean;
}
```

---

## 三、模块实现方案

### 模块 0：后台自主循环（BackgroundAgentLoop）

**这是整个系统的"心脏"**——一个完全独立于前台交互的后台事件循环。

#### 3.0.1 独立 LLM 调用通道（llm-channel.ts）

```typescript
/**
 * 独立 LLM 调用通道
 *
 * 关键设计：
 * - 复用现有 ModelRegistry 获取模型配置和认证信息
 * - 但创建独立的 HTTP 连接和请求队列
 * - 与前台 AgentSession 的 LLM 调用完全并行，互不阻塞
 */
import { ModelRegistry, Model, Message, AssistantMessage } from "@mariozechner/pi-ai";

export class BackgroundLLMChannel {
  private modelRegistry: ModelRegistry;
  private currentModel: Model | null = null;
  private abortController: AbortController | null = null;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  /**
   * 同步获取当前模型配置（与前台共享同一模型选择）
   */
  syncModel(model: Model): void {
    this.currentModel = model;
  }

  /**
   * 独立的 LLM 请求方法
   * - 构建独立的请求上下文
   * - 不经过 AgentSession 的事件总线
   * - 支持 abort 以便循环取消
   */
  async chat(params: {
    systemPrompt: string;
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<AssistantMessage> {
    if (!this.currentModel) {
      throw new Error("BackgroundLLMChannel: no model configured");
    }

    this.abortController = new AbortController();

    // 直接调用 pi-ai 的 provider API，绕过 AgentSession
    const response = await this.currentModel.provider.chat({
      model: this.currentModel,
      system: params.systemPrompt,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      maxTokens: params.maxTokens ?? 4096,
      signal: this.abortController.signal,
    });

    return response;
  }

  /**
   * 带结构化 JSON 输出的请求
   * 用于目标拆解、相关性判断、价值裁决等需要结构化输出的场景
   */
  async chatJSON<T>(params: {
    systemPrompt: string;
    messages: Message[];
    schema: string;       // JSON Schema 描述，嵌入 prompt
  }): Promise<T> {
    const response = await this.chat({
      ...params,
      systemPrompt: params.systemPrompt +
        `\n\nYou MUST respond with valid JSON matching this schema:\n${params.schema}\nDo not include any text outside the JSON.`,
    });

    // 从 response 中提取 JSON
    const text = extractTextContent(response);
    return JSON.parse(text) as T;
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}
```

#### 3.0.2 后台循环主体（background-agent-loop.ts）

```typescript
/**
 * 后台自主循环
 *
 * 生命周期：
 * 1. 用户通过 /goal 命令创建目标时启动
 * 2. 持续运行，按调度策略循环执行
 * 3. 所有目标 completed/abandoned 时进入休眠
 * 4. 用户 /goal stop 时停止
 *
 * 关键约束：
 * - 完全不阻塞前台 AgentSession
 * - 通过 NotificationQueue 异步传递输出
 * - 出错时自动恢复，不崩溃前台
 */
export class BackgroundAgentLoop {
  private llmChannel: BackgroundLLMChannel;
  private goalManager: GoalManager;
  private infoEngine: InfoEngine;
  private actionPipeline: ActionPipeline;
  private knowledgeStore: KnowledgeStore;
  private notificationQueue: NotificationQueue;
  private feedbackTracker: FeedbackTracker;
  private loopState: LoopState;
  private running: boolean = false;
  private loopTimer: NodeJS.Timeout | null = null;

  constructor(deps: {
    modelRegistry: ModelRegistry;
    currentModel: Model;
    agentSession: AgentSession;    // 只读引用，用于同步模型和获取工具
    dataDir: string;               // 持久化目录 ~/.pi/agent/goal-driven/
  }) {
    this.llmChannel = new BackgroundLLMChannel(deps.modelRegistry);
    this.llmChannel.syncModel(deps.currentModel);

    this.goalManager = new GoalManager(deps.dataDir, this.llmChannel);
    this.knowledgeStore = new KnowledgeStore(deps.dataDir);
    this.notificationQueue = new NotificationQueue();
    this.feedbackTracker = new FeedbackTracker(deps.dataDir);

    this.infoEngine = new InfoEngine(
      this.llmChannel,
      this.goalManager,
      this.knowledgeStore,
    );

    this.actionPipeline = new ActionPipeline(
      this.llmChannel,
      this.goalManager,
      this.knowledgeStore,
      this.notificationQueue,
      deps.agentSession,       // 用于获取 coding tools 执行能力
    );

    this.loopState = {
      status: "idle",
      currentGoalId: null,
      currentDimensionId: null,
      currentActionPlanId: null,
      lastCycleAt: null,
      cycleCount: 0,
      errors: [],
    };
  }

  /**
   * 启动后台循环
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.scheduleNextCycle(0); // 立即开始第一轮
  }

  /**
   * 停止后台循环
   */
  async stop(): Promise<void> {
    this.running = false;
    this.llmChannel.abort();
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /**
   * 模型变更时同步
   */
  onModelChange(model: Model): void {
    this.llmChannel.syncModel(model);
  }

  /**
   * 调度下一轮循环
   * - 基础间隔：30秒
   * - 有 urgent 维度时：缩短到 10秒
   * - 所有维度都已探索 & 无待执行行动：延长到 5分钟
   * - 出错时：指数退避，最长 10分钟
   */
  private scheduleNextCycle(delayMs: number): void {
    this.loopTimer = setTimeout(() => this.runCycle(), delayMs);
  }

  /**
   * 单轮循环 — 完整流水线
   */
  private async runCycle(): Promise<void> {
    if (!this.running) return;

    try {
      this.loopState.status = "collecting";
      this.loopState.cycleCount++;

      // ── Step 1: 获取当前活跃目标 ──
      const activeGoals = this.goalManager.getActiveGoals();
      if (activeGoals.length === 0) {
        this.loopState.status = "idle";
        this.scheduleNextCycle(60_000); // 无目标，1分钟后再检查
        return;
      }

      // ── Step 2: 选择本轮处理的目标和维度 ──
      // 优先级策略：urgent > high-value-low-depth > round-robin
      const { goal, dimensions } = this.goalManager.selectNextWorkItem(activeGoals);
      this.loopState.currentGoalId = goal.id;

      // ── Step 3: 信息采集（模块 ①） ──
      const collectedItems = await this.infoEngine.collect(goal, dimensions);

      // ── Step 4: 相关性裁决（模块 ②） ──
      const {
        stronglyRelevant,
        weaklyRelevant,
        newDimensions,
      } = await this.infoEngine.judgeRelevance(collectedItems, goal);

      // 弱相关 → 知识池
      for (const item of weaklyRelevant) {
        await this.knowledgeStore.save({
          content: item.content,
          source: "relevance_filter",
          relatedGoalIds: [goal.id],
          relatedDimensionIds: item.dimensionId ? [item.dimensionId] : [],
          status: "raw",
          tags: [],
        });
      }

      // 新发现的维度 → 加入目标维度树
      if (newDimensions.length > 0) {
        await this.goalManager.addDimensions(goal.id, newDimensions);
      }

      // ── Step 5: 交叉关联激活检查 ──
      const activated = await this.knowledgeStore.checkCrossActivation(goal);
      stronglyRelevant.push(...activated);

      // ── Step 6: 行动推理 → 裁决 → 适配 → 执行（模块 ③④⑤⑥） ──
      if (stronglyRelevant.length > 0) {
        this.loopState.status = "reasoning";

        const results = await this.actionPipeline.process(
          stronglyRelevant,
          goal,
          this.knowledgeStore,
        );

        // ── Step 7: 执行后裁决 & 通知（模块 ⑦⑧） ──
        for (const result of results) {
          const shouldNotify = await this.actionPipeline.postActionGate(result, goal);

          if (shouldNotify) {
            this.notificationQueue.enqueue(shouldNotify);
          } else {
            // 沉淀到知识池
            await this.knowledgeStore.save({
              content: JSON.stringify(result),
              source: "post_action_silent",
              relatedGoalIds: [goal.id],
              relatedDimensionIds: [],
              status: "analyzed",
              tags: [],
            });
          }
        }
      }

      // ── Step 8: 更新维度状态 ──
      await this.goalManager.updateDimensionStatuses(goal.id);

      // ── Step 9: 计算下一轮延迟 ──
      this.loopState.status = "waiting";
      this.loopState.lastCycleAt = Date.now();
      const nextDelay = this.calculateNextDelay(goal);
      this.scheduleNextCycle(nextDelay);

    } catch (error) {
      this.loopState.errors.push({
        module: "background-loop",
        message: String(error),
        timestamp: Date.now(),
        recoverable: true,
      });
      // 出错后指数退避
      const backoff = Math.min(
        10 * 60_000,
        30_000 * Math.pow(2, this.loopState.errors.length),
      );
      this.scheduleNextCycle(backoff);
    }
  }

  private calculateNextDelay(goal: GoalNode): number {
    const dimensions = this.goalManager.getDimensions(goal.id);
    const hasUrgent = dimensions.some(d => d.timeliness === "urgent" && d.status !== "explored");
    const allExplored = dimensions.every(d => d.status === "explored");

    if (hasUrgent) return 10_000;
    if (allExplored) return 5 * 60_000;
    return 30_000;
  }
}
```

#### 3.0.3 循环调度器（loop-scheduler.ts）

```typescript
/**
 * 调度策略：决定每轮循环处理哪个目标的哪些维度
 *
 * 排序因子：
 * 1. timeliness = urgent 的维度优先
 * 2. valueScore 高 && explorationDepth 低的维度优先（高价值低探索 = 投入产出比最高）
 * 3. 同等条件下 round-robin 保证公平性
 */
export class LoopScheduler {

  /**
   * 从所有活跃目标中选择下一个工作项
   * 返回一个目标 + 该目标下最多 3 个待处理维度
   */
  selectNextWorkItem(
    goals: GoalNode[],
    dimensionsByGoal: Map<string, DimensionNode[]>,
    lastProcessedGoalId: string | null,
  ): { goal: GoalNode; dimensions: DimensionNode[] } {

    // 1. 收集所有待处理维度并打分
    const scoredItems: Array<{
      goal: GoalNode;
      dimension: DimensionNode;
      score: number;
    }> = [];

    for (const goal of goals) {
      const dims = dimensionsByGoal.get(goal.id) ?? [];
      for (const dim of dims) {
        if (dim.status === "explored") continue;

        let score = 0;
        // urgent 维度额外 +100
        if (dim.timeliness === "urgent") score += 100;
        // 价值分 * (1 - 已探索比例)
        score += dim.valueScore * (1 - dim.explorationDepth / Math.max(dim.maxDepth, 1));
        // 目标优先级加权
        score += goal.priority;
        // round-robin: 如果上一轮处理了这个目标，稍微降权
        if (goal.id === lastProcessedGoalId) score -= 5;

        scoredItems.push({ goal, dimension: dim, score });
      }
    }

    // 2. 按分数排序
    scoredItems.sort((a, b) => b.score - a.score);

    if (scoredItems.length === 0) {
      // 所有维度都已探索，选第一个目标做知识池扫描
      return { goal: goals[0], dimensions: [] };
    }

    // 3. 取分数最高的目标，该目标下最多 3 个维度
    const topGoal = scoredItems[0].goal;
    const topDimensions = scoredItems
      .filter(item => item.goal.id === topGoal.id)
      .slice(0, 3)
      .map(item => item.dimension);

    return { goal: topGoal, dimensions: topDimensions };
  }
}
```

---

### 模块 A：GoalManager（目标与维度管理）

#### 3.A.1 目标树管理（goal-tree.ts + goal-manager.ts）

```typescript
/**
 * GoalManager — 管理目标树和维度树
 *
 * 持久化策略：
 * - 存储在 ~/.pi/agent/goal-driven/goals/ 目录
 * - 每个目标一个 JSON 文件：{goalId}.json
 * - 维度树内嵌在目标 JSON 中
 * - 每次变更自动持久化
 */
export class GoalManager {
  private goals: Map<string, GoalNode> = new Map();
  private dimensions: Map<string, DimensionNode[]> = new Map(); // goalId → dimensions
  private dataDir: string;
  private llm: BackgroundLLMChannel;

  constructor(dataDir: string, llm: BackgroundLLMChannel) {
    this.dataDir = path.join(dataDir, "goals");
    this.llm = llm;
    this.loadFromDisk();
  }

  /**
   * 创建新目标
   * 创建后自动触发：
   * 1. 目标拆解（维度树生成）
   * 2. 信息源发现
   */
  async createGoal(params: {
    title: string;
    description: string;
    authorizationDepth: GoalNode["authorizationDepth"];
    constraints?: GoalConstraint[];
  }): Promise<GoalNode> {
    const goal: GoalNode = {
      id: generateId(),
      parentId: null,
      title: params.title,
      description: params.description,
      status: "active",
      authorizationDepth: params.authorizationDepth,
      priority: 5,
      constraints: params.constraints ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.goals.set(goal.id, goal);

    // 自动拆解维度
    const decomposer = new GoalDecomposer(this.llm);
    const initialDimensions = await decomposer.decompose(goal);
    this.dimensions.set(goal.id, initialDimensions);

    // 自动发现信息源
    const sourceDiscoverer = new SourceDiscoverer(this.llm);
    await sourceDiscoverer.discoverAndBind(goal, initialDimensions);

    await this.persistGoal(goal.id);
    return goal;
  }

  /**
   * 动态添加维度
   * 在推理/执行过程中发现新维度时调用
   */
  async addDimensions(goalId: string, newDimensions: Partial<DimensionNode>[]): Promise<void> {
    const existing = this.dimensions.get(goalId) ?? [];

    for (const dim of newDimensions) {
      const node: DimensionNode = {
        id: generateId(),
        goalId,
        parentDimensionId: dim.parentDimensionId ?? null,
        title: dim.title!,
        description: dim.description ?? "",
        status: "pending",
        explorationDepth: 0,
        maxDepth: dim.maxDepth ?? 2,
        timeliness: dim.timeliness ?? "normal",
        valueScore: dim.valueScore ?? 5,
        children: [],
        dataSources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        discoveredDuring: dim.discoveredDuring,
      };
      existing.push(node);

      // 为新维度发现信息源
      const sourceDiscoverer = new SourceDiscoverer(this.llm);
      await sourceDiscoverer.discoverAndBindSingle(
        this.goals.get(goalId)!, node
      );
    }

    this.dimensions.set(goalId, existing);
    await this.persistGoal(goalId);
  }

  /**
   * 选择下一个工作项（委托给 LoopScheduler）
   */
  selectNextWorkItem(activeGoals: GoalNode[]) {
    const scheduler = new LoopScheduler();
    return scheduler.selectNextWorkItem(
      activeGoals,
      this.dimensions,
      /* lastProcessedGoalId from loop state */
      null,
    );
  }
}
```

#### 3.A.2 目标拆解器（goal-decomposer.ts）

```typescript
/**
 * GoalDecomposer — 将目标拆解为维度树
 *
 * 关键特性：
 * - 维度树不是一次性生成的，初始拆解产生顶层维度
 * - 每个维度可以在后续探索中产生子维度
 * - 在 ActionReasoner / Executor 运行中发现的新维度也会被加入
 *
 * LLM Prompt 策略：
 * - 要求 LLM 同时输出维度列表 + 每个维度的时效性和价值评估
 */
export class GoalDecomposer {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  /**
   * 初始拆解：生成顶层维度树
   */
  async decompose(goal: GoalNode): Promise<DimensionNode[]> {
    const result = await this.llm.chatJSON<DecomposeResult>({
      systemPrompt: DECOMPOSE_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `请将以下目标拆解为探索维度：

目标：${goal.title}
描述：${goal.description}
授权模式：${goal.authorizationDepth}
约束：${JSON.stringify(goal.constraints)}

要求：
1. 拆解为 3-7 个顶层维度
2. 每个维度评估其：
   - 时效性（urgent/normal/can_wait）：是否需要尽快获取
   - 价值分（1-10）：对目标推进的重要程度
   - 预估探索深度（1-5）：需要多深入的研究
3. 维度之间应有合理的逻辑关系，但不要求互斥
4. 可以为高价值维度预设子维度（但子维度也可以后续动态发现）`,
      }],
      schema: DECOMPOSE_SCHEMA,
    });

    return result.dimensions.map(d => ({
      id: generateId(),
      goalId: goal.id,
      parentDimensionId: null,
      title: d.title,
      description: d.description,
      status: "pending" as const,
      explorationDepth: 0,
      maxDepth: d.estimatedDepth,
      timeliness: d.timeliness,
      valueScore: d.valueScore,
      children: (d.subDimensions ?? []).map(sub => ({
        id: generateId(),
        goalId: goal.id,
        parentDimensionId: null, // 会在后续设置
        title: sub.title,
        description: sub.description,
        status: "pending" as const,
        explorationDepth: 0,
        maxDepth: sub.estimatedDepth ?? 2,
        timeliness: sub.timeliness ?? "normal",
        valueScore: sub.valueScore ?? 5,
        children: [],
        dataSources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })),
      dataSources: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }

  /**
   * 细化拆解：对已有维度生成子维度
   * 在探索过程中发现需要更深入时调用
   */
  async refine(goal: GoalNode, dimension: DimensionNode, context: string): Promise<DimensionNode[]> {
    const result = await this.llm.chatJSON<RefinementResult>({
      systemPrompt: REFINE_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `维度「${dimension.title}」需要进一步细化。

目标上下文：${goal.title}
当前维度描述：${dimension.description}
已有探索内容：${context}

请拆解出 2-4 个子维度，并评估各子维度的时效性和价值。`,
      }],
      schema: REFINE_SCHEMA,
    });

    return result.subDimensions.map(d => ({
      id: generateId(),
      goalId: goal.id,
      parentDimensionId: dimension.id,
      title: d.title,
      description: d.description,
      status: "pending" as const,
      explorationDepth: 0,
      maxDepth: d.estimatedDepth ?? 2,
      timeliness: d.timeliness ?? "normal",
      valueScore: d.valueScore ?? 5,
      children: [],
      dataSources: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      discoveredDuring: "dimension_refinement",
    }));
  }
}
```

#### 3.A.3 信息源发现器（source-discoverer.ts）

```typescript
/**
 * SourceDiscoverer — 为目标维度自动发现和绑定信息源
 *
 * 核心流程：
 * 1. 拿到目标和维度后，让 LLM 推理该领域有哪些专业信息源
 * 2. 对每个推荐的信息源做可达性检查
 * 3. 可达的信息源绑定到对应维度
 *
 * 信息源类型：
 * - 通用搜索（web_search）：所有维度的兜底信息源
 * - 专业网站 URL（url_monitor）：如行业报告网站、技术博客
 * - RSS 源（rss）：如 arXiv、Hacker News、行业新闻
 * - GitHub（github）：仓库动态、Release、Issue
 * - API 端点（api）：如公开的数据 API
 */
export class SourceDiscoverer {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  /**
   * 为一组维度批量发现信息源
   */
  async discoverAndBind(goal: GoalNode, dimensions: DimensionNode[]): Promise<void> {
    const result = await this.llm.chatJSON<SourceDiscoveryResult>({
      systemPrompt: SOURCE_DISCOVERY_PROMPT,
      messages: [{
        role: "user",
        content: `目标：${goal.title}
描述：${goal.description}

需要为以下维度发现信息源：
${dimensions.map(d => `- ${d.title}: ${d.description}`).join("\n")}

请为每个维度推荐：
1. 该领域最权威/及时的专业信息源（网站、RSS、GitHub 仓库、API 等）
2. 每个信息源的具体 URL 或标识
3. 为该信息源设计的查询关键词或监控参数
4. 建议的采集频率

注意：
- 不同领域的专业信息源是不同的（如学术用 arXiv/Google Scholar，技术用 GitHub/HN，商业用行业报告网站）
- 通用搜索（Google/Bing）作为每个维度的兜底信息源，不需要单独列出
- 优先推荐信息最及时、最权威的专业源`,
      }],
      schema: SOURCE_DISCOVERY_SCHEMA,
    });

    // 对每个推荐的信息源做可达性检查
    for (const dimSources of result.dimensionSources) {
      const dimension = dimensions.find(d => d.title === dimSources.dimensionTitle);
      if (!dimension) continue;

      for (const source of dimSources.sources) {
        const reachable = await this.checkReachability(source);

        // 注册到全局信息源注册表
        const dataSource: DataSource = {
          id: generateId(),
          type: source.type,
          name: source.name,
          config: source.config,
          reachable,
          lastCheckedAt: Date.now(),
        };

        // 绑定到维度
        dimension.dataSources.push({
          sourceId: dataSource.id,
          query: source.suggestedQuery,
          lastFetchedAt: null,
          fetchInterval: source.suggestedIntervalMs ?? 3600_000,
          accessible: reachable,
          accessCheckResult: reachable
            ? "OK"
            : `Unreachable: ${source.name}`,
        });
      }

      // 始终绑定通用搜索作为兜底
      dimension.dataSources.push({
        sourceId: "web_search_default",
        query: `${goal.title} ${dimension.title}`,
        lastFetchedAt: null,
        fetchInterval: 3600_000,
        accessible: true,
      });
    }
  }

  /**
   * 为单个新增维度发现信息源
   */
  async discoverAndBindSingle(goal: GoalNode, dimension: DimensionNode): Promise<void> {
    await this.discoverAndBind(goal, [dimension]);
  }

  /**
   * 可达性检查
   * - URL 类型：发 HEAD 请求，检查状态码
   * - RSS 类型：尝试 fetch 并解析
   * - GitHub 类型：调用 GitHub API 检查仓库是否存在
   * - API 类型：发送测试请求
   */
  private async checkReachability(source: RecommendedSource): Promise<boolean> {
    try {
      switch (source.type) {
        case "url_monitor":
        case "rss": {
          const resp = await fetch(source.config.url as string, {
            method: "HEAD",
            signal: AbortSignal.timeout(10_000),
          });
          return resp.ok;
        }
        case "github": {
          const resp = await fetch(
            `https://api.github.com/repos/${source.config.repo}`,
            { signal: AbortSignal.timeout(10_000) },
          );
          return resp.ok;
        }
        default:
          return true; // 乐观假设
      }
    } catch {
      return false;
    }
  }
}
```

---

### 模块 ①：InfoCollector（信息采集层）

```typescript
/**
 * InfoCollector — 多源信息采集
 *
 * 采集策略：
 * 1. 根据维度绑定的信息源逐个采集
 * 2. 专业信息源优先，通用搜索兜底
 * 3. 跳过上次采集时间 < fetchInterval 的信息源
 * 4. 每个信息源通过对应的 SourceAdapter 执行采集
 */
export class InfoCollector {
  private adapters: Map<string, SourceAdapter>;

  constructor() {
    this.adapters = new Map();
    this.adapters.set("web_search", new WebSearchAdapter());
    this.adapters.set("rss", new RSSAdapter());
    this.adapters.set("github", new GitHubAdapter());
    this.adapters.set("url_monitor", new CustomURLAdapter());
  }

  /**
   * 为指定目标的指定维度采集信息
   */
  async collect(
    goal: GoalNode,
    dimensions: DimensionNode[],
  ): Promise<InfoItem[]> {
    const allItems: InfoItem[] = [];

    for (const dim of dimensions) {
      // 按信息源类型优先级排序：专业源在前，通用搜索在后
      const sortedSources = this.sortByPriority(dim.dataSources);

      for (const binding of sortedSources) {
        // 跳过不可达的信息源
        if (!binding.accessible) continue;

        // 跳过采集间隔未到的信息源
        if (binding.lastFetchedAt &&
            Date.now() - binding.lastFetchedAt < binding.fetchInterval) {
          continue;
        }

        try {
          const adapter = this.adapters.get(binding.sourceId.startsWith("web_search")
            ? "web_search"
            : this.getSourceType(binding.sourceId));

          if (!adapter) continue;

          const items = await adapter.fetch(binding);

          for (const item of items) {
            allItems.push({
              id: generateId(),
              sourceId: binding.sourceId,
              dimensionId: dim.id,
              goalId: goal.id,
              content: item.content,
              url: item.url,
              fetchedAt: Date.now(),
              relevanceScore: null,
              relevanceLevel: null,
              metadata: item.metadata ?? {},
            });
          }

          // 更新采集时间
          binding.lastFetchedAt = Date.now();
        } catch (error) {
          // 单个信息源失败不影响其他
          console.error(`Info collection failed for source ${binding.sourceId}:`, error);
        }
      }
    }

    return allItems;
  }

  private sortByPriority(sources: DataSourceBinding[]): DataSourceBinding[] {
    return [...sources].sort((a, b) => {
      // 通用搜索排最后
      if (a.sourceId === "web_search_default") return 1;
      if (b.sourceId === "web_search_default") return -1;
      return 0;
    });
  }
}

// ── SourceAdapter 接口和实现 ──

interface SourceAdapter {
  fetch(binding: DataSourceBinding): Promise<Array<{
    content: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }>>;
}

/**
 * 通用搜索适配器
 * 利用现有 coding-agent 的 bash/web 能力执行搜索
 */
class WebSearchAdapter implements SourceAdapter {
  async fetch(binding: DataSourceBinding) {
    // 通过 coding-agent 的 tool 系统调用搜索
    // 实际实现会调用 web_search API 或 bash curl
    const results = await executeWebSearch(binding.query);
    return results.map(r => ({
      content: r.snippet,
      url: r.url,
      metadata: { title: r.title },
    }));
  }
}

/**
 * RSS 适配器
 */
class RSSAdapter implements SourceAdapter {
  async fetch(binding: DataSourceBinding) {
    const feedUrl = binding.query; // RSS URL
    const feed = await fetchAndParseRSS(feedUrl);
    return feed.items.map(item => ({
      content: `${item.title}\n${item.description}`,
      url: item.link,
      metadata: { publishedAt: item.pubDate },
    }));
  }
}

/**
 * GitHub 适配器
 * 监控仓库的 Release、Issue、Commit 等
 */
class GitHubAdapter implements SourceAdapter {
  async fetch(binding: DataSourceBinding) {
    const config = JSON.parse(binding.query);
    // 根据 config.watch 决定监控什么：releases / issues / commits
    const apiUrl = `https://api.github.com/repos/${config.repo}/${config.watch}`;
    const resp = await fetch(apiUrl);
    const data = await resp.json();
    return data.slice(0, 10).map((item: any) => ({
      content: JSON.stringify(item),
      url: item.html_url,
      metadata: { type: config.watch },
    }));
  }
}

/**
 * 自定义 URL 监控适配器
 * 定期抓取页面内容，对比变化
 */
class CustomURLAdapter implements SourceAdapter {
  async fetch(binding: DataSourceBinding) {
    const url = binding.query;
    const content = await fetchPageContent(url);
    return [{
      content,
      url,
      metadata: { fetchedAt: Date.now() },
    }];
  }
}
```

---

### 模块 ②：RelevanceJudge（相关性裁决层）

```typescript
/**
 * RelevanceJudge — 信息与目标的相关性裁决
 *
 * 特殊能力：
 * 1. 在判断相关性的同时，可以发现新的维度
 *    （例如一条信息虽然与当前维度弱相关，但揭示了一个值得单独探索的新方向）
 * 2. 支持弱相关信息的交叉关联升级
 */
export class RelevanceJudge {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  async judge(
    items: InfoItem[],
    goal: GoalNode,
    dimensions: DimensionNode[],
    knowledgeContext: string,    // 知识池中的相关摘要
  ): Promise<RelevanceResult> {

    // 批量判断（每批最多 10 条，避免 prompt 过长）
    const batches = chunk(items, 10);
    const allResults: RelevanceResult = {
      stronglyRelevant: [],
      weaklyRelevant: [],
      newDimensions: [],
    };

    for (const batch of batches) {
      const result = await this.llm.chatJSON<BatchRelevanceOutput>({
        systemPrompt: RELEVANCE_JUDGE_PROMPT,
        messages: [{
          role: "user",
          content: `目标：${goal.title}
描述：${goal.description}

当前维度树：
${dimensions.map(d => `- ${d.title} [${d.status}] (价值:${d.valueScore}, 时效:${d.timeliness})`).join("\n")}

知识池已有：
${knowledgeContext}

请判断以下信息的相关性：
${batch.map((item, i) => `[${i}] ${item.content.slice(0, 500)}`).join("\n\n")}

对每条信息：
1. 判断与哪个维度最相关
2. 相关强度：strong / weak / irrelevant
3. 相关性理由（简要）
4. 是否揭示了新的探索维度？如果是，描述该维度

输出 JSON。`,
        }],
        schema: RELEVANCE_BATCH_SCHEMA,
      });

      for (const judgment of result.judgments) {
        const item = batch[judgment.index];
        item.relevanceScore = judgment.score;
        item.relevanceLevel = judgment.level;

        if (judgment.level === "strong") {
          allResults.stronglyRelevant.push(item);
        } else if (judgment.level === "weak") {
          allResults.weaklyRelevant.push(item);
        }

        // 新维度发现
        if (judgment.newDimension) {
          allResults.newDimensions.push({
            title: judgment.newDimension.title,
            description: judgment.newDimension.description,
            timeliness: judgment.newDimension.timeliness ?? "normal",
            valueScore: judgment.newDimension.valueScore ?? 5,
            discoveredDuring: "relevance_judgment",
          });
        }
      }
    }

    return allResults;
  }
}
```

---

### 模块 ③：ActionReasoner（行动推理层）

```typescript
/**
 * ActionReasoner — 行动推理引擎
 *
 * 设计方案中的"大脑"。基于五步思考链推理出最优行动方案。
 * 行为空间无限——先想做什么，再考虑怎么做。
 *
 * 新增能力：
 * - 推理过程中可以发现新的维度并返回
 * - 推理时考虑维度的时效性和价值性
 */
export class ActionReasoner {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  async reason(
    infoItems: InfoItem[],
    goal: GoalNode,
    dimensions: DimensionNode[],
    knowledgeContext: string,
    userContext: string,
  ): Promise<ReasoningOutput> {

    const result = await this.llm.chatJSON<ReasoningOutput>({
      systemPrompt: ACTION_REASONER_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `你是一个目标驱动型 AI 助手的思考引擎。

═══════════════════════════════════════════
输入
═══════════════════════════════════════════

【强相关信息】
${infoItems.map(item => `- [来源: ${item.sourceId}] ${item.content.slice(0, 1000)}`).join("\n")}

【目标】
${goal.title}: ${goal.description}
授权深度: ${goal.authorizationDepth}
约束: ${JSON.stringify(goal.constraints)}

【维度树状态】
${this.formatDimensionTree(dimensions)}

【知识池中的相关积累】
${knowledgeContext}

【用户上下文】
${userContext}

═══════════════════════════════════════════
思考过程（请严格按五步执行）
═══════════════════════════════════════════

## Step 1：信息理解
核心事实是什么？有哪些隐含信息？

## Step 2：目标关联
这条信息对目标的哪个方面有影响？
结合已有知识，整体画面发生了什么变化？
注意考虑各维度的时效性和价值评分。

## Step 3：理想行动（不限制手段）
如果你什么都能做，面对这个局面，最有价值的行动是什么？
请充分发散，列出所有可能。
同时思考：这些信息是否揭示了需要新增的探索维度？

## Step 4：评估与选择
对每个行动评估目标推进幅度、预估成本、成功概率、紧急程度。
选择最优方案。

## Step 5：行动方案
描述决定做什么、为什么、预期产出。

═══════════════════════════════════════════
输出 JSON
═══════════════════════════════════════════`,
      }],
      schema: REASONING_OUTPUT_SCHEMA,
    });

    return result;
  }

  private formatDimensionTree(dimensions: DimensionNode[], indent: number = 0): string {
    return dimensions.map(d => {
      const prefix = "  ".repeat(indent);
      const status = `[${d.status}] 价值:${d.valueScore} 时效:${d.timeliness} 深度:${d.explorationDepth}/${d.maxDepth}`;
      const children = d.children.length > 0
        ? "\n" + this.formatDimensionTree(d.children, indent + 1)
        : "";
      return `${prefix}- ${d.title} ${status}${children}`;
    }).join("\n");
  }
}

/** ActionReasoner 的输出结构 */
interface ReasoningOutput {
  reasoningTrace: string;
  recommendedAction: ActionPlan;
  alternativeActions: ActionPlan[];
  knowledgeToSave: string;
  newDimensions?: Array<{
    title: string;
    description: string;
    parentDimensionTitle?: string;
    timeliness: string;
    valueScore: number;
  }>;
}
```

---

### 模块 ④：PreActionGate（执行前价值裁决）

```typescript
/**
 * PreActionGate — 执行前价值裁决
 *
 * 核心问题：这个行动方案值不值得投入资源去做？
 * 裁决结果：proceed / shelve / abandon
 */
export class PreActionGate {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  async evaluate(
    actionPlan: ActionPlan,
    goal: GoalNode,
    knowledgeContext: string,
  ): Promise<GateDecision> {

    const result = await this.llm.chatJSON<GateDecision>({
      systemPrompt: `你是一个行动价值评估器。基于以下维度综合判断一个行动方案是否值得执行：
1. 目标推进度：成功后能推进多少？
2. 成本合理性：预估成本与收益是否匹配？
3. 成功概率：能做成的概率多大？
4. 紧迫性：延迟做会损失多少价值？
5. 边际收益：比"什么都不做"好多少？

你必须输出 JSON。`,
      messages: [{
        role: "user",
        content: `行动方案：
- 做什么：${actionPlan.what}
- 为什么：${actionPlan.why}
- 预期结果：${actionPlan.expectedOutcome}
- 成本估计：${actionPlan.costEstimate}
- 紧急程度：${actionPlan.urgency}
- 成功概率：${actionPlan.successProbability}/10

目标：${goal.title}
目标约束：${JSON.stringify(goal.constraints)}

已有知识：${knowledgeContext}

请评估并决定：proceed（执行）/ shelve（暂缓）/ abandon（放弃）`,
      }],
      schema: GATE_DECISION_SCHEMA,
    });

    return result;
  }
}

interface GateDecision {
  decision: "proceed" | "shelve" | "abandon";
  reasoning: string;
  scores: {
    goalAdvancement: number;    // 1-10
    costReasonability: number;  // 1-10
    successLikelihood: number;  // 1-10
    urgency: number;            // 1-10
    marginalGain: number;       // 1-10
  };
  shelveCondition?: string;     // 如果暂缓，什么条件下重新评估
}
```

---

### 模块 ⑤：CapabilityResolver（能力适配层）

```typescript
/**
 * CapabilityResolver — 解决"怎么做"
 *
 * 四级策略：
 * Level 1: 直接匹配现有工具
 * Level 2: 组合多个工具
 * Level 3: 写代码创造新工具
 * Level 4: 变通或求助用户
 *
 * 利用现有 coding-agent 的完整工具集：
 * bash, read, write, edit, grep, find, ls
 * 以及 AgentSession 的 prompt() 能力
 */
export class CapabilityResolver {
  private llm: BackgroundLLMChannel;
  private availableTools: string[];

  constructor(llm: BackgroundLLMChannel, agentSession: AgentSession) {
    this.llm = llm;
    // 获取当前 AgentSession 注册的所有工具名
    this.availableTools = agentSession.tools.map(t => t.name);
  }

  async resolve(actionPlan: ActionPlan): Promise<CapabilityResolution> {

    const result = await this.llm.chatJSON<CapabilityResolution>({
      systemPrompt: CAPABILITY_RESOLVER_PROMPT,
      messages: [{
        role: "user",
        content: `行动方案：${actionPlan.what}
预期结果：${actionPlan.expectedOutcome}

可用工具列表：
${this.availableTools.map(t => `- ${t}`).join("\n")}

请制定执行计划：
1. 首先尝试用现有工具直接完成（Level 1）
2. 如果单个工具不够，考虑组合多个工具（Level 2）
3. 如果现有工具都不行，考虑写代码/脚本实现（Level 3）— 利用 bash 和 write 工具
4. 如果自己无法完成，说明需要用户帮助什么（Level 4）

对 Level 3，请直接输出代码内容，后续将通过 write + bash 工具执行。

输出 JSON。`,
      }],
      schema: CAPABILITY_RESOLUTION_SCHEMA,
    });

    return result;
  }
}
```

---

### 模块 ⑥：Executor（行动执行层）

```typescript
/**
 * Executor — 执行行动
 *
 * 利用现有 coding-agent 的工具系统执行：
 * - 直接通过 BackgroundLLMChannel 进行推理/分析/写作类任务
 * - 通过 AgentSession 的 tool 系统执行 bash/read/write 等操作
 * - 支持多步编排和 ReAct 模式
 *
 * 执行中的自主性：
 * - 中间失败 → 自动调整重试（最多 3 次）
 * - 发现新信息 → 存入知识池
 * - 发现新维度 → 返回给 GoalManager
 * - 成本超预期 → 暂停重新评估
 */
export class Executor {
  private llm: BackgroundLLMChannel;
  private agentTools: AgentTool[];
  private knowledgeStore: KnowledgeStore;

  constructor(
    llm: BackgroundLLMChannel,
    agentTools: AgentTool[],
    knowledgeStore: KnowledgeStore,
  ) {
    this.llm = llm;
    this.agentTools = agentTools;
    this.knowledgeStore = knowledgeStore;
  }

  async execute(
    actionPlan: ActionPlan,
    resolution: CapabilityResolution,
  ): Promise<ExecutionResult> {

    const stepResults: StepResult[] = [];
    let newDimensions: Array<Partial<DimensionNode>> = [];

    for (const step of resolution.toolChain) {
      // 检查依赖是否完成
      if (step.dependsOn) {
        const allDone = step.dependsOn.every(depId =>
          stepResults.some(r => r.stepId === depId && r.status === "success")
        );
        if (!allDone) {
          stepResults.push({
            stepId: step.toolName,
            status: "skipped",
            reason: "dependency not met",
          });
          continue;
        }
      }

      // 执行单步（带重试）
      let result: StepResult | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          result = await this.executeStep(step, stepResults);
          if (result.status === "success") break;

          // 失败时让 LLM 分析原因并调整
          const adjustment = await this.llm.chatJSON<StepAdjustment>({
            systemPrompt: "分析执行失败原因并建议调整方案",
            messages: [{
              role: "user",
              content: `步骤「${step.description}」执行失败。
错误：${result.error}
第 ${attempt + 1} 次尝试。
请分析原因并给出调整后的执行参数。`,
            }],
            schema: STEP_ADJUSTMENT_SCHEMA,
          });

          // 应用调整
          step.input = { ...step.input, ...adjustment.adjustedInput };
        } catch (error) {
          result = {
            stepId: step.toolName,
            status: "failed",
            error: String(error),
          };
        }
      }

      stepResults.push(result!);

      // 检查中间结果是否发现新维度
      if (result?.output) {
        const discovery = await this.checkForNewDimensions(result.output, actionPlan);
        if (discovery.length > 0) {
          newDimensions.push(...discovery);
        }
      }
    }

    // 汇总执行结果
    const overallSuccess = stepResults.every(
      r => r.status === "success" || r.status === "skipped"
    );

    return {
      actionPlanId: actionPlan.id,
      status: overallSuccess ? "completed" : "partial",
      stepResults,
      output: this.aggregateOutputs(stepResults),
      newDimensions,
      executedAt: Date.now(),
    };
  }

  /**
   * 执行单个工具步骤
   */
  private async executeStep(
    step: ToolStep,
    priorResults: StepResult[],
  ): Promise<StepResult> {
    const tool = this.agentTools.find(t => t.name === step.toolName);

    if (tool) {
      // 使用 coding-agent 的原生工具
      const result = await tool.execute(step.input);
      return {
        stepId: step.toolName,
        status: "success",
        output: result,
      };
    }

    // 如果是 LLM 推理/分析/写作任务
    if (step.toolName === "llm_reasoning") {
      const response = await this.llm.chat({
        systemPrompt: step.input.systemPrompt as string,
        messages: step.input.messages as Message[],
      });
      return {
        stepId: step.toolName,
        status: "success",
        output: extractTextContent(response),
      };
    }

    return {
      stepId: step.toolName,
      status: "failed",
      error: `Unknown tool: ${step.toolName}`,
    };
  }

  /**
   * 检查执行输出中是否暗示新的探索维度
   */
  private async checkForNewDimensions(
    output: string,
    actionPlan: ActionPlan,
  ): Promise<Array<Partial<DimensionNode>>> {
    const result = await this.llm.chatJSON<{ dimensions: Array<Partial<DimensionNode>> }>({
      systemPrompt: "分析执行结果，判断是否揭示了需要新增的探索维度。如果没有，返回空数组。",
      messages: [{
        role: "user",
        content: `执行的行动：${actionPlan.what}
执行结果摘要（前2000字）：${output.slice(0, 2000)}

是否发现了值得单独探索的新方向/维度？`,
      }],
      schema: NEW_DIMENSIONS_SCHEMA,
    });
    return result.dimensions.map(d => ({
      ...d,
      discoveredDuring: "execution",
    }));
  }
}
```

---

### 模块 ⑦：PostActionGate（执行后价值裁决）

```typescript
/**
 * PostActionGate — 执行后价值裁决
 *
 * 核心原则：Agent 的执行成本不转嫁为用户的注意力成本。
 * 结果不够好就沉默积累，不打扰。
 */
export class PostActionGate {
  private llm: BackgroundLLMChannel;

  constructor(llm: BackgroundLLMChannel) {
    this.llm = llm;
  }

  async evaluate(
    executionResult: ExecutionResult,
    actionPlan: ActionPlan,
    goal: GoalNode,
  ): Promise<Notification | null> {

    const result = await this.llm.chatJSON<PostActionDecision>({
      systemPrompt: `你是一个输出价值评估器。判断执行结果是否值得通知用户。

评估维度：
1. 信息增量：结果中有多少是用户不知道的新信息？
2. 可行动性：用户得知后能做什么？
3. 质量达标度：产出物质量是否达到推送标准？
4. 目标推进实际效果：对目标的实际推进与预期相比如何？

核心原则：宁可不推也不推烂——只有真正有价值的结果才通知用户。

输出 JSON。`,
      messages: [{
        role: "user",
        content: `执行的行动：${actionPlan.what}
行动原因：${actionPlan.why}
预期结果：${actionPlan.expectedOutcome}

实际执行结果：
${executionResult.output?.slice(0, 3000)}

执行状态：${executionResult.status}

目标：${goal.title}

请判断：应该通知用户吗？如果是，用什么方式？`,
      }],
      schema: POST_ACTION_DECISION_SCHEMA,
    });

    if (result.shouldNotify) {
      return {
        id: generateId(),
        type: result.notificationType,
        goalId: goal.id,
        title: result.notificationTitle,
        content: result.notificationContent,
        priority: result.priority,
        actionPlanId: actionPlan.id,
        createdAt: Date.now(),
        deliveredAt: null,
      };
    }

    return null; // 不通知，沉淀到知识池
  }
}

interface PostActionDecision {
  shouldNotify: boolean;
  reasoning: string;
  scores: {
    informationGain: number;
    actionability: number;
    qualityLevel: number;
    goalAdvancement: number;
  };
  notificationType?: Notification["type"];
  notificationTitle?: string;
  notificationContent?: string;
  priority?: Notification["priority"];
}
```

---

### 模块 ⑧：通知系统（NotificationQueue + IdleDetector + NotificationRenderer）

#### 3.8.1 通知队列（notification-queue.ts）

```typescript
/**
 * NotificationQueue — 通知排队系统
 *
 * 通知不是立即推送，而是进入队列，由 IdleDetector 决定何时输出。
 * 规则：
 * 1. 用户空闲 ≥ 5 分钟时，逐条输出队列中的通知
 * 2. 用户正在交互时，通知静默排队
 * 3. 用户主动发消息时，不触发通知输出（等用户的消息被处理完后再判断）
 * 4. urgent 通知可以缩短等待时间（空闲 1 分钟即输出）
 */
export class NotificationQueue {
  private queue: Notification[] = [];
  private deliveredHistory: Notification[] = [];
  private onNotificationReady?: (notification: Notification) => void;

  enqueue(notification: Notification): void {
    this.queue.push(notification);
    // 按优先级排序：high > normal > low
    this.queue.sort((a, b) => {
      const order = { high: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  /**
   * 取出下一条待发送的通知
   */
  dequeue(): Notification | null {
    if (this.queue.length === 0) return null;
    const notification = this.queue.shift()!;
    notification.deliveredAt = Date.now();
    this.deliveredHistory.push(notification);
    return notification;
  }

  /**
   * 检查是否有 urgent 通知
   */
  hasUrgent(): boolean {
    return this.queue.some(n => n.priority === "high");
  }

  /**
   * 队列中的通知数量
   */
  get pendingCount(): number {
    return this.queue.length;
  }

  /**
   * 标记用户对通知的反应
   */
  markReaction(notificationId: string, reaction: Notification["userReaction"]): void {
    const n = this.deliveredHistory.find(n => n.id === notificationId);
    if (n) n.userReaction = reaction;
  }
}
```

#### 3.8.2 空闲检测器（idle-detector.ts）

```typescript
/**
 * IdleDetector — 检测用户是否空闲
 *
 * 集成到 InteractiveMode 中，监听用户输入事件。
 *
 * 空闲判定规则：
 * - 用户最后一次按键/鼠标事件后 5 分钟 → 标记为空闲
 * - urgent 通知时，缩短到 1 分钟
 * - 用户重新开始输入 → 立即标记为活跃
 * - Agent 前台正在执行/输出时 → 不算空闲
 */
export class IdleDetector {
  private lastActivityAt: number = Date.now();
  private isAgentBusy: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private onIdleCallback?: () => void;

  private readonly NORMAL_IDLE_THRESHOLD = 5 * 60_000;   // 5 分钟
  private readonly URGENT_IDLE_THRESHOLD = 1 * 60_000;   // 1 分钟

  constructor(private notificationQueue: NotificationQueue) {}

  /**
   * 启动空闲检测
   * 每 30 秒检查一次
   */
  start(onIdle: () => void): void {
    this.onIdleCallback = onIdle;
    this.checkInterval = setInterval(() => this.check(), 30_000);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 用户有活动时调用（由 InteractiveMode 的按键事件触发）
   */
  recordActivity(): void {
    this.lastActivityAt = Date.now();
  }

  /**
   * Agent 前台开始/结束工作时调用
   */
  setAgentBusy(busy: boolean): void {
    this.isAgentBusy = busy;
  }

  private check(): void {
    if (this.isAgentBusy) return;
    if (this.notificationQueue.pendingCount === 0) return;

    const idleDuration = Date.now() - this.lastActivityAt;
    const threshold = this.notificationQueue.hasUrgent()
      ? this.URGENT_IDLE_THRESHOLD
      : this.NORMAL_IDLE_THRESHOLD;

    if (idleDuration >= threshold) {
      this.onIdleCallback?.();
    }
  }
}
```

#### 3.8.3 通知渲染器（notification-renderer.ts）

```typescript
/**
 * NotificationRenderer — 将通知渲染到 TUI
 *
 * 作为一个 TUI 组件，集成到 InteractiveMode 的消息列表中。
 * 通知以特殊样式展示，与普通对话消息区分。
 */
import { Box, Text } from "@mariozechner/pi-tui";

export class NotificationRenderer {
  /**
   * 将通知渲染为 TUI 元素
   * 根据通知类型使用不同的图标和颜色
   */
  render(notification: Notification): TUIElement {
    const icons: Record<Notification["type"], string> = {
      delivery:     "✅",
      report:       "📊",
      suggestion:   "💡",
      help_request: "🆘",
      confirmation: "⚠️",
      progress:     "📈",
    };

    const icon = icons[notification.type] || "📌";

    // 渲染为带边框的通知卡片
    return Box({
      borderStyle: "round",
      borderColor: notification.priority === "high" ? "red" : "cyan",
      padding: 1,
      children: [
        Text({
          content: `${icon} [后台目标] ${notification.title}`,
          bold: true,
        }),
        Text({ content: "" }),   // 空行
        Text({
          content: notification.content,
          color: "white",
        }),
        Text({ content: "" }),
        Text({
          content: `[${notification.type}] · ${formatTime(notification.createdAt)}`,
          color: "gray",
          italic: true,
        }),
      ],
    });
  }

  /**
   * 将通知注入到 InteractiveMode 的消息流中
   * 以"系统消息"的形式出现在对话中
   */
  async deliverToFrontend(
    notification: Notification,
    interactiveMode: InteractiveMode,
  ): Promise<void> {
    // 在消息列表中追加一条通知消息
    interactiveMode.appendSystemMessage({
      type: "goal_notification",
      content: this.formatAsMarkdown(notification),
      metadata: {
        notificationId: notification.id,
        goalId: notification.goalId,
        notificationType: notification.type,
      },
    });

    // 如果是求助或确认类型，等待用户回复
    if (notification.type === "help_request" || notification.type === "confirmation") {
      // 标记该通知正在等待用户输入
      // InteractiveMode 会识别并将用户下一条消息路由到后台循环
    }
  }

  private formatAsMarkdown(n: Notification): string {
    return `---\n**${n.title}**\n\n${n.content}\n\n_来自后台目标追踪 · ${formatTime(n.createdAt)}_\n---`;
  }
}
```

---

### 模块 ⑨：FeedbackTracker（反馈与学习）

```typescript
/**
 * FeedbackTracker — 收集反馈信号，优化裁决阈值
 *
 * 学习信号来源：
 * 1. 显式反馈：用户对通知的回复（有用/没用）
 * 2. 行为反馈：用户是否打开了交付物链接
 * 3. 反向信号：后台判断不推送的内容，用户后来主动问了 → 阈值调低
 * 4. 误判信号：推送了用户觉得没用的 → 阈值调高
 *
 * 持久化到 ~/.pi/agent/goal-driven/feedback.jsonl
 */
export class FeedbackTracker {
  private signals: FeedbackSignal[] = [];
  private thresholds: ThresholdConfig;
  private dataPath: string;

  constructor(dataDir: string) {
    this.dataPath = path.join(dataDir, "feedback.jsonl");
    this.thresholds = this.loadThresholds();
  }

  /**
   * 记录反馈信号
   */
  record(signal: FeedbackSignal): void {
    this.signals.push(signal);
    this.appendToDisk(signal);
    this.recalculateThresholds();
  }

  /**
   * 用户对通知做了回应
   */
  onNotificationReaction(notificationId: string, reaction: string): void {
    this.record({
      type: reaction === "useful" ? "positive_feedback" : "negative_feedback",
      notificationId,
      timestamp: Date.now(),
    });
  }

  /**
   * 用户主动问了某个知识池中的内容（反向信号）
   */
  onUserAskedAboutKnowledge(knowledgeId: string): void {
    this.record({
      type: "reverse_signal",
      knowledgeId,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取当前裁决阈值
   * 返回给 PreActionGate 和 PostActionGate 使用
   */
  getThresholds(): ThresholdConfig {
    return this.thresholds;
  }

  /**
   * 基于历史反馈信号调整阈值
   * - 正面反馈多 → 维持或略降阈值（多推一些）
   * - 负面反馈多 → 提高阈值（少推）
   * - 反向信号多 → 降低阈值（应该多推的没推）
   */
  private recalculateThresholds(): void {
    const recentSignals = this.signals.filter(
      s => Date.now() - s.timestamp < 7 * 24 * 3600_000  // 最近 7 天
    );

    const positive = recentSignals.filter(s => s.type === "positive_feedback").length;
    const negative = recentSignals.filter(s => s.type === "negative_feedback").length;
    const reverse = recentSignals.filter(s => s.type === "reverse_signal").length;

    // 简单的线性调整
    const total = positive + negative + reverse;
    if (total < 5) return; // 样本太少不调整

    const positiveRatio = positive / total;
    const negativeRatio = negative / total;
    const reverseRatio = reverse / total;

    // 后续可以用更复杂的模型
    if (negativeRatio > 0.4) {
      this.thresholds.postActionMinScore += 0.5;  // 提高推送门槛
    }
    if (reverseRatio > 0.3) {
      this.thresholds.postActionMinScore -= 0.5;  // 降低推送门槛
    }

    this.persistThresholds();
  }
}

interface FeedbackSignal {
  type: "positive_feedback" | "negative_feedback" | "reverse_signal";
  notificationId?: string;
  knowledgeId?: string;
  timestamp: number;
}

interface ThresholdConfig {
  preActionMinScore: number;     // 执行前裁决的最低通过分
  postActionMinScore: number;    // 执行后推送的最低通过分
  relevanceStrongThreshold: number;  // 强相关的最低阈值
}
```

---

### 支撑系统 B：KnowledgeStore（知识池）

```typescript
/**
 * KnowledgeStore — Agent 的长期记忆
 *
 * 存储所有被过滤、暂缓、未推送的信息和成果。
 * 支持交叉关联激活。
 *
 * 持久化：~/.pi/agent/goal-driven/knowledge/
 * 使用 JSONL 格式，每行一个 KnowledgeEntry。
 */
export class KnowledgeStore {
  private entries: KnowledgeEntry[] = [];
  private dataPath: string;

  constructor(dataDir: string) {
    this.dataPath = path.join(dataDir, "knowledge");
    this.loadFromDisk();
  }

  async save(entry: Omit<KnowledgeEntry, "id" | "createdAt" | "lastActivatedAt" | "activationCount">): Promise<string> {
    const full: KnowledgeEntry = {
      ...entry,
      id: generateId(),
      createdAt: Date.now(),
      lastActivatedAt: null,
      activationCount: 0,
    };
    this.entries.push(full);
    await this.appendToDisk(full);
    return full.id;
  }

  /**
   * 检查交叉关联激活
   *
   * 逻辑：
   * 1. 获取与当前目标相关的所有弱相关条目
   * 2. 让 LLM 判断是否有多条弱相关条目指向同一方向
   * 3. 如果组合后达到强相关阈值，将它们组合返回
   */
  async checkCrossActivation(
    goal: GoalNode,
    llm?: BackgroundLLMChannel,
  ): Promise<InfoItem[]> {
    if (!llm) return [];

    const relatedEntries = this.entries.filter(e =>
      e.relatedGoalIds.includes(goal.id) &&
      e.status === "raw" &&
      e.activationCount < 3  // 避免反复激活
    );

    if (relatedEntries.length < 2) return [];

    const result = await llm.chatJSON<CrossActivationResult>({
      systemPrompt: "判断以下知识池条目中，是否有多条弱相关信息可以组合成有价值的洞察。",
      messages: [{
        role: "user",
        content: `目标：${goal.title}

知识池中的弱相关条目：
${relatedEntries.map((e, i) => `[${i}] ${e.content.slice(0, 300)}`).join("\n\n")}

是否有条目可以组合，形成有价值的强相关洞察？`,
      }],
      schema: CROSS_ACTIVATION_SCHEMA,
    });

    if (!result.activated) return [];

    // 标记被激活的条目
    for (const idx of result.activatedIndices) {
      relatedEntries[idx].activationCount++;
      relatedEntries[idx].lastActivatedAt = Date.now();
    }

    // 将组合洞察作为新的 InfoItem 返回
    return [{
      id: generateId(),
      sourceId: "knowledge_cross_activation",
      dimensionId: null,
      goalId: goal.id,
      content: result.combinedInsight,
      fetchedAt: Date.now(),
      relevanceScore: result.combinedRelevanceScore,
      relevanceLevel: "strong",
      metadata: { activatedFrom: result.activatedIndices },
    }];
  }

  /**
   * 根据用户查询检索相关知识
   * 当用户前台交互时，可以调用此方法获取后台积累的知识
   */
  search(query: string, goalId?: string): KnowledgeEntry[] {
    return this.entries
      .filter(e => {
        if (goalId && !e.relatedGoalIds.includes(goalId)) return false;
        // 简单的关键词匹配，后续可升级为向量检索
        return e.content.toLowerCase().includes(query.toLowerCase()) ||
               e.tags.some(t => query.toLowerCase().includes(t.toLowerCase()));
      })
      .sort((a, b) => (b.lastActivatedAt ?? b.createdAt) - (a.lastActivatedAt ?? a.createdAt))
      .slice(0, 20);
  }
}
```

---

## 四、Extension 入口与注册

```typescript
/**
 * extension.ts — Goal-Driven Agent 的 Extension 入口
 *
 * 通过 pi-coding-agent 的 Extension 机制注册：
 * 1. 注册 /goal 命令
 * 2. 启动后台循环
 * 3. 集成空闲检测和通知渲染
 * 4. 向 AgentSession 注入知识池上下文
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function goalDrivenExtension(pi: ExtensionAPI) {

  let backgroundLoop: BackgroundAgentLoop | null = null;
  let idleDetector: IdleDetector | null = null;
  let notificationRenderer: NotificationRenderer | null = null;

  // ── 注册 /goal 命令 ──
  pi.registerCommand("goal", {
    description: "管理后台自主目标",
    subcommands: {
      "add":    "添加新目标 — /goal add <描述>",
      "list":   "列出所有目标 — /goal list",
      "status": "查看目标状态 — /goal status [id]",
      "pause":  "暂停目标 — /goal pause <id>",
      "resume": "恢复目标 — /goal resume <id>",
      "stop":   "停止目标 — /goal stop <id>",
      "tree":   "查看维度树 — /goal tree <id>",
      "knowledge": "查看知识池 — /goal knowledge [query]",
    },
    handler: async (args, context) => {
      const [subcommand, ...rest] = args.split(" ");

      switch (subcommand) {
        case "add": {
          const description = rest.join(" ");
          if (!description) return "用法: /goal add <目标描述>";

          // 确保后台循环已启动
          if (!backgroundLoop) {
            backgroundLoop = new BackgroundAgentLoop({
              modelRegistry: context.modelRegistry,
              currentModel: context.currentModel,
              agentSession: context.agentSession,
              dataDir: path.join(context.settingsDir, "goal-driven"),
            });
          }

          // 创建目标（自动触发维度拆解 + 信息源发现）
          const goal = await backgroundLoop.goalManager.createGoal({
            title: description,
            description,
            authorizationDepth: "full_auto",
          });

          // 启动后台循环
          await backgroundLoop.start();

          // 启动空闲检测
          if (!idleDetector) {
            idleDetector = new IdleDetector(backgroundLoop.notificationQueue);
            idleDetector.start(() => deliverPendingNotifications());
          }

          return `✅ 目标已创建并开始后台追踪：\n\n` +
                 `**${goal.title}**\n` +
                 `ID: ${goal.id}\n` +
                 `已拆解 ${backgroundLoop.goalManager.getDimensions(goal.id).length} 个维度\n` +
                 `后台循环已启动，将自动采集信息并推进目标。`;
        }

        case "list": {
          if (!backgroundLoop) return "暂无目标。使用 /goal add <描述> 创建。";
          const goals = backgroundLoop.goalManager.getAllGoals();
          return goals.map(g =>
            `- [${g.status}] **${g.title}** (${g.id.slice(0, 8)})`
          ).join("\n");
        }

        case "tree": {
          const goalId = rest[0];
          if (!goalId || !backgroundLoop) return "用法: /goal tree <目标ID>";
          const dims = backgroundLoop.goalManager.getDimensions(goalId);
          return formatDimensionTreeMarkdown(dims);
        }

        case "knowledge": {
          const query = rest.join(" ");
          if (!backgroundLoop) return "暂无知识积累。";
          const entries = backgroundLoop.knowledgeStore.search(query);
          return entries.length > 0
            ? entries.map(e => `- [${e.status}] ${e.content.slice(0, 200)}`).join("\n")
            : "未找到相关知识。";
        }

        // ... 其他子命令类似
      }
    },
  });

  // ── 监听用户输入事件，更新空闲检测器 ──
  pi.on("user_input", () => {
    idleDetector?.recordActivity();
  });

  // ── 监听 Agent 繁忙状态 ──
  pi.on("agent_start", () => {
    idleDetector?.setAgentBusy(true);
  });
  pi.on("agent_end", () => {
    idleDetector?.setAgentBusy(false);
  });

  // ── 监听模型变更 ──
  pi.on("model_change", (event) => {
    backgroundLoop?.onModelChange(event.model);
  });

  // ── 通知推送到前台 ──
  async function deliverPendingNotifications() {
    if (!backgroundLoop || !notificationRenderer) return;

    while (backgroundLoop.notificationQueue.pendingCount > 0) {
      const notification = backgroundLoop.notificationQueue.dequeue();
      if (!notification) break;

      await notificationRenderer.deliverToFrontend(notification, pi.interactiveMode);

      // 等一下再推下一条，避免刷屏
      await sleep(2000);

      // 如果用户在此期间开始活动了，停止推送
      if (idleDetector && !idleDetector.isIdle()) break;
    }
  }

  // ── 清理 ──
  pi.on("shutdown", async () => {
    await backgroundLoop?.stop();
    idleDetector?.stop();
  });
}
```

---

## 五、关键交互流程

### 5.1 用户创建目标的完整流程

```
用户输入: /goal add 帮我做一份 AI Agent 市场的行业调研报告

     │
     ▼
┌─ Extension handler ─────────────────────────────────────────────┐
│  1. 创建 GoalNode                                                │
│  2. GoalDecomposer.decompose()                                   │
│     └─ LLM 调用 → 拆解为 5-7 个维度（树状）                        │
│        每个维度标注 timeliness / valueScore / maxDepth             │
│  3. SourceDiscoverer.discoverAndBind()                           │
│     └─ LLM 推理各维度的专业信息源                                  │
│     └─ 可达性检查（HEAD 请求 / API probe）                         │
│     └─ 绑定到维度 + 通用搜索兜底                                   │
│  4. 返回确认消息给用户                                             │
│  5. BackgroundAgentLoop.start()                                  │
│  6. IdleDetector.start()                                         │
└─────────────────────────────────────────────────────────────────┘
     │
     ▼
用户看到:
  ✅ 目标已创建并开始后台追踪：
  **帮我做一份 AI Agent 市场的行业调研报告**
  已拆解 6 个维度
  发现 12 个专业信息源（9 个可用）
  后台循环已启动
```

### 5.2 后台循环的单轮执行流程

```
BackgroundAgentLoop.runCycle()
  │
  ├─ LoopScheduler 选择目标 + 维度
  │   └─ 选出：目标"AI Agent 调研" 的维度"主要玩家"（urgent, value=9, depth=0/3）
  │
  ├─ InfoCollector.collect()
  │   ├─ Crunchbase API adapter (专业源) → 获取 15 条公司数据
  │   ├─ TechCrunch RSS adapter → 获取 8 篇相关文章
  │   └─ Web Search adapter (兜底) → 获取 10 条搜索结果
  │
  ├─ RelevanceJudge.judge()
  │   ├─ 12 条 strong → 进入行动推理
  │   ├─ 8 条 weak → 存入知识池
  │   ├─ 13 条 irrelevant → 丢弃
  │   └─ 发现新维度："开源 Agent 框架生态"（discoveredDuring: relevance_judgment）
  │
  ├─ GoalManager.addDimensions() → 新维度加入树
  │
  ├─ KnowledgeStore.checkCrossActivation()
  │   └─ 发现知识池中 3 条弱相关条目指向"Agent 平台的定价策略" → 激活为强相关
  │
  ├─ ActionReasoner.reason()
  │   └─ 五步思考 → 推荐行动："整理主要玩家清单，按融资、产品、技术路线分类对比"
  │   └─ 发现新维度："Agent 安全与合规"（discoveredDuring: action_reasoning）
  │
  ├─ PreActionGate.evaluate()
  │   └─ 目标推进 9，成本 low，成功率 8 → proceed
  │
  ├─ CapabilityResolver.resolve()
  │   └─ Level 2: 组合 web_search + llm_reasoning + write → 工具链
  │
  ├─ Executor.execute()
  │   ├─ Step 1: 整理原始数据
  │   ├─ Step 2: LLM 分析对比
  │   ├─ Step 3: write 生成 Markdown 报告
  │   └─ 执行中发现新维度："中国市场 vs 海外市场差异"
  │
  ├─ PostActionGate.evaluate()
  │   └─ 信息增量高、质量达标 → shouldNotify = true
  │   └─ type = "report", priority = "normal"
  │
  └─ NotificationQueue.enqueue()
      └─ 等待用户空闲后推送
```

### 5.3 通知推送时序

```
时间线：
─────────────────────────────────────────────────────────────
t=0     用户最后一次按键
t+30s   IdleDetector 检查 → 未到 5 分钟，跳过
t+1m    IdleDetector 检查 → 未到 5 分钟，跳过
        （如果队列中有 urgent 通知且已过 1 分钟 → 触发推送）
t+5m    IdleDetector 检查 → 已空闲 5 分钟 → 触发 deliverPendingNotifications()
        │
        ├─ 取出通知 1 → 渲染到 TUI 消息流
        ├─ 等待 2 秒
        ├─ 取出通知 2 → 渲染到 TUI 消息流
        ├─ ... 直到队列清空或用户恢复活跃
─────────────────────────────────────────────────────────────
t+5m30s 用户看到消息列表中出现了通知卡片
t+6m    用户开始打字回复 → IdleDetector.recordActivity() → 停止继续推送
```

---

## 六、持久化策略

```
~/.pi/agent/goal-driven/
├── goals/
│   ├── {goalId-1}.json         # GoalNode + DimensionNode 树 + DataSourceBinding
│   └── {goalId-2}.json
├── knowledge/
│   ├── {goalId-1}.jsonl        # 按目标分文件的知识条目
│   └── global.jsonl            # 跨目标的通用知识
├── sources/
│   └── registry.json           # 全局信息源注册表
├── feedback.jsonl              # 反馈信号记录
├── thresholds.json             # 裁决阈值配置
└── loop-state.json             # 后台循环状态快照（用于恢复）
```

**恢复策略**：Agent 重启时，从 `loop-state.json` 恢复循环状态，从 goals/ 恢复目标树，自动继续后台循环。

---

## 七、实施分期建议

| 阶段 | 内容 | 核心交付 |
|------|------|---------|
| **P0** | 基础框架 | BackgroundAgentLoop + GoalManager + GoalDecomposer + SourceDiscoverer + 独立 LLM 通道 + /goal 命令 |
| **P1** | 信息采集 | InfoCollector + WebSearchAdapter + RelevanceJudge + KnowledgeStore 基础版 |
| **P2** | 行动流水线 | ActionReasoner + PreActionGate + CapabilityResolver + Executor |
| **P3** | 通知系统 | PostActionGate + NotificationQueue + IdleDetector + NotificationRenderer |
| **P4** | 学习闭环 | FeedbackTracker + 交叉关联激活 + 裁决阈值自适应 |
| **P5** | 信息源增强 | RSS/GitHub/API 适配器 + 更多专业信息源 + 可达性自动重检 |
