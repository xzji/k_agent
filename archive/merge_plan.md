# 融合改造方案：目标驱动型长期 Agent 架构升级

## 一、方案概述

本方案融合当前项目的 **9 模块流水线架构** 与新方案的 **任务调度模型**，实现一个既有深度探索能力、又具备时间/事件驱动执行能力的目标驱动型 Agent。

### 核心融合思路

```
当前项目（Goal-Driven Agent）    新方案（Goal-Oriented Long-Term Agent）
┌─────────────────────────┐     ┌─────────────────────────┐
│ 维度（Dimension）探索空间 │  +  │ 任务（Task）执行单元     │
│ 信息驱动（采集→洞察→行动）│  +  │ 时间/事件驱动（调度→执行）│
│ 探索型主动（发现新信息）  │  +  │ 服务型主动（推送提醒）   │
│ 工具创造性（四级适配）    │  +  │ 任务类型化（5种类型）    │
│ 双门裁决（执行前/后过滤） │  +  │ 自适应调整（反馈驱动）   │
└─────────────────────────┘     └─────────────────────────┘
              ↓                           ↓
              └───────────┬───────────────┘
                          ↓
              ┌─────────────────────────┐
              │     融合后架构           │
              │  以任务调度器为流量入口  │
              │  以 9 模块为执行引擎     │
              │  以知识存储为记忆中枢    │
              └─────────────────────────┘
```

---

## 二、融合后的核心架构

### 2.1 数据模型融合

```typescript
// 目标：保留当前 GoalNode 核心，增加结构化成功标准
interface Goal {
  id: string;
  title: string;
  description: string;
  status: 'gathering_info' | 'planning' | 'active' | 'paused' | 'completed';
  deadline?: Date;

  // 融合：维度作为探索空间定义，任务作为执行单元
  dimensions: Dimension[];        // 保留：多维度探索定义
  tasks: Task[];                  // 新增：可执行任务集合

  // 成功标准（来自新方案）
  successCriteria: SuccessCriterion[];
  progress: GoalProgress;

  // 用户上下文
  userContext: Record<string, any>;
  createdAt: Date;
}

// 维度：定义探索空间（保留当前设计）
interface Dimension {
  id: string;
  goalId: string;
  name: string;                   // 如 "练习资源", "考试资讯"
  priority: PriorityLevel;        // 统一为枚举类型
  infoNeeds: InformationNeed[];   // 需要采集的信息
  sources: SourceConfig[];        // 信息源配置
}

// 优先级枚举（统一类型定义）
type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'background';

// 任务状态枚举（简化状态机）
// - blocked: 原 waiting_deps，更通用地表示被阻塞
// - waiting_user: 等待用户输入（交互式任务）
type TaskStatus = 'pending' | 'blocked' | 'ready' | 'in_progress' | 'waiting_user' | 'completed' | 'failed' | 'cancelled';

// 任务：可执行单元（融合新方案）
interface Task {
  id: string;
  goalId: string;
  dimensionId?: string;           // 可选关联到维度
  parentTaskId?: string;          // 支持嵌套

  title: string;
  description: string;

  // 执行类型（融合 5 种类型 + 保留探索型）
  type: 'one_time' | 'recurring' | 'event_triggered' | 'monitoring' | 'interactive' | 'exploration';

  // 优先级（统一枚举）
  priority: PriorityLevel;

  // 状态机（简化：移除冗余状态）
  status: TaskStatus;

  // 执行配置
  execution: ExecutionConfig;

  // 调度配置
  schedule?: ScheduleConfig;      // 周期性/事件触发配置

  // 关联知识（融合：执行时可复用 KnowledgeStore）
  relatedKnowledgeIds: string[];

  // 自适应配置
  adaptiveConfig: AdaptiveConfig;

  // 依赖关系
  dependencies: string[];

  createdAt: Date;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
}

// 执行配置
interface ExecutionConfig {
  agentPrompt: string;
  requiredTools: string[];
  requiredContext: string[];
  estimatedDuration?: number;

  // 融合：保留四级能力适配
  capabilityMode: 'direct' | 'composite' | 'creative' | 'escalate';
}

// 自适应配置
interface AdaptiveConfig {
  canAdjustDifficulty: boolean;
  canAdjustFrequency: boolean;
  successThreshold: number;       // 成功率低于此值时调整
  executionHistory: ExecutionRecord[];
}
```

### 2.2 模块流水线架构

```
触发系统 → ① 任务调度器 → ② 信息采集 → ③ 相关性裁决
      → ④ 行动推理 → ⑤ 执行前价值裁决 → ⑥ 能力适配 → ⑦ 执行器
      → ⑧ 执行后价值裁决 → ⑨ 结果合成 → ⑩ 反馈学习 → ⑪ 知识沉淀
```

**核心改进：**

1. **任务调度器作为流量入口**（新增）
   - 原 BackgroundLoop 升级为 TaskScheduler
   - 支持多类型任务（一次性/周期性/事件触发/监控/交互式/探索）
   - 智能调度：考虑用户空闲状态、任务优先级、依赖关系

2. **信息采集引擎**（保留当前 + 增强）
   - InfoCollector：主动探索信息源
   - SourceDiscoverer：自动发现新信息源
   - 新增：渐进式信息收集（对话式）

3. **相关性裁决**（保留）
   - RelevanceJudge：评估信息与目标的相关性
   - 过滤低价值信息

4. **洞察引擎**（保留）
   - InsightExtractor：从信息中提取洞察
   - ValueJudge：评估洞察价值

5. **行动推理**（保留）
   - ActionReasoner：生成行动建议

6. **执行前价值裁决**（保留）
   - PreActionGate：双门机制第一门
   - 评估行动预期价值，过滤低价值行动

7. **能力适配**（保留）
   - CapabilityResolver：四级适配（直接→组合→创造→求助）

8. **执行器**（复用现有 AgentSession）
   - 执行具体工具调用

9. **执行后价值裁决**（保留）
   - PostActionGate：双门机制第二门
   - 评估执行结果质量

10. **结果合成**（保留 + 增强）
    - ResultSynthesizer：合成最终结果
    - NotificationFormatter：格式化通知
    - IdleDetector：检测用户空闲
    - NotificationQueue：按优先级队列推送

11. **反馈学习**（新增）
    - 从用户反馈中自动调整任务参数

12. **知识沉淀**（保留 + 增强）
    - KnowledgeStore：沉淀到知识库
    - 供后续任务复用

---

## 三、核心模块详细设计

### 3.1 TaskScheduler — 任务调度器（新增）

```typescript
interface SchedulerConfig {
  maxConcurrent: number;          // 最大并发任务数，默认 3
  defaultPriority: PriorityLevel; // 默认任务优先级
  cycleIntervalMs: number;        // 调度周期，默认 60000 (1分钟)
  enableConcurrency: boolean;     // 是否启用并发执行
}

class TaskScheduler {
  private runningTasks = new Map<string, Promise<void>>();
  private config: SchedulerConfig;

  constructor(
    private taskStore: TaskStore,
    private executionPipeline: ExecutionPipeline,
    private notificationManager: NotificationManager,
    private userProfile: UserProfile,
    config?: Partial<SchedulerConfig>,
  ) {
    this.config = {
      maxConcurrent: 3,
      defaultPriority: 'medium',
      cycleIntervalMs: 60000,
      enableConcurrency: true,
      ...config,
    };
  }

  async runCycle(): Promise<void> {
    const now = Date.now();

    // 1. 获取所有就绪任务
    const readyTasks = await this.getReadyTasks(now);

    // 2. 按优先级和价值排序
    const prioritized = this.prioritizeTasks(readyTasks);

    // 3. 并发控制：限制同时运行的任务数
    if (this.config.enableConcurrency) {
      await this.executeWithConcurrency(prioritized);
    } else {
      // 串行执行（适用于资源受限环境）
      await this.executeSequential(prioritized);
    }
  }

  // 并发执行任务（带限流）
  private async executeWithConcurrency(tasks: Task[]): Promise<void> {
    const semaphore = new Semaphore(this.config.maxConcurrent);

    await Promise.all(
      tasks.map(async (task) => {
        await semaphore.acquire();
        try {
          await this.executeSingleTask(task);
        } finally {
          semaphore.release();
        }
      }),
    );
  }

  // 串行执行任务
  private async executeSequential(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await this.executeSingleTask(task);
    }
  }

  // 执行单个任务（封装状态管理）
  private async executeSingleTask(task: Task): Promise<void> {
    // 检查任务是否已在运行
    if (this.runningTasks.has(task.id)) {
      return;
    }

    // 检查用户是否空闲（避免打扰）
    if (!(await this.isGoodTimeToExecute(task))) {
      await this.deferTask(task);
      return;
    }

    // 创建执行 Promise 并追踪
    const executionPromise = this.runTaskWithState(task);
    this.runningTasks.set(task.id, executionPromise);

    try {
      await executionPromise;
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  // 带状态管理的任务执行
  private async runTaskWithState(task: Task): Promise<void> {
    try {
      // 更新任务状态为执行中
      await this.taskStore.updateTaskStatus(task.id, 'in_progress');

      // 执行任务流水线
      const result = await this.executionPipeline.run(task);

      // 根据结果更新任务状态
      const newStatus: TaskStatus = result.success ? 'completed' : 'failed';
      await this.taskStore.updateTaskStatus(task.id, newStatus, {
        result,
        completedAt: Date.now(),
      });

      // 自适应调整
      await this.updateTaskFromResult(task, result);
    } catch (error) {
      // 执行异常，标记为失败
      await this.taskStore.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async getReadyTasks(now: number): Promise<Task[]> {
    // 获取各种类型的就绪任务
    const [recurring, triggered, monitoring, oneTime, interactive, exploration] = await Promise.all([
      this.getReadyRecurringTasks(now),
      this.checkEventTriggers(now),
      this.checkMonitoringTasks(now),
      this.getReadyOneTimeTasks(),
      this.getReadyInteractiveTasks(),
      this.getReadyExplorationTasks(),
    ]);

    return [...recurring, ...triggered, ...monitoring, ...oneTime, ...interactive, ...exploration];
  }

  private async isGoodTimeToExecute(task: Task): Promise<boolean> {
    // 关键任务立即执行（不等待空闲）
    if (task.priority === 'critical') return true;

    // 高优先级任务在轻微打扰下也可执行
    if (task.priority === 'high') {
      return !this.isInQuietHours();
    }

    // 检查用户偏好
    const prefs = this.userProfile.preferences;

    // 检查免打扰时间
    if (this.isInQuietHours(prefs.quietHours)) return false;

    // 检查通知频率限制
    if (prefs.notificationFrequency === 'daily_digest') {
      return this.isDigestTime();
    }

    // 检测用户空闲（保留当前 IdleDetector 能力）
    return await this.idleDetector.isUserIdle();
  }

  // 自适应任务调整
  private async updateTaskFromResult(task: Task, result: ExecutionResult): Promise<void> {
    // 更新执行历史
    task.adaptiveConfig.executionHistory.push(result);

    // 自动调整参数
    if (task.type === 'recurring' && task.adaptiveConfig.canAdjustDifficulty) {
      await this.adaptivePlanner.autoAdjust(task);
    }

    // 计算下次执行时间
    if (task.type === 'recurring') {
      task.nextExecutionAt = this.calculateNextExecution(task);
    }

    await this.taskStore.updateTask(task);
  }
}
```

### 3.2 TaskDecomposer — 任务分解器（融合）

```typescript
class TaskDecomposer {
  async decomposeGoal(
    goal: Goal,
    dimensions: Dimension[],
    userContext: GoalUserContext,
  ): Promise<Task[]> {

    const tasks: Task[] = [];

    // 为每个维度创建探索型任务（保留当前）
    for (const dimension of dimensions) {
      tasks.push(this.createExplorationTask(goal, dimension));
    }

    // 基于目标类型和领域，创建结构化任务（新方案）
    const structuredTasks = await this.generateStructuredTasks(goal, userContext);
    tasks.push(...structuredTasks);

    // 建立任务依赖关系
    await this.establishDependencies(tasks);

    // 检测循环依赖
    const cycles = this.detectCircularDependencies(tasks);
    if (cycles.length > 0) {
      throw new Error(`检测到循环依赖: ${cycles.join(' -> ')}`);
    }

    return tasks;
  }

  // 建立任务依赖关系（补充实现）
  private async establishDependencies(tasks: Task[]): Promise<void> {
    // 构建任务ID映射
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) continue;

      for (const depId of task.dependencies) {
        const depTask = taskMap.get(depId);
        if (!depTask) {
          console.warn(`任务 ${task.id} 依赖的任务 ${depId} 不存在`);
          continue;
        }

        // 检查依赖关系是否合理
        if (depId === task.id) {
          throw new Error(`任务 ${task.id} 不能依赖自身`);
        }

        // 设置初始状态：如果依赖未完成，则标记为 blocked
        if (depTask.status !== 'completed') {
          task.status = 'blocked';
        }
      }
    }
  }

  // 检测循环依赖（拓扑排序）
  private detectCircularDependencies(tasks: Task[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // 构建图
    for (const task of tasks) {
      graph.set(task.id, task.dependencies || []);
      inDegree.set(task.id, (task.dependencies || []).length);
    }

    // Kahn 算法拓扑排序
    const queue: string[] = [];
    const visited = new Set<string>();

    // 找到入度为0的节点
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      visited.add(current);

      // 减少依赖当前节点的任务的入度
      for (const task of tasks) {
        if ((task.dependencies || []).includes(current)) {
          const newDegree = (inDegree.get(task.id) || 0) - 1;
          inDegree.set(task.id, newDegree);
          if (newDegree === 0) {
            queue.push(task.id);
          }
        }
      }
    }

    // 如果还有未访问的节点，说明存在环
    const unvisited = tasks.filter((t) => !visited.has(t.id));
    if (unvisited.length > 0) {
      return unvisited.map((t) => t.id);
    }

    return [];
  }

  // 检查依赖是否满足，更新任务状态
  async checkDependencies(taskId: string): Promise<boolean> {
    const task = await this.taskStore.getTask(taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    const depStatuses = await Promise.all(
      task.dependencies.map(async (depId) => {
        const dep = await this.taskStore.getTask(depId);
        return dep?.status === 'completed';
      }),
    );

    const allCompleted = depStatuses.every((s) => s);

    // 更新任务状态
    if (allCompleted && task.status === 'blocked') {
      await this.taskStore.updateTaskStatus(taskId, 'ready');
    }

    return allCompleted;
  }

  private async generateStructuredTasks(
    goal: Goal,
    userContext: GoalUserContext,
  ): Promise<Task[]> {
    const prompt = `
你是一个智能规划专家。需要为用户的目标制定全面的任务计划。

## 目标
${goal.title}
${goal.description}

## 已知信息
${JSON.stringify(userContext.collectedInfo)}

## 任务规划原则
1. 思考 Agent 可以从哪些角度帮助用户达成目标
2. 任务类型：
   - ONE_TIME：一次性完成（如：制定初始计划）
   - RECURRING：周期性重复（如：每日练习）
   - EVENT_TRIGGERED：特定条件触发（如：报名时间提醒）
   - MONITORING：持续监控（如：关注政策变化）
   - INTERACTIVE：需要与用户互动（如：收集偏好）
3. 主动性思维：
   - 信息策展：搜集和过滤有价值的信息
   - 风险预警：监控可能影响目标的外部因素
   - 进度提醒：定期 check-in
   - 资源推荐：发现和推荐有帮助的资源
4. 依赖关系：标明任务间的依赖
5. 自适应性：标记哪些任务需要动态调整

请输出任务列表，每个任务包含：id, title, type, priority, schedule(周期性任务), dependencies。
`;

    return await this.llm.generateStructured(prompt, TaskListSchema);
  }
}
```

### 3.3 ExecutionPipeline — 执行流水线（保留当前）

```typescript
class ExecutionPipeline {
  constructor(
    private infoCollector: InfoCollector,      // 信息采集
    private relevanceJudge: RelevanceJudge,    // 相关性裁决
    private insightExtractor: InsightExtractor, // 洞察提取
    private actionReasoner: ActionReasoner,    // 行动推理
    private preActionGate: PreActionGate,      // 执行前价值裁决
    private capabilityResolver: CapabilityResolver, // 能力适配
    private executor: Executor,                // 执行器
    private postActionGate: PostActionGate,    // 执行后价值裁决
    private resultSynthesizer: ResultSynthesizer, // 结果合成
  ) {}

  async run(task: Task): Promise<ExecutionResult> {
    const context: PipelineContext = {
      task,
      goal: await this.goalStore.getGoal(task.goalId),
      userProfile: await this.userProfileStore.getProfile(),
    };

    // 根据任务类型选择执行策略
    const strategy = this.getStrategyForTask(task);
    return await strategy.execute(context);
  }

  private getStrategyForTask(task: Task): ExecutionStrategy {
    switch (task.type) {
      case 'one_time':
        return new OneTimeStrategy(this);
      case 'recurring':
        return new RecurringStrategy(this);
      case 'event_triggered':
        return new EventTriggeredStrategy(this);
      case 'monitoring':
        return new MonitoringStrategy(this);
      case 'interactive':
        return new InteractiveStrategy(this);
      case 'exploration':
        return new ExplorationStrategy(this);
      default:
        return new DefaultStrategy(this);
    }
  }
}

// 周期性任务执行策略（融合新方案特点）
class RecurringStrategy implements ExecutionStrategy {
  constructor(private pipeline: ExecutionPipeline) {}

  async execute(context: PipelineContext): Promise<ExecutionResult> {
    const task = context.task;

    // 1. 从历史执行中提取模式
    const history = task.adaptiveConfig.executionHistory;
    const patterns = this.extractPatterns(history);

    // 2. 基于模板生成本次 prompt
    const basePrompt = task.execution.agentPrompt;
    const variationPrompt = this.generateVariation(basePrompt, patterns, history.length);

    // 3. 基于上次表现调整难度
    const adjustedPrompt = this.adjustDifficulty(variationPrompt, history);

    // 4. 执行任务流水线
    return this.pipeline.executeWithPrompt(adjustedPrompt, context);
  }

  // 提取历史执行模式（补充实现）
  private extractPatterns(history: ExecutionRecord[]): ExecutionPattern[] {
    if (history.length < 2) return [];

    const patterns: ExecutionPattern[] = [];

    // 分析成功率趋势
    const recent = history.slice(-5);
    const successCount = recent.filter((h) => h.status === 'success').length;
    const trend = successCount / recent.length;

    patterns.push({
      type: 'success_trend',
      value: trend,
      description: trend > 0.7 ? 'improving' : trend < 0.4 ? 'declining' : 'stable',
    });

    // 分析执行时间模式
    const durations = history.filter((h) => h.duration).map((h) => h.duration!);
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      patterns.push({
        type: 'avg_duration',
        value: avgDuration,
        description: `${Math.round(avgDuration / 1000)}s average`,
      });
    }

    // 分析用户反馈模式
    const ratings = history.filter((h) => h.userRating).map((h) => h.userRating!);
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      patterns.push({
        type: 'satisfaction',
        value: avgRating / 5, // 归一化到 0-1
        description: avgRating >= 4 ? 'high' : avgRating >= 3 ? 'medium' : 'low',
      });
    }

    // 分析完成度模式
    const completions = history
      .filter((h) => h.completionRate !== undefined)
      .map((h) => h.completionRate!);
    if (completions.length > 0) {
      const avgCompletion = completions.reduce((a, b) => a + b, 0) / completions.length;
      patterns.push({
        type: 'completion_rate',
        value: avgCompletion,
        description: `${Math.round(avgCompletion * 100)}% completion`,
      });
    }

    return patterns;
  }

  // 计算成功率（补充实现）
  private calculateSuccessRate(history: ExecutionRecord[]): number {
    if (history.length === 0) return 0.5; // 默认中等成功率

    const recent = history.slice(-10); // 最近 10 次
    const successes = recent.filter(
      (h) => h.status === 'success' || h.userRating && h.userRating >= 4
    ).length;

    return successes / recent.length;
  }

  private generateVariation(basePrompt: string, patterns: ExecutionPattern[], occurrence: number): string {
    const patternSummary = patterns.map((p) => `- ${p.type}: ${p.description}`).join('\n');

    return `${basePrompt}

## 本次执行上下文
这是第 ${occurrence} 次执行。

历史执行模式分析：
${patternSummary || '暂无足够历史数据'}

请确保本次内容与之前有所不同，根据上述模式调整内容深度和风格。
`;
  }

  private adjustDifficulty(prompt: string, history: ExecutionRecord[]): string {
    const successRate = this.calculateSuccessRate(history);

    if (successRate < 0.5) {
      return `${prompt}

【难度调整】用户近期表现需要更多支持：
- 降低挑战难度，提供更多指导和示例
- 分解复杂步骤，给予更清晰的指引
- 增加鼓励性语言`;
    } else if (successRate > 0.85) {
      return `${prompt}

【难度调整】用户表现优秀，可以适当提高挑战：
- 增加内容的深度和广度
- 鼓励用户进行更多自主探索
- 提供更高级的资源或进阶内容`;
    }

    return prompt;
  }
}

// 执行模式类型定义
interface ExecutionPattern {
  type: string;
  value: number;
  description: string;
}

interface ExecutionRecord {
  timestamp: number;
  status: 'success' | 'failed' | 'cancelled';
  duration?: number;
  userRating?: number; // 1-5 星
  completionRate?: number; // 0-1
  tokenUsage?: number;
  summary?: string;
}

// 探索型任务策略（保留当前能力）
class ExplorationStrategy implements ExecutionStrategy {
  async execute(context: PipelineContext): Promise<ExecutionResult> {
    const { task, goal } = context;
    const dimension = goal.dimensions.find(d => d.id === task.dimensionId);

    if (!dimension) throw new Error('Dimension not found');

    // 1. 信息采集
    const collectedInfo = await this.pipeline.infoCollector.collect(dimension.infoNeeds, dimension.sources);

    // 2. 相关性裁决
    const relevantInfo = await this.pipeline.relevanceJudge.filter(collectedInfo, goal);

    // 3. 洞察提取
    const insights = await this.pipeline.insightExtractor.extract(relevantInfo, goal);

    // 4. 价值评估
    const valuedInsights = await this.pipeline.insightExtractor.valueJudge(insights);

    // 5. 行动推理
    const actions = await this.pipeline.actionReasoner.reason(valuedInsights, goal);

    // 6. 执行前裁决
    const approvedActions = await this.pipeline.preActionGate.filter(actions);

    // 7. 能力适配 + 执行
    const results: ExecutionResult[] = [];
    for (const action of approvedActions) {
      const capability = await this.pipeline.capabilityResolver.resolve(action);
      const result = await this.pipeline.executor.execute(capability);
      results.push(result);
    }

    // 8. 执行后裁决 + 合成
    const valuableResults = await this.pipeline.postActionGate.filter(results);
    const synthesis = await this.pipeline.resultSynthesizer.synthesize(valuableResults);

    // 9. 沉淀知识
    await this.knowledgeStore.addEntry({
      goalId: goal.id,
      taskId: task.id,
      content: synthesis,
      category: 'exploration',
    });

    return synthesis;
  }
}
```

### 3.4 AdaptivePlanner — 自适应规划器（新增）

```typescript
class AdaptivePlanner {
  async autoAdjust(task: Task): Promise<void> {
    const history = task.adaptiveConfig.executionHistory;

    if (history.length < 3) return; // 数据不足

    const assessment = await this.assessPerformance(history);

    // 根据评估结果调整
    if (assessment.successRate < task.adaptiveConfig.successThreshold) {
      // 表现不佳：降低难度或频率
      if (task.adaptiveConfig.canAdjustDifficulty) {
        await this.reduceDifficulty(task);
      }
      if (task.adaptiveConfig.canAdjustFrequency) {
        await this.reduceFrequency(task);
      }
    } else if (assessment.successRate > 0.9 && assessment.userSatisfaction === 'high') {
      // 表现优秀：提高难度
      if (task.adaptiveConfig.canAdjustDifficulty) {
        await this.increaseDifficulty(task);
      }
    }

    // 生成调整报告
    if (assessment.requiresMajorAdjustment) {
      await this.notifyUserOfAdjustment(task, assessment);
    }
  }

  private async assessPerformance(history: ExecutionRecord[]): Promise<PerformanceAssessment> {
    const prompt = `
分析以下任务执行历史，评估表现：
${JSON.stringify(history.slice(-10))}

请评估：
1. 成功率（用户完成度）
2. 用户满意度（从反馈推断）
3. 是否需要重大调整
4. 建议的调整方向
`;

    return await this.llm.generateStructured(prompt, AssessmentSchema);
  }
}
```

### 3.5 ContextGatherer — 渐进式信息收集（新增）

```typescript
class ContextGatherer {
  async generateNextQuestions(
    goal: Goal,
    collectedInfo: Record<string, any>,
  ): Promise<QuestionBatch> {
    const prompt = `
目标是：${goal.title}
已收集信息：${JSON.stringify(collectedInfo)}
目标所需关键信息：${JSON.stringify(goal.userContext.requiredInfo || {})}

请生成下一轮要问的问题（1-2 个）：
1. 像对话一样自然，不要像问卷
2. 基于用户已回答的内容追问
3. 优先问影响规划的关键信息
4. 避免一次问太多
`;

    return await this.llm.generateStructured(prompt, QuestionBatchSchema);
  }

  async extractInfoFromResponse(
    userResponse: string,
    pendingQuestions: Question[],
  ): Promise<Record<string, any>> {
    const prompt = `
从用户回答中提取结构化信息。
待确认的问题：${JSON.stringify(pendingQuestions)}
用户回答：${userResponse}

请提取关键信息并结构化输出。
`;

    return await this.llm.generateStructured(prompt, ExtractedInfoSchema);
  }
}
```

---

## 四、存储方案（SQLite）

```sql
-- 目标表
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'gathering_info',
  priority TEXT DEFAULT 'medium',  -- critical | high | medium | low
  deadline INTEGER,
  created_at INTEGER DEFAULT (unixepoch() * 1000),  -- 毫秒精度
  updated_at INTEGER DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER DEFAULT NULL,  -- 软删除时间戳（NULL 表示未删除）
  user_context TEXT,  -- JSON
  success_criteria TEXT,  -- JSON
  progress TEXT,  -- JSON
  milestones TEXT  -- JSON
);

-- 维度表（保留当前）
CREATE TABLE dimensions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id),
  name TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',  -- critical | high | medium | low
  info_needs TEXT,  -- JSON
  sources TEXT,  -- JSON
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER DEFAULT NULL  -- 软删除
);

-- 任务表（融合后）
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id),
  dimension_id TEXT REFERENCES dimensions(id),
  parent_task_id TEXT REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- one_time | recurring | event_triggered | monitoring | interactive | exploration
  priority TEXT DEFAULT 'medium',  -- critical | high | medium | low | background
  status TEXT DEFAULT 'pending',  -- pending | blocked | ready | in_progress | waiting_user | completed | failed | cancelled

  -- 执行配置
  execution_config TEXT,  -- JSON: { agentPrompt, requiredTools, capabilityMode }

  -- 调度配置
  schedule TEXT,  -- JSON: { type: 'cron' | 'interval', expression, timezone }
  next_execution_at INTEGER,

  -- 自适应配置
  adaptive_config TEXT,  -- JSON

  -- 关联知识
  related_knowledge_ids TEXT,  -- JSON

  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000),
  last_executed_at INTEGER,
  deleted_at INTEGER DEFAULT NULL  -- 软删除
);

-- 任务依赖关系表（独立出来便于查询和DAG检测）
CREATE TABLE task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id),
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (task_id, depends_on_task_id)
);

-- 任务执行记录表
CREATE TABLE task_executions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  goal_id TEXT NOT NULL REFERENCES goals(id),
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,  -- success | failed | cancelled
  result TEXT,  -- JSON
  summary TEXT,
  token_usage INTEGER,
  user_feedback TEXT,  -- 用户文本反馈
  feedback_rating INTEGER CHECK (feedback_rating BETWEEN 1 AND 5),  -- 1-5 星评分
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- 知识条目表
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  goal_id TEXT REFERENCES goals(id),
  task_id TEXT REFERENCES tasks(id),
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,  -- JSON
  importance REAL DEFAULT 0.5,
  source_url TEXT,
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000),
  deleted_at INTEGER DEFAULT NULL  -- 软删除
);

-- 用户画像表
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  preferences TEXT,  -- JSON
  interaction_pattern TEXT,  -- JSON
  goal_contexts TEXT,  -- JSON
  created_at INTEGER DEFAULT (unixepoch() * 1000),
  updated_at INTEGER DEFAULT (unixepoch() * 1000)
);

-- 索引
-- 任务查询索引
CREATE INDEX idx_tasks_goal ON tasks(goal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_ready ON tasks(status, next_execution_at, priority) WHERE deleted_at IS NULL AND status IN ('ready', 'pending');
CREATE INDEX idx_tasks_next_execution ON tasks(next_execution_at, priority) WHERE deleted_at IS NULL AND status NOT IN ('completed', 'failed', 'cancelled');
CREATE INDEX idx_tasks_type ON tasks(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE deleted_at IS NULL;

-- 依赖查询索引
CREATE INDEX idx_task_deps_on ON task_dependencies(depends_on_task_id);

-- 执行记录索引
CREATE INDEX idx_executions_task ON task_executions(task_id, started_at DESC);
CREATE INDEX idx_executions_goal ON task_executions(goal_id, started_at DESC);

-- 知识库索引
CREATE INDEX idx_knowledge_goal ON knowledge_entries(goal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_task ON knowledge_entries(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_category ON knowledge_entries(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_knowledge_importance ON knowledge_entries(importance DESC) WHERE deleted_at IS NULL;

-- 软删除查询视图（可选，用于简化查询）
-- CREATE VIEW active_tasks AS SELECT * FROM tasks WHERE deleted_at IS NULL;
-- CREATE VIEW active_goals AS SELECT * FROM goals WHERE deleted_at IS NULL;
```

---

## 五、完整工作流程

### 5.1 目标创建流程

```
用户输入目标
    ↓
GoalParser 解析目标骨架
    ↓
创建 Goal 记录（状态：gathering_info）
    ↓
生成维度列表（探索空间）
    ↓
生成信息收集任务（Interactive 类型）
    ↓
ContextGatherer 生成第一轮问题（1-2个）
    ↓
等待用户回答
    ↓
提取信息 → 判断是否足够？
    ↓ 否
继续提问 ...
    ↓ 是
调用 TaskDecomposer 分解任务
    ↓
创建所有任务记录
    ↓
Goal 状态更新为 active
    ↓
TaskScheduler 开始调度
```

### 5.2 任务执行流程

```
TaskScheduler 运行周期
    ↓
获取就绪任务列表
    ↓
检查用户状态（空闲/免打扰）
    ↓
按优先级排序
    ↓
对每个任务：
    ↓
判断任务类型
    ↓
Recurring/Exploration/Interactive/...
    ↓
调用对应执行策略
    ↓
执行 9 模块流水线
    ↓
更新执行历史
    ↓
AdaptivePlanner 自动调整（如有必要）
    ↓
沉淀知识到 KnowledgeStore
    ↓
通知用户（通过 IdleDetector + NotificationQueue）
```

### 5.3 自适应调整流程

```
周期性任务执行 N 次后
    ↓
AdaptivePlanner 评估执行历史
    ↓
计算成功率、用户满意度
    ↓
成功率 < 阈值？
    ↓ 是
降低难度/频率
    ↓
成功率 > 90% 且满意度高？
    ↓ 是
提高难度/增加挑战
    ↓
重大调整？
    ↓ 是
通知用户确认
    ↓
更新任务配置
```

---

## 六、关键设计决策

| 决策点 | 建议方案 | 理由 |
|--------|----------|------|
| **维度 vs 任务** | 保留维度作为"探索空间"，任务作为"执行单元" | 维度指导 Agent 思考方向，任务是可执行的实体 |
| **调度频率** | 周期性任务用 cron，探索性任务用智能间隔 | 避免过于频繁的 LLM 调用 |
| **知识复用** | 任务执行结果沉淀到 KnowledgeStore | 支持跨任务学习，减少重复计算 |
| **用户打扰** | 保留 IdleDetector + 通知分级 | 关键任务立即通知，普通任务等待空闲 |
| **工具创造** | 保留 CapabilityResolver 四级适配 | 支持无法预测的任务需求 |
| **价值判断** | 保留 Pre/Post Action Gate 双门机制 | 过滤低价值行动和结果 |
| **自适应** | 自动微调参数，重大调整需用户确认 | 平衡智能化与用户控制 |
| **并发控制** | 信号量模式限制最大并发数 | 防止资源耗尽，保证系统稳定 |
| **软删除** | 所有核心表增加 deleted_at 字段 | 支持数据恢复，便于审计和调试 |
| **依赖管理** | 独立 task_dependencies 表 | 支持复杂依赖查询和循环检测 |

---

## 七、实施路线图

### Phase 1：任务调度层（3周）

| 任务 | 工作量 | 产出 |
|------|--------|------|
| 数据模型（Task, Goal 融合） | 3天 | TypeScript 接口 + SQLite schema（含软删除） |
| TaskScheduler 实现 | 4天 | 任务调度器，支持并发控制、多类型任务 |
| TaskStore 持久化 | 3天 | SQLite 存储层（含软删除、依赖表） |
| 任务依赖管理 | 2天 | DAG检测、依赖状态自动更新 |
| 与现有 BackgroundLoop 集成 | 3天 | 保持接口兼容，渐进式迁移 |
| 基础测试覆盖 | 2天 | 单元测试 + 集成测试 |

**验收标准：**
- 用户可以创建目标
- 任务能被正确调度和持久化
- 并发控制有效（maxConcurrent 限制生效）
- 软删除功能正常（数据标记删除而非物理删除）
- 任务依赖关系正确处理（循环依赖检测、自动状态更新）
- 不影响现有功能

### Phase 2：执行策略层（2周）

| 任务 | 工作量 | 产出 |
|------|--------|------|
| ExecutionPipeline 改造 | 3天 | 按任务类型分发执行策略 |
| RecurringStrategy | 2天 | 周期性任务执行策略 |
| InteractiveStrategy | 2天 | 渐进式信息收集策略 |
| ExplorationStrategy（复用） | 2天 | 信息探索策略（包装现有） |
| 任务状态机 | 1天 | 完整状态流转 |

**验收标准：**
- 不同类型任务使用对应策略执行
- 周期性任务能按时触发
- 交互式任务支持对话式信息收集

### Phase 3：自适应层（1.5周）

| 任务 | 工作量 | 产出 |
|------|--------|------|
| AdaptivePlanner | 3天 | 自动评估和调整 |
| ContextGatherer | 2天 | 渐进式信息收集 |
| 反馈闭环 | 2天 | 用户反馈→调整 |

**验收标准：**
- 任务能根据执行历史自动调整参数
- 重大调整需用户确认
- 信息收集像对话而非问卷

### Phase 4：整合测试（1.5周）

| 任务 | 工作量 | 产出 |
|------|--------|------|
| 端到端测试 | 3天 | 全流程验证 |
| 性能优化 | 2天 | 减少不必要的 LLM 调用 |
| 异常处理 | 2天 | 容错和恢复机制 |

---

## 八、技术栈

- **语言**：TypeScript
- **数据库**：SQLite（better-sqlite3）
- **调度**：node-cron / 自定义调度器
- **LLM**：Anthropic Claude / OpenAI（通过 ModelRegistry）
- **现有基础**：保留所有当前 core 模块

---

## 九、风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 改造范围过大 | 引入回归问题 | 保持现有接口不变，内部增加任务调度层；渐进式改造 |
| 周期性任务 LLM 调用过多 | 成本激增 | 使用轻量模型执行周期性任务，复杂分析才用强模型；模板化执行减少 LLM 调用 |
| 自适应调整过于激进 | 用户体验不稳定 | 重大调整需用户确认，只自动微调参数 |
| 多目标资源竞争 | 重要目标被延迟 | 引入优先级权重和预算机制 |
| 知识库膨胀 | 查询效率下降 | 定期压缩和归档，分层存储（热/温/冷） |

---

## 十、预期收益

1. **用户体验提升**
   - Agent 从被动响应变为主动服务
   - 周期性任务自动执行，减少用户操作
   - 自适应调整让计划更贴合用户实际情况

2. **执行效率提升**
   - 任务类型化，复用执行策略
   - 知识沉淀和复用，减少重复计算
   - 智能调度避免无效执行

3. **系统能力扩展**
   - 支持长期目标追踪
   - 支持多目标并行管理
   - 支持事件驱动和监控型任务

4. **保留现有优势**
   - 深度探索能力（维度+信息采集）
   - 工具创造性（四级能力适配）
   - 价值过滤（双门裁决）
   - 用户打扰克制（空闲检测）

---

## 十一、文件结构建议

```
src/core/goal-driven/
├── types/                         # 新增：集中类型定义
│   ├── index.ts                   # 统一导出所有类型
│   ├── task.types.ts              # Task, TaskStatus, PriorityLevel
│   ├── goal.types.ts              # Goal, Dimension, SuccessCriterion
│   ├── execution.types.ts         # ExecutionRecord, ExecutionPattern
│   └── pipeline.types.ts          # PipelineContext, ExecutionResult
├── task/                          # 任务管理层
│   ├── task-scheduler.ts          # 任务调度器（流量入口，含并发控制）
│   ├── task-store.ts              # 任务持久化（含软删除）
│   ├── task-decomposer.ts         # 目标/维度拆解为任务
│   ├── task-dependency.ts         # 任务依赖管理（DAG检测）
│   └── semaphore.ts               # 并发控制信号量
├── pipeline/                      # 新增：执行流水线层
│   ├── execution-pipeline.ts      # 主流水线协调器
│   ├── pipeline-context.ts        # 执行上下文管理
│   └── strategies/                # 各类型任务的执行策略
│       ├── base-strategy.ts       # 策略基类
│       ├── one-time-strategy.ts
│       ├── recurring-strategy.ts  # 周期性任务，带自适应调整
│       ├── exploration-strategy.ts # 信息探索（复用 InfoCollector）
│       ├── interactive-strategy.ts # 渐进式信息收集
│       ├── event-triggered-strategy.ts
│       └── monitoring-strategy.ts
├── planning/                      # 规划层
│   ├── context-gatherer.ts        # 渐进式信息收集
│   ├── goal-parser.ts             # 目标解析（增强版）
│   └── adaptive-planner.ts        # 自适应规划
├── info-engine/                   # 保留：信息采集引擎
├── insight-engine/                # 保留：洞察引擎
├── action-pipeline/               # 保留：行动管道
│   ├── pre-action-gate.ts
│   ├── post-action-gate.ts
│   └── capability-resolver.ts     # 四级能力适配
├── goal-manager/                  # 保留：目标管理
│   └── goal-store.ts              # 目标持久化（含软删除）
├── knowledge/                     # 保留：知识存储
│   ├── knowledge-store.ts         # 知识条目持久化（含软删除）
│   └── knowledge-retriever.ts     # 知识检索
├── result-synthesis/              # 保留：结果合成
│   ├── result-synthesizer.ts
│   ├── notification-formatter.ts
│   └── notification-queue.ts
├── background-loop/               # 改造：BackgroundLoop → TaskScheduler 集成
└── utils/                         # 工具函数
    ├── id-generator.ts
    ├── date-utils.ts
    ├── validation.ts
    └── semaphore.ts               # 并发控制信号量
```

### Semaphore 信号量实现

```typescript
// src/core/goal-driven/utils/semaphore.ts
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.permits++;
    }
  }

  get availablePermits(): number {
    return this.permits;
  }

  get waitingCount(): number {
    return this.queue.length;
  }
}
```

---

## 十二、总结

本融合方案的核心价值在于：

1. **取长补短**
   - 保留当前项目的深度探索能力和价值过滤机制
   - 引入新方案的任务调度模型和自适应规划

2. **渐进式改造**
   - 以 TaskScheduler 为流量入口，复用现有 9 模块流水线
   - 不影响现有功能，逐步增强

3. **长期价值**
   - 支持真正的长期目标管理
   - Agent 从工具升级为伙伴

总工期：约 7 周（Phases 1-4），每阶段有可独立验证的交付物。
