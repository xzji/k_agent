/**
 * Goal-Driven Agent 使用示例
 *
 * 这个示例展示了如何使用各个组件
 */

import {
  // Stores
  GoalStore,
  TaskStore,
  KnowledgeStore,
  NotificationQueue,
  SubGoalStore,

  // Core components
  TaskDependencyGraph,
  UnifiedTaskScheduler,

  // Planning
  ContextGatherer,
  SuccessCriteriaChecker,
  SubGoalPlanner,
  TaskPlanner,
  PlanPresenter,

  // Execution
  ExecutionPipeline,

  // Runtime
  ClaudeLLMChannel,
  SimpleIdleDetector,

  // Utils
  generateId,
  now,
} from './index';

// ============================================================================
// 1. 初始化存储
// ============================================================================

async function initializeStores() {
  console.log('=== 初始化存储 ===');

  const goalStore = new GoalStore();
  const taskStore = new TaskStore();
  const knowledgeStore = new KnowledgeStore();
  const notificationQueue = new NotificationQueue();

  // 初始化目录
  await goalStore.init();
  await taskStore.init();
  await knowledgeStore.init();

  console.log('✓ 存储初始化完成');

  return {
    goalStore,
    taskStore,
    knowledgeStore,
    notificationQueue,
  };
}

// ============================================================================
// 2. 创建目标
// ============================================================================

async function createExampleGoal(goalStore: GoalStore) {
  console.log('\n=== 创建目标 ===');

  const goal = await goalStore.createGoal({
    title: '准备雅思考试',
    description: '在3个月内准备并参加雅思考试，目标分数7.0',
    status: 'active',
    priority: 'high',
    deadline: now() + 90 * 24 * 60 * 60 * 1000, // 90天后

    // 定义探索维度
    dimensions: [
      {
        id: 'dim-1',
        goalId: '', // 会自动填充
        name: '考试资源',
        description: '寻找雅思学习资源',
        priority: 'high',
        infoNeeds: [
          { id: 'in-1', description: '最佳雅思备考书籍', priority: 'high' },
          { id: 'in-2', description: '在线课程推荐', priority: 'high' },
        ],
        sources: [
          { id: 'src-1', type: 'websearch', config: {}, priority: 'high' },
        ],
        status: 'pending',
        createdAt: now(),
      },
      {
        id: 'dim-2',
        goalId: '',
        name: '考试资讯',
        description: '了解报名信息和考试时间',
        priority: 'medium',
        infoNeeds: [
          { id: 'in-3', description: '最近的考试日期', priority: 'medium' },
          { id: 'in-4', description: '报名费用和流程', priority: 'medium' },
        ],
        sources: [
          { id: 'src-2', type: 'websearch', config: {}, priority: 'medium' },
        ],
        status: 'pending',
        createdAt: now(),
      },
    ],

    // 定义成功标准
    successCriteria: [
      {
        id: 'sc-1',
        description: '完成所有4个模块的备考',
        type: 'milestone',
        completed: false,
      },
      {
        id: 'sc-2',
        description: '模拟考试成绩达到7.0',
        type: 'condition',
        completed: false,
      },
      {
        id: 'sc-3',
        description: '成功报名并参加考试',
        type: 'deliverable',
        completed: false,
      },
    ],

    progress: {
      completedCriteria: 0,
      totalCriteria: 3,
      percentage: 0,
    },

    userContext: {
      collectedInfo: {},
      requiredInfo: ['当前英语水平', '每天可学习时间', '预算'],
    },
  });

  console.log(`✓ 目标创建: ${goal.title} (${goal.id})`);
  console.log(`  - 维度: ${goal.dimensions.length}个`);
  console.log(`  - 成功标准: ${goal.successCriteria.length}个`);

  return goal;
}

// ============================================================================
// 3. 创建任务
// ============================================================================

async function createExampleTasks(
  taskStore: TaskStore,
  goalId: string,
  dependencyGraph: TaskDependencyGraph
) {
  console.log('\n=== 创建任务 ===');

  // 任务1: 信息收集（交互式）
  const task1 = await taskStore.createTask({
    goalId,
    title: '收集用户偏好信息',
    description: '了解用户的当前英语水平、学习时间和预算',
    executionCycle: 'once',
    executionMode: 'interactive',
    priority: 'critical',
    status: 'ready',
    hierarchyLevel: 'task',
    execution: {
      agentPrompt: '询问用户关于雅思备考的基本信息',
      requiredTools: [],
      requiredContext: [],
      capabilityMode: 'direct',
    },
    expectedResult: {
      type: 'information',
      description: '用户的英语水平、每日学习时间和预算',
      format: 'json',
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
  console.log(`✓ 任务1创建: ${task1.title}`);

  // 任务2: 寻找学习资源（探索型）
  const task2 = await taskStore.createTask({
    goalId,
    title: '搜索雅思学习资源',
    description: '搜索并整理最佳的雅思备考书籍和在线课程',
    executionCycle: 'once',
    executionMode: 'standard',
    priority: 'high',
    status: 'blocked', // 依赖任务1
    hierarchyLevel: 'task',
    execution: {
      agentPrompt: '搜索雅思备考资源，包括书籍、APP、在线课程',
      requiredTools: ['websearch'],
      requiredContext: ['user_preferences'],
      capabilityMode: 'composite',
    },
    expectedResult: {
      type: 'information',
      description: '推荐的学习资源列表，包含书籍、APP、在线课程',
      format: 'markdown',
    },
    adaptiveConfig: {
      canAdjustDifficulty: false,
      canAdjustFrequency: false,
      successThreshold: 0.5,
      executionHistory: [],
    },
    relatedKnowledgeIds: [],
    dependencies: [task1.id], // 依赖任务1完成
    executionHistory: [],
  });
  console.log(`✓ 任务2创建: ${task2.title}`);

  // 任务3: 每日学习计划（周期性）
  const task3 = await taskStore.createTask({
    goalId,
    title: '每日学习提醒',
    description: '每天提醒用户完成雅思学习任务',
    executionCycle: 'recurring',
    executionMode: 'standard',
    recurrence: '每天',
    priority: 'medium',
    status: 'blocked',
    hierarchyLevel: 'task',
    schedule: {
      type: 'interval',
      intervalMs: 24 * 60 * 60 * 1000, // 每天
      maxExecutions: 90, // 90天
    },
    execution: {
      agentPrompt: '生成今日雅思学习计划',
      requiredTools: [],
      requiredContext: ['progress_history'],
      capabilityMode: 'direct',
    },
    expectedResult: {
      type: 'deliverable',
      description: '今日学习计划，包含具体任务和时间安排',
      format: 'text',
    },
    adaptiveConfig: {
      canAdjustDifficulty: true,
      canAdjustFrequency: true,
      successThreshold: 0.7,
      executionHistory: [],
    },
    relatedKnowledgeIds: [],
    dependencies: [task2.id],
    executionHistory: [],
  });
  console.log(`✓ 任务3创建: ${task3.title}`);

  // 更新依赖状态
  await dependencyGraph.updateAllTaskStatuses(goalId);

  console.log(`\n任务依赖关系:`);
  console.log(`  ${task1.title} (无依赖)`);
  console.log(`  ${task2.title} ← 依赖任务1`);
  console.log(`  ${task3.title} ← 依赖任务2`);

  return { task1, task2, task3 };
}

// ============================================================================
// 4. 测试知识存储
// ============================================================================

async function testKnowledgeStore(
  knowledgeStore: KnowledgeStore,
  goalId: string,
  taskId: string
) {
  console.log('\n=== 测试知识存储 ===');

  // 保存知识条目
  const entry1 = await knowledgeStore.save({
    goalId,
    taskId,
    content: '《剑桥雅思真题》是备考雅思的必备书籍，包含历年真题',
    category: 'resource',
    tags: ['书籍', '必备', '官方'],
    importance: 0.95,
    relatedDimensionIds: ['dim-1'],
  });
  console.log(`✓ 知识条目1保存: ${entry1.id.slice(0, 8)}`);

  const entry2 = await knowledgeStore.save({
    goalId,
    taskId,
    content: '雅思考试每月有2-4场，需要提前1-2个月报名',
    category: 'exam_info',
    tags: ['报名', '时间', '考试'],
    importance: 0.85,
    relatedDimensionIds: ['dim-2'],
  });
  console.log(`✓ 知识条目2保存: ${entry2.id.slice(0, 8)}`);

  // 搜索知识
  const searchResults = await knowledgeStore.search('雅思书籍', {
    maxResults: 5,
    category: 'resource',
  });
  console.log(`✓ 搜索结果: ${searchResults.length}条`);

  // 获取目标相关的知识
  const goalKnowledge = await knowledgeStore.getByGoal(goalId);
  console.log(`✓ 目标知识: ${goalKnowledge.length}条`);

  return { entry1, entry2 };
}

// ============================================================================
// 5. 测试依赖图
// ============================================================================

async function testDependencyGraph(
  dependencyGraph: TaskDependencyGraph,
  taskStore: TaskStore,
  goalId: string
) {
  console.log('\n=== 测试依赖图 ===');

  // 获取所有任务
  const tasks = await taskStore.getTasksByGoal(goalId);
  console.log(`总任务数: ${tasks.length}`);

  // 检测循环依赖
  const cycles = dependencyGraph.detectCircularDependencies(tasks);
  console.log(`✓ 循环依赖检测: ${cycles.length > 0 ? '发现循环' : '无循环'}`);

  // 获取执行顺序
  const executionOrder = dependencyGraph.getExecutionOrder(tasks);
  console.log(`✓ 执行顺序: ${executionOrder?.join(' → ') || '无法确定'}`);

  // 检查依赖状态
  const taskWithDeps = tasks.find((t) => t.dependencies.length > 0);
  if (taskWithDeps) {
    const depsMet = await dependencyGraph.checkDependencies(taskWithDeps.id);
    console.log(`✓ 任务"${taskWithDeps.title}"依赖满足: ${depsMet}`);
  }

  return executionOrder;
}

// ============================================================================
// 6. 测试通知队列
// ============================================================================

async function testNotificationQueue(notificationQueue: NotificationQueue) {
  console.log('\n=== 测试通知队列 ===');

  // 添加通知
  const n1 = notificationQueue.enqueue({
    type: 'report',
    priority: 'high',
    title: '新学习资源发现',
    content: '找到了5本推荐的雅思备考书籍',
    goalId: 'goal-1',
  });
  console.log(`✓ 通知1入队: ${n1.title} (${n1.priority})`);

  const n2 = notificationQueue.enqueue({
    type: 'help_request',
    priority: 'critical',
    title: '需要确认考试时间',
    content: '请选择您计划的考试日期',
    goalId: 'goal-1',
  });
  console.log(`✓ 通知2入队: ${n2.title} (${n2.priority})`);

  const n3 = notificationQueue.enqueue({
    type: 'info',
    priority: 'low',
    title: '每日提醒',
    content: '记得完成今天的学习任务',
    goalId: 'goal-1',
  });
  console.log(`✓ 通知3入队: ${n3.title} (${n3.priority})`);

  // 查看队列（应该按优先级排序）
  console.log(`\n队列内容（按优先级）:`);
  notificationQueue.getAll().forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.priority}] ${n.title}`);
  });

  // 检查是否有紧急通知
  console.log(`✓ 有紧急通知: ${notificationQueue.hasUrgent()}`);

  // 出队
  const dequeued = notificationQueue.dequeue();
  console.log(`✓ 出队: ${dequeued?.title}`);

  return { n1, n2, n3 };
}

// ============================================================================
// 7. 模拟交互式任务
// ============================================================================

async function simulateInteractiveTask(
  contextGatherer: ContextGatherer,
  goal: ReturnType<typeof createExampleGoal> extends Promise<infer T> ? T : never,
  taskId: string
) {
  console.log('\n=== 模拟交互式任务 ===');

  // 注意：这里使用模拟的LLM响应
  console.log('交互式任务会:');
  console.log('  1. 生成自然的问题询问用户信息');
  console.log('  2. 等待用户回复（waiting_user状态）');
  console.log('  3. 从回复中提取结构化信息');
  console.log('  4. 判断信息是否足够');
  console.log('  5. 不够则继续提问，足够则完成任务');

  // 实际使用时:
  // const task = await contextGatherer.startInteractiveGathering(goal);
  // 用户回复后:
  // const result = await contextGatherer.processUserResponse(task.id, "我英语四级水平，每天能学2小时，预算5000元");

  console.log(`✓ 交互式任务示例（任务ID: ${taskId}）`);
}

// ============================================================================
// 8. 运行完整示例
// ============================================================================

export async function runExample() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Goal-Driven Agent - 使用示例                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // 1. 初始化
    const { goalStore, taskStore, knowledgeStore, notificationQueue } =
      await initializeStores();

    // 2. 创建目标
    const goal = await createExampleGoal(goalStore);

    // 3. 创建依赖图
    const dependencyGraph = new TaskDependencyGraph(taskStore);

    // 4. 创建任务
    const { task1, task2, task3 } = await createExampleTasks(
      taskStore,
      goal.id,
      dependencyGraph
    );

    // 5. 测试知识存储
    await testKnowledgeStore(knowledgeStore, goal.id, task1.id);

    // 6. 测试依赖图
    await testDependencyGraph(dependencyGraph, taskStore, goal.id);

    // 7. 测试通知队列
    await testNotificationQueue(notificationQueue);

    // 8. 查看最终状态
    console.log('\n=== 最终状态 ===');

    const goals = await goalStore.getAllGoals();
    console.log(`目标总数: ${goals.length}`);

    const tasks = await taskStore.getTasksByGoal(goal.id);
    console.log(`任务总数: ${tasks.length}`);

    const readyTasks = tasks.filter((t) => t.status === 'ready');
    const blockedTasks = tasks.filter((t) => t.status === 'blocked');
    console.log(`  - 就绪: ${readyTasks.length}`);
    console.log(`  - 阻塞: ${blockedTasks.length}`);

    const knowledge = await knowledgeStore.getByGoal(goal.id);
    console.log(`知识条目: ${knowledge.length}`);

    console.log('\n✅ 示例运行完成！');

    // 清理（可选）
    // await goalStore.clearAll();
    // await taskStore.clearAll();
    // await knowledgeStore.clearAll();

    return {
      goalStore,
      taskStore,
      knowledgeStore,
      notificationQueue,
      goal,
      tasks: { task1, task2, task3 },
    };
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
    throw error;
  }
}

// ============================================================================
// 9. 购车场景完整演示（基于 buy_car_demo_showcase.js）
// ============================================================================

export async function runBuyCarDemo() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         🚗 购车决策场景演示（buy_car_demo_showcase）        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // 初始化存储
  const goalStore = new GoalStore();
  const taskStore = new TaskStore();
  const knowledgeStore = new KnowledgeStore();
  const subGoalStore = new SubGoalStore();
  const notificationQueue = new NotificationQueue();

  await goalStore.init();
  await taskStore.init();
  await knowledgeStore.init();
  await subGoalStore.init();

  // 创建 LLM 适配器（使用本地模拟）
  const llm = new ClaudeLLMChannel();
  const idleDetector = new SimpleIdleDetector();

  // 步骤1: 创建目标
  console.log('\n📌 步骤1: 用户提交购车目标');
  const userGoal = '我想买一辆SUV，预算20万以内，油车，要省油';
  console.log(`🚗 用户输入: "${userGoal}"`);

  const goal = await goalStore.createGoal({
    title: userGoal,
    description: '3个月内购买省油燃油SUV',
    status: 'gathering_info',
    priority: 'high',
    dimensions: [],
    successCriteria: [
      { id: 'sc-1', description: '完成车型筛选和对比', type: 'milestone', completed: false },
      { id: 'sc-2', description: '完成试驾体验', type: 'milestone', completed: false },
      { id: 'sc-3', description: '确定最终购车方案', type: 'deliverable', completed: false },
      { id: 'sc-4', description: '成功提车', type: 'deliverable', completed: false },
    ],
    progress: { completedCriteria: 0, totalCriteria: 4, percentage: 0 },
    userContext: {
      collectedInfo: {},
      requiredInfo: ['用车场景', '预算范围', '品牌偏好', '购买时间'],
    },
  });
  console.log(`✅ 目标创建: ${goal.id.slice(0, 8)}`);

  // 步骤2: 信息收集
  console.log('\n📌 步骤2: 收集背景信息');
  const collectedInfo = {
    usageScenario: '城市通勤为主，偶尔周末自驾游',
    annualMileage: '1.5-2万公里',
    passengerCount: '主要2人，偶尔4-5人',
    brandPreference: '国产或合资都可以，更看性价比',
    sizePreference: '紧凑型SUV即可，不需要太大',
    transmission: '自动挡',
    features: '看重安全配置、车机智能、省油',
    purchaseTimeline: '2-3个月内购买',
    tradeIn: '无旧车置换',
    financing: '全款购车',
    budget: '20万以内',
    fuelType: '燃油车',
    coreRequirement: '省油',
  };

  await goalStore.updateGoal(goal.id, {
    userContext: { collectedInfo },
    status: 'planning',
  });
  console.log('✅ 信息收集完成');
  console.log(`   - 用车场景: ${collectedInfo.usageScenario}`);
  console.log(`   - 预算: ${collectedInfo.budget}`);
  console.log(`   - 购买时间: ${collectedInfo.purchaseTimeline}`);

  // 步骤3: 子目标拆解
  console.log('\n📌 步骤3: 拆解子目标');
  const subGoalPlanner = new SubGoalPlanner(goalStore, subGoalStore, llm);

  const subGoals = await subGoalPlanner.decomposeSubGoals(goal.id, collectedInfo);
  console.log(`✅ 拆解完成，共 ${subGoals.length} 个子目标:`);
  subGoals.forEach((sg, i) => {
    const icon = sg.priority === 'critical' ? '🔴' : sg.priority === 'high' ? '🟡' : '🟢';
    console.log(`   ${icon} ${i + 1}. ${sg.name} (${sg.priority})`);
  });

  // 步骤4: 任务生成
  console.log('\n📌 步骤4: 生成任务');
  const taskPlanner = new TaskPlanner(taskStore, subGoalStore, llm);

  const allTasks = [];
  for (const subGoal of subGoals.slice(0, 3)) { // 只为前3个子目标生成任务
    const tasks = await taskPlanner.generateTasksForSubGoal(
      subGoal.id,
      {
        goalTitle: goal.title,
        goalDescription: goal.description,
        userContext: collectedInfo,
      },
      { maxTasks: 3 }
    );
    allTasks.push(...tasks);
  }

  console.log(`✅ 任务生成完成，共 ${allTasks.length} 个任务`);

  // 添加推送策略字段到任务
  for (const task of allTasks) {
    const shouldNotify = task.executionMode !== 'monitoring';
    const notifyReason = shouldNotify
      ? task.executionMode === 'interactive'
        ? '需要用户决策'
        : '任务完成结果'
      : undefined;

    await taskStore.updateTask(task.id, {
      shouldNotify,
      notifyReason,
      notifyTiming: shouldNotify ? '任务完成后' : undefined,
      requiresUserInput: task.executionMode === 'interactive',
      valueThreshold: shouldNotify ? 0.7 : 0,
    });
  }

  // 步骤5: 计划展示
  console.log('\n📌 步骤5: 生成计划报告');
  const planPresenter = new PlanPresenter(
    goalStore,
    subGoalStore,
    taskStore,
    notificationQueue,
    llm
  );

  const planReport = await planPresenter.generatePlanReport(goal.id);
  console.log('✅ 计划报告生成');
  console.log(`   - 子目标数: ${planReport.subGoals.length}`);
  console.log(`   - 任务总数: ${planReport.summary.taskCount}`);
  console.log(`   - 需要推送: ${planReport.summary.notifyTaskCount} 个`);
  console.log(`   - 需要用户参与: ${planReport.summary.interactiveTaskCount} 个`);

  // 步骤6: 创建执行管道和调度器
  console.log('\n📌 步骤6: 初始化执行系统');
  const executionPipeline = new ExecutionPipeline(llm, knowledgeStore, taskStore);
  const dependencyGraph = new TaskDependencyGraph(taskStore);

  // 创建 ValueAssessor（需要模拟）
  const valueAssessor = {
    assessValue: async (taskId: string, result: any) => ({
      taskId,
      valueScore: 0.75,
      valueDimensions: {
        relevance: 0.8,
        timeliness: 0.7,
        novelty: 0.75,
        actionability: 0.8,
      },
      reasoning: '任务完成，信息有价值',
      shouldNotify: true,
      priority: 'medium' as const,
    }),
  };

  const scheduler = new UnifiedTaskScheduler(
    taskStore,
    goalStore,
    knowledgeStore,
    notificationQueue,
    dependencyGraph,
    executionPipeline,
    idleDetector,
    {
      preferences: {
        notificationFrequency: 'immediate',
      },
    },
    valueAssessor as any,
    { maxConcurrent: 2, cycleIntervalMs: 1000 }
  );

  console.log('✅ 执行系统初始化完成');

  // 步骤7: 手动执行几个任务
  console.log('\n📌 步骤7: 执行任务');
  const readyTasks = await taskStore.getReadyTasks();
  console.log(`找到 ${readyTasks.length} 个就绪任务`);

  for (const task of readyTasks.slice(0, 2)) {
    console.log(`\n   ⏳ 执行: ${task.title}`);
    const result = await executionPipeline.run(task);
    console.log(`   ✅ 完成: ${result.success ? '成功' : '失败'}`);
    if (result.output) {
      console.log(`   📄 结果: ${result.output.slice(0, 50)}...`);
    }
  }

  // 步骤8: 检查通知队列
  console.log('\n📌 步骤8: 检查通知');
  const notifications = notificationQueue.getAll();
  console.log(`通知队列中有 ${notifications.length} 条通知`);
  notifications.forEach((n, i) => {
    console.log(`   ${i + 1}. [${n.priority}] ${n.title}`);
  });

  // 步骤9: 进度评估
  console.log('\n📌 步骤9: 评估目标进度');
  const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
  const progress = Math.round((completedTasks / allTasks.length) * 100);
  console.log(`   完成度: ${progress}% (${completedTasks}/${allTasks.length})`);

  // 最终总结
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         ✅ 购车决策场景演示完成                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📊 演示总结:');
  console.log(`   - 目标: ${goal.title}`);
  console.log(`   - 子目标: ${subGoals.length} 个`);
  console.log(`   - 任务: ${allTasks.length} 个`);
  console.log(`   - 知识条目: ${(await knowledgeStore.getByGoal(goal.id)).length} 条`);
  console.log(`   - 通知: ${notifications.length} 条`);

  return {
    goal,
    subGoals,
    tasks: allTasks,
    planReport,
    notifications,
  };
}

// 如果直接运行此文件
if (require.main === module) {
  // 运行基础示例
  runExample()
    .then(() => {
      console.log('\n' + '='.repeat(60));
      console.log('基础示例完成，按 Enter 继续购车场景演示...');
      console.log('='.repeat(60) + '\n');
    })
    .then(() => runBuyCarDemo())
    .catch(console.error);
}
