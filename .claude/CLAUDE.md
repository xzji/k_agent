# Goal-Driven Agent 使用指南

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行测试

```bash
npm test
```

### 3. 运行示例

```bash
npm run example
```

## 核心概念

### 目标 (Goal)

目标是用户想要达成的事情。每个目标包含：
- **维度 (Dimensions)**: 探索空间定义
- **成功标准 (SuccessCriteria)**: 如何知道目标已达成
- **任务 (Tasks)**: 具体的执行单元

### 任务类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `exploration` | 信息收集 | 搜索雅思备考资料 |
| `one_time` | 一次性执行 | 创建学习计划 |
| `recurring` | 周期性执行 | 每日学习提醒 |
| `interactive` | 需要用户输入 | 询问偏好设置 |
| `monitoring` | 持续监控 | 监控报名开放时间 |
| `event_triggered` | 事件触发 | 考试日期临近提醒 |

### 任务状态

```
pending → blocked → ready → in_progress → completed
              ↑         ↓
              └─────────┘ (依赖满足时)

in_progress → waiting_user → ready → completed
               (交互式任务)
```

## 基础使用

### 创建目标

```typescript
import { GoalStore } from './src/core/goal-driven';

const goalStore = new GoalStore();
await goalStore.init();

const goal = await goalStore.createGoal({
  title: '准备雅思考试',
  description: '3个月内通过雅思考试',
  status: 'active',
  priority: 'high',
  dimensions: [
    {
      id: 'dim-1',
      goalId: '',
      name: '学习资源',
      priority: 'high',
      infoNeeds: [
        { id: 'in-1', description: '最佳备考书籍', priority: 'high' },
      ],
      sources: [{ id: 'src-1', type: 'web_search', config: {}, priority: 'high' }],
      status: 'pending',
      createdAt: Date.now(),
    },
  ],
  successCriteria: [
    { id: 'sc-1', description: '完成3本备考书', type: 'deliverable', completed: false },
    { id: 'sc-2', description: '模拟考达到7分', type: 'condition', completed: false },
  ],
  progress: { completedCriteria: 0, totalCriteria: 2, percentage: 0 },
  userContext: { collectedInfo: {} },
});
```

### 创建任务

```typescript
import { TaskStore, TaskDependencyGraph } from './src/core/goal-driven';

const taskStore = new TaskStore();
const depGraph = new TaskDependencyGraph(taskStore);

// 创建任务
const task = await taskStore.createTask({
  goalId: goal.id,
  title: '搜索备考资料',
  description: '搜索并整理雅思备考资源',
  type: 'exploration',
  priority: 'high',
  status: 'ready',
  execution: {
    agentPrompt: '搜索最佳雅思备考资源',
    requiredTools: ['web_search'],
    requiredContext: [],
    capabilityMode: 'composite',
  },
  adaptiveConfig: {
    canAdjustDifficulty: false,
    canAdjustFrequency: false,
    successThreshold: 0.5,
    executionHistory: [],
  },
  relatedKnowledgeIds: [],
  dependencies: [],
  executionHistory: [],
});

// 更新依赖状态
await depGraph.updateAllTaskStatuses(goal.id);
```

### 启动调度器

```typescript
import { UnifiedTaskScheduler } from './src/core/goal-driven';

const scheduler = new UnifiedTaskScheduler(
  taskStore,
  goalStore,
  knowledgeStore,
  notificationQueue,
  dependencyGraph,
  executionPipeline,
  idleDetector,
  userProfile,
  {
    maxConcurrent: 3,
    cycleIntervalMs: 60000, // 1分钟
  }
);

await scheduler.start();
```

### 处理交互式任务

```typescript
// 用户回复后
await scheduler.handleUserResponse(taskId, "我英语四级水平，每天能学2小时");
```

## 知识管理

### 保存知识

```typescript
import { KnowledgeStore } from './src/core/goal-driven';

const knowledgeStore = new KnowledgeStore();
await knowledgeStore.init();

const entry = await knowledgeStore.save({
  goalId: goal.id,
  taskId: task.id,
  content: '《剑桥雅思真题》是备考必备书籍',
  category: 'resource',
  tags: ['书籍', '必备', '官方'],
  importance: 0.95,
  relatedDimensionIds: ['dim-1'],
});
```

### 搜索知识

```typescript
// 获取目标相关的知识
const goalKnowledge = await knowledgeStore.getByGoal(goal.id);

// 关键词搜索
const results = await knowledgeStore.search('雅思 书籍', {
  maxResults: 5,
  category: 'resource',
});
```

### 在Prompt中注入知识

```typescript
const enhancedPrompt = await knowledgeStore.injectKnowledgeIntoPrompt(
  task,
  basePrompt,
  { maxResults: 3 }
);
```

## 成功标准检查

```typescript
import { SuccessCriteriaChecker } from './src/core/goal-driven';

const checker = new SuccessCriteriaChecker(
  goalStore,
  taskStore,
  knowledgeStore,
  notificationQueue,
  llm
);

// 评估进度
const report = await checker.evaluateGoalProgress(goal.id);
console.log(`进度: ${report.percentage}%`);

// 处理用户确认
if (report.canAutoComplete) {
  await checker.handleCompletionConfirmation(goal.id, 'complete');
}

// 处理未完成反馈
await checker.handleIncompleteFeedback(
  goal.id,
  "还需要更多口语练习资料"
);
```

## 存储结构

```
~/.pi/agent/goal-driven/
├── goals/
│   └── goals.json              # 目标定义
├── tasks/
│   └── {goalId}/
│       └── tasks.json          # 任务列表
└── knowledge/
    └── global.jsonl            # 知识条目（追加式）
```

## API 参考

### TaskStore

- `createTask(taskData)` - 创建任务
- `getTask(taskId)` - 获取任务
- `getTasksByGoal(goalId)` - 获取目标的所有任务
- `getReadyTasks()` - 获取就绪任务
- `updateStatus(taskId, status, metadata)` - 更新任务状态
- `addExecutionRecord(taskId, record)` - 添加执行记录

### TaskDependencyGraph

- `detectCircularDependencies(tasks)` - 检测循环依赖
- `getExecutionOrder(tasks)` - 获取执行顺序
- `checkDependencies(taskId)` - 检查依赖是否满足
- `updateAllTaskStatuses(goalId)` - 更新所有任务状态

### UnifiedTaskScheduler

- `start()` - 启动调度器
- `stop()` - 停止调度器
- `handleUserResponse(taskId, response)` - 处理用户回复
- `triggerTask(taskId)` - 手动触发任务

### ContextGatherer

- `startInteractiveGathering(goal)` - 开始交互式收集
- `processUserResponse(taskId, response)` - 处理用户回复
- `getCollectedInfoSummary(goalId)` - 获取收集的信息摘要

### SuccessCriteriaChecker

- `evaluateGoalProgress(goalId)` - 评估目标进度
- `handleCompletionConfirmation(goalId, choice, feedback)` - 处理完成确认
- `handleIncompleteFeedback(goalId, feedback)` - 处理未完成反馈

### KnowledgeStore

- `save(entry)` - 保存知识条目
- `getByGoal(goalId)` - 按目标获取知识
- `search(query, options)` - 搜索知识
- `getRelevantKnowledgeForTask(task, query)` - 获取任务相关知识
- `injectKnowledgeIntoPrompt(task, basePrompt)` - 注入知识到Prompt

## 测试

运行单元测试：

```bash
npm test
```

测试覆盖：
- TaskStore: 创建、更新、状态管理、执行记录
- TaskDependencyGraph: 循环检测、执行顺序、依赖检查
- GoalStore: 目标创建、维度管理、进度更新
- KnowledgeStore: 保存、搜索、删除
- NotificationQueue: 优先级排序、入队出队

## 注意事项

1. **存储位置**: 默认使用 `~/.pi/agent/goal-driven/`，可通过 `GOAL_DRIVEN_STORAGE` 环境变量修改
2. **调度频率**: 默认每60秒检查一次任务，可通过 `cycleIntervalMs` 配置
3. **并发控制**: 默认最多同时执行3个任务，可通过 `maxConcurrent` 配置
4. **交互式任务**: 需要处理 `waiting_user` 状态，用户回复后调用 `handleUserResponse`

## 扩展开发

### 添加自定义任务类型

1. 在 `TaskType` 中添加新类型
2. 在 `UnifiedTaskScheduler.executeByType` 中添加处理逻辑
3. 实现对应的执行策略

### 添加自定义知识源

扩展 `KnowledgeStore`，添加新的检索方法。

## 故障排除

### 任务不执行

检查：
1. 任务状态是否为 `ready`
2. 依赖是否满足
3. 调度器是否正在运行

### 依赖问题

使用 `detectCircularDependencies` 检测循环依赖。

### 存储问题

确保有写入权限到 `~/.pi/agent/goal-driven/` 目录。
