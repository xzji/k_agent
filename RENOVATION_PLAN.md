# Goal-Driven Agent 改造方案

## 背景与目标

当前Goal-Driven Agent实现了一个基础的任务调度框架，但缺少用户交互流程中的关键环节。根据用户描述的10步预期流程，需要对现有架构进行扩展，增加子目标层、任务Review机制、计划汇报、价值评估等核心能力。

## 当前实现状态分析

### 已实现的组件

| 组件 | 文件路径 | 状态 | 说明 |
|------|----------|------|------|
| TaskStore | `src/core/goal-driven/task/task-store.ts` | ✅ 完整 | 任务CRUD、状态管理 |
| TaskDependencyGraph | `src/core/goal-driven/task/task-dependency.ts` | ✅ 完整 | 依赖检测、拓扑排序 |
| GoalStore | `src/core/goal-driven/goal-manager/goal-store.ts` | ✅ 完整 | 目标CRUD、进度更新 |
| KnowledgeStore | `src/core/goal-driven/knowledge/knowledge-store.ts` | ✅ 完整 | 知识存储、检索、注入 |
| UnifiedTaskScheduler | `src/core/goal-driven/scheduler/unified-task-scheduler.ts` | ⚠️ 部分 | 缺少价值评估、智能推送 |
| ContextGatherer | `src/core/goal-driven/planning/context-gatherer.ts` | ⚠️ 部分 | 缺少选项+自定义输入支持 |
| SuccessCriteriaChecker | `src/core/goal-driven/planning/success-criteria-checker.ts` | ⚠️ 部分 | 缺少子目标Review、任务调整 |
| NotificationQueue | `src/core/goal-driven/output-layer/notification-queue.ts` | ✅ 完整 | 通知队列管理 |

### 核心类型定义 (types/index.ts)

已存在的关键类型：
- `Task`, `Goal`, `Dimension` - 基础模型
- `TaskType`: exploration, one_time, recurring, monitoring, event_triggered, interactive
- `TaskStatus`: pending, blocked, ready, in_progress, waiting_user, completed, failed, cancelled
- `ExecutionResult`, `ExecutionRecord` - 执行结果
- `Notification` - 通知

### 缺失的关键能力

1. **SubGoal（子目标）层** - 当前只有Goal和Task两层
2. **任务Review机制** - 生成任务后没有Review环节
3. **计划汇报与用户确认流程** - 没有完整的计划汇报
4. **任务结果价值评估** - 推送前没有价值判断
5. **定期整体Review机制** - 缺少子目标和任务的动态调整

---

## 改造方案

### 第一阶段：核心模型扩展

#### 1.1 新增 SubGoal（子目标）类型

**文件**: `src/core/goal-driven/types/index.ts` (新增类型定义)

```typescript
// 新增类型
export interface SubGoal {
  id: string;
  goalId: string;
  name: string;
  description: string;
  priority: PriorityLevel;
  status: 'pending' | 'active' | 'completed' | 'failed';

  // 与最终目标的关系
  completionRequirement: 'all' | 'any' | 'majority'; // 需要全部/任一/多数完成
  weight: number; // 对最终目标的贡献权重 0-1

  // 依赖关系
  dependencies: string[]; // 依赖的其他子目标ID

  // 执行时间
  estimatedDuration?: number; // 预计耗时（小时）
  deadline?: number; // 截止时间

  // 关联的任务ID
  taskIds: string[];

  // 成功标准
  successCriteria: SuccessCriterion[];

  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
}

// Goal扩展
export interface Goal {
  // ... 现有字段
  subGoals?: string[]; // 子目标ID列表
  subGoalCompletionMode: 'all' | 'any' | 'weighted'; // 最终目标达成条件
}
```

#### 1.2 新增任务Review相关类型

```typescript
// 任务Review结果
export interface TaskReviewResult {
  taskId: string;
  goalContribution: 'critical' | 'high' | 'medium' | 'low';
  subGoalContribution: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  aligned: boolean; // 是否与最终目标对齐
  suggestions?: string[]; // 改进建议
}

// 任务预期结果定义
export interface TaskExpectedResult {
  type: 'information' | 'deliverable' | 'decision' | 'action' | 'confirmation';
  description: string;
  format: string; // 期望格式：json, markdown, table, text等
  validationCriteria?: string[]; // 验证结果是否合格的标准
}

// 任务定义扩展
export interface Task {
  // ... 现有字段
  subGoalId?: string; // 关联的子目标
  expectedResult: TaskExpectedResult;
  actualResult?: {
    content: string;
    type: string;
    timestamp: number;
    quality: number; // 质量评分 0-1
  };
}
```

#### 1.3 新增价值评估类型

```typescript
// 任务结果价值评估
export interface ValueAssessment {
  taskId: string;
  valueScore: number; // 0-1 价值分数
  valueDimensions: {
    relevance: number; // 与目标的相关性
    timeliness: number; // 时效性
    novelty: number; // 新颖性（是否重复信息）
    actionability: number; // 可操作性
  };
  reasoning: string;
  shouldNotify: boolean;
  priority: PriorityLevel;
}
```

---

### 第二阶段：新增核心组件

#### 2.1 SubGoalManager（子目标管理器）

**新文件**: `src/core/goal-driven/planning/sub-goal-manager.ts`

**职责**:
- 基于Goal拆解SubGoal
- 管理SubGoal之间的依赖关系
- 评估SubGoal完成度
- 在Review时调整SubGoal划分

**Public Methods**:
```typescript
export class SubGoalManager {
  constructor(
    goalStore: IGoalStore,
    taskStore: ITaskStore,
    llm: LLMChannel
  );

  // 拆解子目标
  async decomposeSubGoals(
    goalId: string,
    userContext: Record<string, unknown>
  ): Promise<SubGoal[]>;

  // 更新子目标
  async updateSubGoal(
    subGoalId: string,
    updates: Partial<SubGoal>
  ): Promise<SubGoal>;

  // 检查子目标完成状态
  async evaluateSubGoalCompletion(subGoalId: string): Promise<{
    completed: boolean;
    percentage: number;
    blockingReasons?: string[];
  }>;

  // Review并调整子目标
  async reviewSubGoals(goalId: string): Promise<{
    adjustments: Array<{
      type: 'split' | 'merge' | 'reorder' | 'delete' | 'add';
      subGoalId: string;
      reason: string;
      newSubGoals?: SubGoal[];
    }>;
    requiresUserConfirmation: boolean;
  }>;

  // 重新规划子目标（根据新的上下文）
  async replanSubGoals(
    goalId: string,
    feedback: string
  ): Promise<SubGoal[]>;
}
```

#### 2.2 TaskPlanner（任务规划器）

**新文件**: `src/core/goal-driven/planning/task-planner.ts`

**职责**:
- 为SubGoal生成Task
- 任务Review（判断与目标的对齐度）
- 任务调整（优先级、周期等）

**Public Methods**:
```typescript
export class TaskPlanner {
  constructor(
    taskStore: ITaskStore,
    subGoalManager: SubGoalManager,
    llm: LLMChannel
  );

  // 为子目标生成任务
  async generateTasksForSubGoal(
    subGoalId: string,
    options?: {
      confirmFrequency?: boolean; // 是否确认频率
      maxTasks?: number;
    }
  ): Promise<Task[]>;

  // Review任务（生成后调用）
  async reviewTasks(
    taskIds: string[],
    goalContext: {
      goalTitle: string;
      subGoalTitle: string;
      goalDescription: string;
    }
  ): Promise<TaskReviewResult[]>;

  // 调整任务（根据Review结果）
  async adjustTasks(
    reviewResults: TaskReviewResult[],
    userFeedback?: string
  ): Promise<Task[]>;

  // 重新规划任务（根据新的上下文）
  async replanTasks(
    subGoalId: string,
    feedback: string
  ): Promise<Task[]>;
}
```

#### 2.3 PlanPresenter（计划汇报器）

**新文件**: `src/core/goal-driven/planning/plan-presenter.ts`

**职责**:
- 生成完整的计划汇报
- 向用户展示计划并获取确认
- 处理用户的计划修改请求

**Public Methods**:
```typescript
export class PlanPresenter {
  constructor(
    goalStore: IGoalStore,
    subGoalManager: SubGoalManager,
    taskStore: ITaskStore,
    notificationQueue: INotificationQueue,
    llm: LLMChannel
  );

  // 生成计划汇报
  async generatePlanReport(goalId: string): Promise<{
    summary: string;
    subGoals: Array<{
      name: string;
      description: string;
      priority: string;
      tasks: Task[];
    }>;
    timeline: string;
    notificationStrategy: string;
  }>;

  // 向用户展示计划并获取确认
  async presentPlanForConfirmation(
    goalId: string
  ): Promise<{
    confirmed: boolean;
    modifications?: string[];
  }>;

  // 处理计划修改
  async handlePlanModification(
    goalId: string,
    modificationRequest: string
  ): Promise<void>;
}
```

#### 2.4 ValueAssessor（价值评估器）

**新文件**: `src/core/goal-driven/output-layer/value-assessor.ts`

**职责**:
- 评估任务结果的价值
- 决定是否推送
- 确定推送优先级

**Public Methods**:
```typescript
export class ValueAssessor {
  constructor(
    taskStore: ITaskStore,
    goalStore: IGoalStore,
    knowledgeStore: IKnowledgeStore,
    llm: LLMChannel
  );

  // 评估任务结果价值
  async assessValue(
    taskId: string,
    executionResult: ExecutionResult
  ): Promise<ValueAssessment>;

  // 批量评估
  async batchAssess(
    results: Array<{ taskId: string; result: ExecutionResult }>
  ): Promise<ValueAssessment[]>;

  // 检查是否是重复/相似信息
  async checkNovelty(
    content: string,
    goalId: string
  ): Promise<number>; // 0-1 新颖度分数
}
```

#### 2.5 GoalReviewEngine（目标Review引擎）

**新文件**: `src/core/goal-driven/planning/goal-review-engine.ts`

**职责**:
- 定期Review整体目标进度
- 评估子目标划分合理性
- 评估任务规划合理性
- 生成调整建议

**Public Methods**:
```typescript
export class GoalReviewEngine {
  constructor(
    goalStore: IGoalStore,
    subGoalManager: SubGoalManager,
    taskPlanner: TaskPlanner,
    taskStore: ITaskStore,
    successCriteriaChecker: SuccessCriteriaChecker,
    llm: LLMChannel
  );

  // 执行完整的Goal Review
  async performGoalReview(goalId: string): Promise<{
    goalProgress: {
      percentage: number;
      status: string;
    };
    subGoalAssessment: Array<{
      subGoalId: string;
      status: 'on_track' | 'at_risk' | 'off_track';
      completionPercentage: number;
      issues?: string[];
    }>;
    taskAssessment: {
      total: number;
      completed: number;
      completionRate: number;
      lowValueTasks: string[];
      missingTasks?: string[];
    };
    recommendations: Array<{
      type: 'adjust_subgoal' | 'adjust_task' | 'add_task' | 'remove_task';
      description: string;
      reason: string;
    }>;
    requiresUserConfirmation: boolean;
  }>;

  // 检查是否需要Review
  async shouldReview(goalId: string): Promise<{
    shouldReview: boolean;
    reason?: string;
  }>;

  // 应用调整（用户确认后）
  async applyAdjustments(
    goalId: string,
    adjustments: any[]
  ): Promise<void>;
}
```

---

### 第三阶段：扩展现有组件

#### 3.1 扩展 ContextGatherer

**文件**: `src/core/goal-driven/planning/context-gatherer.ts`

**新增能力**:
- 支持选项+自定义输入的问题类型

```typescript
// 扩展现有类型
export interface Question {
  id: string;
  question: string;
  purpose: string;
  expectedType: 'string' | 'number' | 'choice' | 'boolean' | 'multichoice';
  choices?: Array<{
    value: string;
    label: string;
    allowCustom?: boolean; // 是否允许自定义输入
  }>;
}

// ContextGatherer新增方法
export class ContextGatherer {
  // 现有方法...

  // 验证用户输入是否完整回答了问题
  async validateResponse(
    question: Question,
    response: string
  ): Promise<{
    valid: boolean;
    extractedValue: unknown;
    needsClarification?: boolean;
    clarificationQuestion?: string;
  }>;
}
```

#### 3.2 扩展 UnifiedTaskScheduler

**文件**: `src/core/goal-driven/scheduler/unified-task-scheduler.ts`

**修改点**:

1. 注入ValueAssessor，在任务完成后评估价值
2. 智能推送逻辑（仅在用户空闲时推送有价值的信息）

```typescript
export class UnifiedTaskScheduler {
  constructor(
    // ... 现有参数
    valueAssessor: ValueAssessor, // 新增
    idleDetector: IdleDetector   // 确保有闲置检测
  );

  // 修改任务完成后的处理
  private async runTaskWithState(unifiedTask: UnifiedTask): Promise<void> {
    // ... 执行逻辑

    // 新增：评估价值并决定是否推送
    if (result.success && result.output) {
      const assessment = await this.valueAssessor.assessValue(task.id, result);
      if (assessment.shouldNotify) {
        await this.enqueueSmartNotification(task, result, assessment);
      }
    }
  }

  // 智能推送（等待用户空闲）
  private async enqueueSmartNotification(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): Promise<void> {
    // 等待用户空闲
    const isIdle = await this.waitForUserIdle();

    // 构造推送内容
    const notification = this.buildValueBasedNotification(task, result, assessment);

    this.notificationQueue.enqueue(notification);
  }

  // 等待用户空闲
  private async waitForUserIdle(timeoutMs: number = 300000): Promise<boolean> {
    const checkInterval = 10000; // 10秒检查一次
    const startTime = now();

    while (now() - startTime < timeoutMs) {
      if (await this.idleDetector.isUserIdle()) {
        return true;
      }
      await sleep(checkInterval);
    }

    return false; // 超时
  }

  // 构造基于价值的通知
  private buildValueBasedNotification(
    task: Task,
    result: ExecutionResult,
    assessment: ValueAssessment
  ): Notification {
    return {
      type: 'report',
      priority: assessment.priority,
      title: `[${task.title}] 执行结果`,
      content: `
## 针对目标
${task.goalTitle}

## 产出物
${result.output}

## 为什么推送
${assessment.reasoning}

## 价值评分
${Math.round(assessment.valueScore * 100)}/100
      `.trim(),
      goalId: task.goalId,
      taskId: task.id,
    };
  }
}
```

#### 3.3 扩展 ExecutionResult 验证

**文件**: `src/core/goal-driven/types/index.ts`

**新增执行结果验证**:

```typescript
// 执行结果类型
export type ExecutionResultType =
  | 'information'      // 搜集到的信息
  | 'document'         // 文档/报告
  | 'code'             // 代码/脚本
  | 'data'             // 结构化数据
  | 'analysis'         // 分析结果
  | 'recommendation'   // 建议/推荐
  | 'alert'            // 提醒/警告
  | 'confirmation';    // 确认/审批

export interface ExecutionResult {
  success: boolean;
  output?: string;
  outputType?: ExecutionResultType;
  outputFormat?: string; // markdown, json, html等
  error?: string;
  tokenUsage?: number;
  duration: number;
  knowledgeEntries?: KnowledgeEntry[];

  // 新增：结果元数据
  metadata?: {
    summary?: string;        // 结果摘要
    keyPoints?: string[];    // 关键要点
    actionItems?: string[];  // 行动项
  };
}
```

---

### 第四阶段：流程编排

#### 4.1 完整的用户交互流程实现

创建一个新的编排层组件来串联整个流程：

**新文件**: `src/core/goal-driven/orchestrator/goal-orchestrator.ts`

```typescript
export class GoalOrchestrator {
  constructor(
    private goalStore: GoalStore,
    private taskStore: TaskStore,
    private contextGatherer: ContextGatherer,
    private subGoalManager: SubGoalManager,
    private taskPlanner: TaskPlanner,
    private planPresenter: PlanPresenter,
    private scheduler: UnifiedTaskScheduler,
    private goalReviewEngine: GoalReviewEngine,
    private successCriteriaChecker: SuccessCriteriaChecker
  ) {}

  // ===== 阶段1：目标理解与信息收集 =====
  async phase1_CollectGoalInfo(userGoal: string): Promise<{
    goalId: string;
    interactiveTaskId: string;
  }> {
    // 1. 创建目标
    const goal = await this.goalStore.createGoal({
      title: userGoal,
      description: '',
      status: 'gathering_info',
      priority: 'medium',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    // 2. 启动交互式信息收集
    const interactiveTask = await this.contextGatherer.startInteractiveGathering(goal);

    return { goalId: goal.id, interactiveTaskId: interactiveTask.id };
  }

  // 处理用户回复（信息收集阶段）
  async handleInfoCollectionResponse(
    taskId: string,
    response: string
  ): Promise<{
    hasEnoughInfo: boolean;
    nextQuestions?: QuestionBatch;
    collectedInfo: Record<string, unknown>;
  }> {
    return this.contextGatherer.processUserResponse(taskId, response);
  }

  // ===== 阶段2&3：子目标拆解与关系梳理 =====
  async phase2_DecomposeSubGoals(goalId: string): Promise<SubGoal[]> {
    const goal = await this.goalStore.getGoal(goalId);
    if (!goal) throw new Error('Goal not found');

    // 拆解子目标
    const subGoals = await this.subGoalManager.decomposeSubGoals(
      goalId,
      goal.userContext.collectedInfo
    );

    // 更新Goal状态
    await this.goalStore.updateGoal(goalId, {
      status: 'planning',
      subGoals: subGoals.map(sg => sg.id),
    });

    return subGoals;
  }

  // ===== 阶段4&5：任务生成与Review =====
  async phase4_GenerateAndReviewTasks(
    subGoalIds: string[],
    options?: { confirmFrequency?: boolean }
  ): Promise<{
    tasks: Task[];
    reviewResults: TaskReviewResult[];
  }> {
    const allTasks: Task[] = [];
    const allReviews: TaskReviewResult[] = [];

    for (const subGoalId of subGoalIds) {
      // 生成任务
      const tasks = await this.taskPlanner.generateTasksForSubGoal(subGoalId, options);
      allTasks.push(...tasks);

      // Review任务
      const reviews = await this.taskPlanner.reviewTasks(
        tasks.map(t => t.id),
        { /* goal context */ }
      );
      allReviews.push(...reviews);

      // 如果有不对齐的任务，进行调整
      const misaligned = reviews.filter(r => !r.aligned);
      if (misaligned.length > 0) {
        await this.taskPlanner.adjustTasks(misaligned);
      }
    }

    return { tasks: allTasks, reviewResults: allReviews };
  }

  // ===== 阶段6：计划汇报与确认 =====
  async phase6_PresentPlan(goalId: string): Promise<{
    confirmed: boolean;
    modifications?: string[];
  }> {
    return this.planPresenter.presentPlanForConfirmation(goalId);
  }

  // ===== 阶段7：启动执行 =====
  async phase7_StartExecution(goalId: string): Promise<void> {
    // 更新Goal状态
    await this.goalStore.updateGoal(goalId, { status: 'active' });

    // 启动调度器
    if (!this.scheduler.isRunning()) {
      await this.scheduler.start();
    }
  }

  // ===== 阶段10：定期Review =====
  async phase10_PerformReview(goalId: string): Promise<{
    reviewResult: Awaited<ReturnType<GoalReviewEngine['performGoalReview']>>;
    userConfirmed: boolean;
  }> {
    // 执行Review
    const reviewResult = await this.goalReviewEngine.performGoalReview(goalId);

    // 如果需要调整，获取用户确认
    if (reviewResult.requiresUserConfirmation) {
      // 通过通知队列发送确认请求
      // 等待用户响应...
      const userConfirmed = await this.waitForUserConfirmation(goalId);

      if (userConfirmed) {
        await this.goalReviewEngine.applyAdjustments(
          goalId,
          reviewResult.recommendations
        );
      }

      return { reviewResult, userConfirmed };
    }

    return { reviewResult, userConfirmed: true };
  }
}
```

---

## 文件变更清单

### 新增文件 (8个)

1. `src/core/goal-driven/planning/sub-goal-manager.ts` - 子目标管理
2. `src/core/goal-driven/planning/task-planner.ts` - 任务规划器
3. `src/core/goal-driven/planning/plan-presenter.ts` - 计划汇报器
4. `src/core/goal-driven/planning/goal-review-engine.ts` - 目标Review引擎
5. `src/core/goal-driven/output-layer/value-assessor.ts` - 价值评估器
6. `src/core/goal-driven/orchestrator/goal-orchestrator.ts` - 流程编排器

### 修改文件 (4个)

1. `src/core/goal-driven/types/index.ts` - 新增SubGoal、TaskExpectedResult等类型
2. `src/core/goal-driven/planning/context-gatherer.ts` - 扩展问题类型支持
3. `src/core/goal-driven/scheduler/unified-task-scheduler.ts` - 集成ValueAssessor
4. `src/core/goal-driven/index.ts` - 导出新增组件

---

## 验证方案

### 单元测试

1. **SubGoalManager测试**:
   - 子目标拆解逻辑
   - 依赖检测
   - 完成度评估

2. **TaskPlanner测试**:
   - 任务生成
   - 任务Review
   - 任务调整

3. **ValueAssessor测试**:
   - 价值评估算法
   - 新颖度检测
   - 推送决策

4. **GoalReviewEngine测试**:
   - Review流程
   - 调整建议生成

### 集成测试

使用 `buy_car_demo_showcase.js` 场景进行端到端测试：

```typescript
// 测试用例：购车场景
async function testBuyCarScenario() {
  const orchestrator = new GoalOrchestrator(...);

  // 阶段1：目标收集
  const { goalId, interactiveTaskId } = await orchestrator.phase1_CollectGoalInfo(
    '我想买一辆SUV，预算20万以内，油车，要省油'
  );

  // 模拟用户回答背景问题
  await orchestrator.handleInfoCollectionResponse(interactiveTaskId, '...');

  // 阶段2：拆解子目标
  const subGoals = await orchestrator.phase2_DecomposeSubGoals(goalId);
  expect(subGoals.length).toBeGreaterThan(0);

  // 阶段4：生成任务
  const { tasks, reviewResults } = await orchestrator.phase4_GenerateAndReviewTasks(
    subGoals.map(sg => sg.id)
  );
  expect(tasks.length).toBeGreaterThan(0);
  expect(reviewResults.every(r => r.aligned)).toBe(true);

  // 阶段6：计划汇报
  const { confirmed } = await orchestrator.phase6_PresentPlan(goalId);

  // 阶段7：启动执行
  await orchestrator.phase7_StartExecution(goalId);

  // 验证调度器运行
  expect(scheduler.isRunning()).toBe(true);
}
```

---

## 实施建议

### 实施顺序

**阶段1**：类型定义扩展（1天）
- 先定义好所有新增类型，确保类型一致性

**阶段2**：核心组件开发（3-4天）
- SubGoalManager → TaskPlanner → PlanPresenter → ValueAssessor → GoalReviewEngine
- 每个组件开发完立即写单元测试

**阶段3**：扩展现有组件（1-2天）
- 修改ContextGatherer、UnifiedTaskScheduler

**阶段4**：流程编排与集成（2天）
- GoalOrchestrator实现
- 端到端测试

**总计**：约7-9天工作量

### 风险点

1. **LLM调用成本** - Review和价值评估都需要LLM，需要控制调用频率
2. **复杂度增加** - 新增一层抽象，可能增加理解和维护难度
3. **用户体验** - 过多的Review和确认可能让用户感到繁琐

### 缓解措施

1. 缓存Review结果，避免重复评估
2. 提供配置项，允许调整Review频率
3. 批量处理低价值通知，减少打扰
