# Goal-Driven Agent 使用指南（改造后）

## 实现状态

### 已完成组件 ✅

| 组件 | 文件路径 | 状态 | 说明 |
|------|----------|------|------|
| SubGoal 类型 | `src/core/goal-driven/types/sub-goal.ts` | ✅ | 子目标完整类型定义 |
| Task 扩展 | `src/core/goal-driven/types/index.ts` | ✅ | hierarchyLevel, expectedResult |
| Question 扩展 | `src/core/goal-driven/types/index.ts` | ✅ | multichoice, ChoiceOption |
| SubGoalStore | `src/core/goal-driven/sub-goal/sub-goal-store.ts` | ✅ | JSON 持久化，依赖检查 |
| SubGoalPlanner | `src/core/goal-driven/planning/sub-goal-planner.ts` | ✅ | 子目标拆解、Review、重新规划 |
| TaskPlanner | `src/core/goal-driven/planning/task-planner.ts` | ✅ | 任务生成、Review、调整 |
| PlanPresenter | `src/core/goal-driven/planning/plan-presenter.ts` | ✅ | 计划汇报、用户确认 |
| ValueAssessor | `src/core/goal-driven/output-layer/value-assessor.ts` | ✅ | 价值评估、智能推送决策 |
| GoalOrchestrator | `src/core/goal-driven/orchestrator/goal-orchestrator.ts` | ✅ | 10 步流程编排 |
| ContextGatherer 扩展 | `src/core/goal-driven/planning/context-gatherer.ts` | ✅ | validateResponse 方法 |
| UnifiedTaskScheduler 扩展 | `src/core/goal-driven/scheduler/unified-task-scheduler.ts` | ✅ | 集成 ValueAssessor |

### 10 步流程实现状态

```
✅ Phase 1: 目标理解与信息收集 (ContextGatherer)
✅ Phase 2-3: 子目标拆解与关系梳理 (SubGoalPlanner)
✅ Phase 4-5: 任务生成与 Review (TaskPlanner)
✅ Phase 6: 计划汇报与确认 (PlanPresenter)
✅ Phase 7: 启动执行 (UnifiedTaskScheduler)
✅ Phase 8-9: 监控执行与智能推送 (ValueAssessor)
✅ Phase 10: 定期 Review (GoalOrchestrator)
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 编译 TypeScript

```bash
npm run build
```

### 3. 运行测试

```bash
npm test
```

### 4. 运行完整示例

```bash
node demo-orchestrator.js
```

## 使用方法

### 基础用法：使用 GoalOrchestrator 走完整流程

```javascript
const {
  GoalStore,
  TaskStore,
  SubGoalStore,
  KnowledgeStore,
  NotificationQueue,
  TaskDependencyGraph,
  UnifiedTaskScheduler,
  ContextGatherer,
  SuccessCriteriaChecker,
  GoalOrchestrator,
  ValueAssessor,
} = require('./dist/core/goal-driven/index');

// 1. 初始化存储
const goalStore = new GoalStore();
const taskStore = new TaskStore();
const subGoalStore = new SubGoalStore();
const knowledgeStore = new KnowledgeStore();
const notificationQueue = new NotificationQueue();

await goalStore.init();
await taskStore.init();
await subGoalStore.init();
await knowledgeStore.init();

// 2. 创建核心组件
const dependencyGraph = new TaskDependencyGraph(taskStore);
const contextGatherer = new ContextGatherer(taskStore, notificationQueue, llm);
const successCriteriaChecker = new SuccessCriteriaChecker(
  goalStore, taskStore, knowledgeStore, notificationQueue, llm
);
const valueAssessor = new ValueAssessor(taskStore, goalStore, knowledgeStore, llm);

// 3. 创建调度器
const scheduler = new UnifiedTaskScheduler(
  taskStore,
  goalStore,
  knowledgeStore,
  notificationQueue,
  dependencyGraph,
  executionPipeline,
  idleDetector,
  userProfile,
  valueAssessor
);

// 4. 创建 Orchestrator
const orchestrator = new GoalOrchestrator(
  goalStore,
  taskStore,
  knowledgeStore,
  notificationQueue,
  contextGatherer,
  scheduler,
  successCriteriaChecker,
  llm,
  idleDetector,
  userProfile,
  subGoalStore
);

await orchestrator.init();

// 5. 启动目标流程
const { goalId, interactiveTaskId } = await orchestrator.startGoal('我想买一辆SUV');

// 6. 处理用户回复
const result = await orchestrator.handleInfoCollectionResponse(goalId, '预算20万');

// 7. 拆解子目标
const subGoals = await orchestrator.decomposeSubGoals(goalId);

// 8. 生成任务
const { tasks, reviewResults } = await orchestrator.generateAndReviewTasks(goalId);

// 9. 计划汇报
const { report, confirmed } = await orchestrator.presentPlanForConfirmation(goalId);

// 10. 启动执行
await orchestrator.startExecution(goalId);

// 11. 定期 Review
const review = await orchestrator.performReview(goalId);
```

### 高级用法：单独使用各组件

#### 单独使用 SubGoalPlanner

```javascript
const { SubGoalPlanner, SubGoalStore } = require('./dist/core/goal-driven/index');

const subGoalStore = new SubGoalStore();
await subGoalStore.init();

const planner = new SubGoalPlanner(goalStore, subGoalStore, llm);

// 拆解子目标
const subGoals = await planner.decomposeSubGoals(goalId, {
  预算: '20万',
  车型: 'SUV',
});

// Review 子目标
const review = await planner.reviewSubGoals(goalId);

// 重新规划
const newSubGoals = await planner.replanSubGoals(goalId, '反馈信息');
```

#### 单独使用 TaskPlanner

```javascript
const { TaskPlanner } = require('./dist/core/goal-driven/index');

const planner = new TaskPlanner(taskStore, subGoalStore, llm);

// 为子目标生成任务
const tasks = await planner.generateTasksForSubGoal(subGoalId, {
  goalTitle: '购车目标',
  userContext: { 预算: '20万' },
});

// Review 任务
const reviews = await planner.reviewTasks(taskIds, {
  goalTitle: '购车目标',
  subGoalTitle: '车型调研',
});

// 调整任务
await planner.adjustTasks(reviews, '用户反馈');
```

#### 单独使用 ValueAssessor

```javascript
const { ValueAssessor } = require('./dist/core/goal-driven/index');

const assessor = new ValueAssessor(taskStore, goalStore, knowledgeStore, llm);

// 评估单个任务
const assessment = await assessor.assessValue(taskId, executionResult);
console.log(assessment.valueScore); // 0-1
console.log(assessment.shouldNotify); // true/false

// 批量评估
const assessments = await assessor.batchAssess([
  { taskId: 'task-1', result: result1 },
  { taskId: 'task-2', result: result2 },
]);

// 检查新颖性
const novelty = await assessor.checkNovelty('新内容', goalId);
```

## 关键类型定义

### 任务层级

```typescript
type TaskHierarchyLevel = 'task' | 'sub_task' | 'action';

interface Task {
  // ... 其他字段
  hierarchyLevel?: TaskHierarchyLevel;
  expectedResult?: {
    type: 'information' | 'deliverable' | 'decision' | 'action' | 'confirmation';
    description: string;
    format: 'json' | 'markdown' | 'table' | 'text' | 'code';
  };
  actualResult?: {
    content: string;
    type: string;
    timestamp: number;
    quality: number;
  };
}
```

### 子目标

```typescript
interface SubGoal {
  id: string;
  goalId: string;
  name: string;
  description: string;
  priority: PriorityLevel;
  status: 'pending' | 'active' | 'completed' | 'failed';
  weight: number; // 对最终目标的贡献权重
  dependencies: string[]; // 依赖的其他子目标ID
  estimatedDuration?: number;
  deadline?: number;
  taskIds: string[];
  successCriteria: SuccessCriterion[];
}
```

### 问题类型（支持自定义输入）

```typescript
interface ChoiceOption {
  value: string;
  label: string;
  allowCustom?: boolean; // 是否允许自定义输入
}

interface Question {
  id: string;
  question: string;
  purpose: string;
  expectedType: 'string' | 'number' | 'choice' | 'boolean' | 'multichoice';
  choices?: ChoiceOption[];
}
```

## 需要接入的外部依赖

当前实现使用了接口/抽象类，需要接入实际实现：

### 1. LLM Channel

```typescript
interface LLMChannel {
  complete(prompt: string, options?: Record<string, unknown>): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }>;

  chatJSON<T>(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
  }): Promise<T>;
}
```

### 2. Execution Pipeline

```typescript
interface ExecutionPipeline {
  run(task: Task): Promise<ExecutionResult>;
}
```

### 3. Idle Detector

```typescript
interface IdleDetector {
  isUserIdle(): Promise<boolean>;
  getLastActivityTime(): number;
}
```

## 示例 Mock 实现

参考 `demo-orchestrator.js` 中的 Mock 实现：

- `MockLLM` - 模拟 LLM 响应
- `MockExecutionPipeline` - 模拟任务执行
- `MockIdleDetector` - 模拟空闲检测

## 文件结构

```
src/core/goal-driven/
├── types/
│   ├── index.ts           # 核心类型（Task, Goal, 等）
│   └── sub-goal.ts        # SubGoal 类型定义
├── task/
│   ├── task-store.ts      # Task 存储
│   └── task-dependency.ts # 依赖图管理
├── sub-goal/
│   └── sub-goal-store.ts  # SubGoal 存储
├── goal-manager/
│   └── goal-store.ts      # Goal 存储
├── planning/
│   ├── context-gatherer.ts        # 信息收集
│   ├── success-criteria-checker.ts # 成功标准检查
│   ├── sub-goal-planner.ts        # 子目标规划 ⭐新增
│   ├── task-planner.ts            # 任务规划 ⭐新增
│   └── plan-presenter.ts          # 计划汇报 ⭐新增
├── scheduler/
│   └── unified-task-scheduler.ts  # 统一调度器（扩展）
├── output-layer/
│   ├── notification-queue.ts      # 通知队列
│   └── value-assessor.ts          # 价值评估 ⭐新增
├── orchestrator/
│   └── goal-orchestrator.ts       # 流程编排 ⭐新增
└── index.ts               # 统一导出
```

## 下一步建议

1. **接入真实 LLM** - 实现 LLMChannel 接口（OpenAI/Claude/等）
2. **接入真实执行管道** - 实现 ExecutionPipeline 接口
3. **实现真实空闲检测** - 基于用户活动检测
4. **添加更多测试** - 针对新增组件的单元测试
5. **优化提示词** - 根据实际使用效果调整 LLM 提示词
6. **添加可视化** - 计划展示、进度跟踪 UI
