/**
 * Goal-Driven Agent - 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TaskStore,
  TaskDependencyGraph,
  GoalStore,
  KnowledgeStore,
  NotificationQueue,
} from '../index';
import { now, generateId } from '../utils';

// 使用内存存储进行测试
const TEST_STORAGE = '/tmp/test-goal-driven';

describe('TaskStore', () => {
  let taskStore: TaskStore;

  beforeEach(async () => {
    taskStore = new TaskStore(TEST_STORAGE);
    await taskStore.init();
    await taskStore.clearAll();
  });

  it('应该创建任务', async () => {
    const task = await taskStore.createTask({
      goalId: 'goal-1',
      title: '测试任务',
      description: '这是一个测试任务',
      type: 'one_time',
      priority: 'high',
      status: 'ready',
      execution: {
        agentPrompt: '执行任务',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    expect(task.id).toBeDefined();
    expect(task.title).toBe('测试任务');
    expect(task.status).toBe('ready');
  });

  it('应该更新任务状态', async () => {
    const task = await taskStore.createTask({
      goalId: 'goal-1',
      title: '测试任务',
      description: '测试描述',
      type: 'one_time',
      priority: 'medium',
      status: 'pending',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    const updated = await taskStore.updateStatus(task.id, 'in_progress');
    expect(updated.status).toBe('in_progress');
    expect(updated.lastExecutedAt).toBeDefined();
  });

  it('应该获取就绪任务', async () => {
    await taskStore.createTask({
      goalId: 'goal-1',
      title: '就绪任务',
      description: '应该被选中',
      type: 'one_time',
      priority: 'high',
      status: 'ready',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    await taskStore.createTask({
      goalId: 'goal-1',
      title: '阻塞任务',
      description: '不应该被选中',
      type: 'one_time',
      priority: 'low',
      status: 'blocked',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    const readyTasks = await taskStore.getReadyTasks();
    expect(readyTasks).toHaveLength(1);
    expect(readyTasks[0].title).toBe('就绪任务');
  });

  it('应该添加执行记录', async () => {
    const task = await taskStore.createTask({
      goalId: 'goal-1',
      title: '测试任务',
      description: '测试',
      type: 'one_time',
      priority: 'medium',
      status: 'ready',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    await taskStore.addExecutionRecord(task.id, {
      timestamp: now(),
      status: 'success',
      duration: 5000,
      summary: '执行成功',
    });

    const updated = await taskStore.getTask(task.id);
    expect(updated?.executionHistory).toHaveLength(1);
    expect(updated?.executionHistory[0].status).toBe('success');
  });
});

describe('TaskDependencyGraph', () => {
  let taskStore: TaskStore;
  let depGraph: TaskDependencyGraph;

  beforeEach(async () => {
    taskStore = new TaskStore(TEST_STORAGE);
    await taskStore.init();
    await taskStore.clearAll();
    depGraph = new TaskDependencyGraph(taskStore);
  });

  it('应该检测循环依赖', () => {
    const tasks = [
      {
        id: 'task-1',
        goalId: 'goal-1',
        title: '任务1',
        description: '测试',
        type: 'one_time' as const,
        priority: 'medium' as const,
        status: 'ready' as const,
        execution: {
          agentPrompt: 'test',
          requiredTools: [],
          requiredContext: [],
          capabilityMode: 'direct' as const,
        },
        adaptiveConfig: {
          canAdjustDifficulty: false,
          canAdjustFrequency: false,
          successThreshold: 0.5,
          executionHistory: [],
        },
        relatedKnowledgeIds: [],
        dependencies: ['task-2'],
        executionHistory: [],
        createdAt: now(),
      },
      {
        id: 'task-2',
        goalId: 'goal-1',
        title: '任务2',
        description: '测试',
        type: 'one_time' as const,
        priority: 'medium' as const,
        status: 'blocked' as const,
        execution: {
          agentPrompt: 'test',
          requiredTools: [],
          requiredContext: [],
          capabilityMode: 'direct' as const,
        },
        adaptiveConfig: {
          canAdjustDifficulty: false,
          canAdjustFrequency: false,
          successThreshold: 0.5,
          executionHistory: [],
        },
        relatedKnowledgeIds: [],
        dependencies: ['task-1'], // 循环依赖
        executionHistory: [],
        createdAt: now(),
      },
    ];

    const cycles = depGraph.detectCircularDependencies(tasks);
    expect(cycles).toHaveLength(2);
    expect(cycles).toContain('task-1');
    expect(cycles).toContain('task-2');
  });

  it('应该正确计算执行顺序', () => {
    const tasks = [
      {
        id: 'task-a',
        goalId: 'goal-1',
        title: '任务A',
        description: '测试',
        type: 'one_time' as const,
        priority: 'medium' as const,
        status: 'ready' as const,
        execution: {
          agentPrompt: 'test',
          requiredTools: [],
          requiredContext: [],
          capabilityMode: 'direct' as const,
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
        createdAt: now(),
      },
      {
        id: 'task-b',
        goalId: 'goal-1',
        title: '任务B',
        description: '测试',
        type: 'one_time' as const,
        priority: 'medium' as const,
        status: 'blocked' as const,
        execution: {
          agentPrompt: 'test',
          requiredTools: [],
          requiredContext: [],
          capabilityMode: 'direct' as const,
        },
        adaptiveConfig: {
          canAdjustDifficulty: false,
          canAdjustFrequency: false,
          successThreshold: 0.5,
          executionHistory: [],
        },
        relatedKnowledgeIds: [],
        dependencies: ['task-a'],
        executionHistory: [],
        createdAt: now(),
      },
      {
        id: 'task-c',
        goalId: 'goal-1',
        title: '任务C',
        description: '测试',
        type: 'one_time' as const,
        priority: 'medium' as const,
        status: 'blocked' as const,
        execution: {
          agentPrompt: 'test',
          requiredTools: [],
          requiredContext: [],
          capabilityMode: 'direct' as const,
        },
        adaptiveConfig: {
          canAdjustDifficulty: false,
          canAdjustFrequency: false,
          successThreshold: 0.5,
          executionHistory: [],
        },
        relatedKnowledgeIds: [],
        dependencies: ['task-b'],
        executionHistory: [],
        createdAt: now(),
      },
    ];

    const order = depGraph.getExecutionOrder(tasks);
    expect(order).toEqual(['task-a', 'task-b', 'task-c']);
  });

  it('应该检查依赖是否满足', async () => {
    const task1 = await taskStore.createTask({
      goalId: 'goal-1',
      title: '任务1',
      description: '测试',
      type: 'one_time',
      priority: 'medium',
      status: 'completed',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    const task2 = await taskStore.createTask({
      goalId: 'goal-1',
      title: '任务2',
      description: '测试',
      type: 'one_time',
      priority: 'medium',
      status: 'blocked',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
      },
      adaptiveConfig: {
        canAdjustDifficulty: false,
        canAdjustFrequency: false,
        successThreshold: 0.5,
        executionHistory: [],
      },
      relatedKnowledgeIds: [],
      dependencies: [task1.id],
      executionHistory: [],
    });

    const depsMet = await depGraph.checkDependencies(task2.id);
    expect(depsMet).toBe(true);
  });

  it('应该验证新依赖是否有效', async () => {
    const task1 = await taskStore.createTask({
      goalId: 'goal-1',
      title: '任务1',
      description: '测试',
      type: 'one_time',
      priority: 'medium',
      status: 'ready',
      execution: {
        agentPrompt: 'test',
        requiredTools: [],
        requiredContext: [],
        capabilityMode: 'direct',
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

    // 尝试添加自依赖
    const validation = await depGraph.validateNewDependency(task1.id, task1.id);
    expect(validation.valid).toBe(false);
    expect(validation.reason).toContain('不能依赖自身');
  });
});

describe('GoalStore', () => {
  let goalStore: GoalStore;

  beforeEach(async () => {
    goalStore = new GoalStore(TEST_STORAGE);
    await goalStore.init();
    await goalStore.clearAll();
  });

  it('应该创建目标', async () => {
    const goal = await goalStore.createGoal({
      title: '测试目标',
      description: '这是一个测试目标',
      status: 'active',
      priority: 'high',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    expect(goal.id).toBeDefined();
    expect(goal.title).toBe('测试目标');
    expect(goal.status).toBe('active');
  });

  it('应该添加维度', async () => {
    const goal = await goalStore.createGoal({
      title: '测试目标',
      description: '测试',
      status: 'active',
      priority: 'medium',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    const updated = await goalStore.addDimension(goal.id, {
      name: '测试维度',
      priority: 'high',
      infoNeeds: [],
      sources: [],
      status: 'pending',
    });

    expect(updated.dimensions).toHaveLength(1);
    expect(updated.dimensions[0].name).toBe('测试维度');
  });

  it('应该更新进度', async () => {
    const goal = await goalStore.createGoal({
      title: '测试目标',
      description: '测试',
      status: 'active',
      priority: 'medium',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    const updated = await goalStore.updateProgress(goal.id, {
      completedCriteria: 2,
      totalCriteria: 5,
      percentage: 40,
    });

    expect(updated.progress.percentage).toBe(40);
  });
});

describe('KnowledgeStore', () => {
  let knowledgeStore: KnowledgeStore;

  beforeEach(async () => {
    knowledgeStore = new KnowledgeStore(TEST_STORAGE);
    await knowledgeStore.init();
    await knowledgeStore.clearAll();
  });

  it('应该保存知识条目', async () => {
    const entry = await knowledgeStore.save({
      goalId: 'goal-1',
      content: '这是一个重要的知识条目',
      category: 'test',
      tags: ['test', 'important'],
      importance: 0.8,
      relatedDimensionIds: [],
    });

    expect(entry.id).toBeDefined();
    expect(entry.content).toBe('这是一个重要的知识条目');
  });

  it('应该按目标获取知识', async () => {
    await knowledgeStore.save({
      goalId: 'goal-1',
      content: '目标1的知识',
      category: 'test',
      tags: [],
      importance: 0.5,
      relatedDimensionIds: [],
    });

    await knowledgeStore.save({
      goalId: 'goal-2',
      content: '目标2的知识',
      category: 'test',
      tags: [],
      importance: 0.5,
      relatedDimensionIds: [],
    });

    const goal1Knowledge = await knowledgeStore.getByGoal('goal-1');
    expect(goal1Knowledge).toHaveLength(1);
    expect(goal1Knowledge[0].content).toBe('目标1的知识');
  });

  it('应该搜索知识', async () => {
    await knowledgeStore.save({
      goalId: 'goal-1',
      content: '雅思考试的最佳备考书籍',
      category: 'resource',
      tags: ['雅思', '书籍'],
      importance: 0.9,
      relatedDimensionIds: [],
    });

    await knowledgeStore.save({
      goalId: 'goal-1',
      content: '托福考试的报名流程',
      category: 'exam_info',
      tags: ['托福', '报名'],
      importance: 0.7,
      relatedDimensionIds: [],
    });

    const results = await knowledgeStore.search('雅思 书籍');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('雅思');
  });

  it('应该软删除知识条目', async () => {
    const entry = await knowledgeStore.save({
      goalId: 'goal-1',
      content: '即将被删除的知识',
      category: 'test',
      tags: [],
      importance: 0.5,
      relatedDimensionIds: [],
    });

    await knowledgeStore.delete(entry.id);

    const retrieved = await knowledgeStore.getById(entry.id);
    expect(retrieved).toBeNull();

    const allEntries = await knowledgeStore.getByGoal('goal-1');
    expect(allEntries).toHaveLength(0);
  });
});

describe('NotificationQueue', () => {
  let queue: NotificationQueue;

  beforeEach(() => {
    queue = new NotificationQueue();
  });

  it('应该按优先级入队', () => {
    queue.enqueue({
      type: 'info',
      priority: 'low',
      title: '低优先级',
      content: '测试',
      goalId: 'goal-1',
    });

    queue.enqueue({
      type: 'urgent',
      priority: 'critical',
      title: '紧急',
      content: '测试',
      goalId: 'goal-1',
    });

    queue.enqueue({
      type: 'report',
      priority: 'high',
      title: '高优先级',
      content: '测试',
      goalId: 'goal-1',
    });

    const all = queue.getAll();
    expect(all[0].priority).toBe('critical');
    expect(all[1].priority).toBe('high');
    expect(all[2].priority).toBe('low');
  });

  it('应该检测紧急通知', () => {
    expect(queue.hasUrgent()).toBe(false);

    queue.enqueue({
      type: 'urgent',
      priority: 'critical',
      title: '紧急通知',
      content: '测试',
      goalId: 'goal-1',
    });

    expect(queue.hasUrgent()).toBe(true);
  });

  it('应该正确出队', () => {
    queue.enqueue({
      type: 'report',
      priority: 'medium',
      title: '通知1',
      content: '测试',
      goalId: 'goal-1',
    });

    queue.enqueue({
      type: 'report',
      priority: 'high',
      title: '通知2',
      content: '测试',
      goalId: 'goal-1',
    });

    const dequeued = queue.dequeue();
    expect(dequeued?.title).toBe('通知2'); // 高优先级先出队
    expect(queue.size()).toBe(1);
  });

  it('应该获取统计信息', () => {
    queue.enqueue({
      type: 'report',
      priority: 'high',
      title: '报告',
      content: '测试',
      goalId: 'goal-1',
    });

    queue.enqueue({
      type: 'help_request',
      priority: 'medium',
      title: '帮助请求',
      content: '测试',
      goalId: 'goal-1',
    });

    const stats = queue.getStats();
    expect(stats.totalQueued).toBe(2);
    expect(stats.byPriority.high).toBe(1);
    expect(stats.byType.report).toBe(1);
    expect(stats.byType.help_request).toBe(1);
  });
});

describe('Utils', () => {
  it('应该生成唯一ID', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });
});
