"use strict";
/**
 * Goal-Driven Agent 使用示例
 *
 * 这个示例展示了如何使用各个组件
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExample = runExample;
const index_1 = require("./index");
// ============================================================================
// 1. 初始化存储
// ============================================================================
async function initializeStores() {
    console.log('=== 初始化存储 ===');
    const goalStore = new index_1.GoalStore();
    const taskStore = new index_1.TaskStore();
    const knowledgeStore = new index_1.KnowledgeStore();
    const notificationQueue = new index_1.NotificationQueue();
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
async function createExampleGoal(goalStore) {
    console.log('\n=== 创建目标 ===');
    const goal = await goalStore.createGoal({
        title: '准备雅思考试',
        description: '在3个月内准备并参加雅思考试，目标分数7.0',
        status: 'active',
        priority: 'high',
        deadline: (0, index_1.now)() + 90 * 24 * 60 * 60 * 1000, // 90天后
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
                    { id: 'src-1', type: 'web_search', config: {}, priority: 'high' },
                ],
                status: 'pending',
                createdAt: (0, index_1.now)(),
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
                    { id: 'src-2', type: 'web_search', config: {}, priority: 'medium' },
                ],
                status: 'pending',
                createdAt: (0, index_1.now)(),
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
async function createExampleTasks(taskStore, goalId, dependencyGraph) {
    console.log('\n=== 创建任务 ===');
    // 任务1: 信息收集（交互式）
    const task1 = await taskStore.createTask({
        goalId,
        title: '收集用户偏好信息',
        description: '了解用户的当前英语水平、学习时间和预算',
        type: 'interactive',
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
        type: 'exploration',
        priority: 'high',
        status: 'blocked', // 依赖任务1
        hierarchyLevel: 'task',
        execution: {
            agentPrompt: '搜索雅思备考资源，包括书籍、APP、在线课程',
            requiredTools: ['web_search'],
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
        type: 'recurring',
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
async function testKnowledgeStore(knowledgeStore, goalId, taskId) {
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
async function testDependencyGraph(dependencyGraph, taskStore, goalId) {
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
async function testNotificationQueue(notificationQueue) {
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
async function simulateInteractiveTask(contextGatherer, goal, taskId) {
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
async function runExample() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         Goal-Driven Agent - 使用示例                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    try {
        // 1. 初始化
        const { goalStore, taskStore, knowledgeStore, notificationQueue } = await initializeStores();
        // 2. 创建目标
        const goal = await createExampleGoal(goalStore);
        // 3. 创建依赖图
        const dependencyGraph = new index_1.TaskDependencyGraph(taskStore);
        // 4. 创建任务
        const { task1, task2, task3 } = await createExampleTasks(taskStore, goal.id, dependencyGraph);
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
    }
    catch (error) {
        console.error('❌ 示例运行失败:', error);
        throw error;
    }
}
// 如果直接运行此文件
if (require.main === module) {
    runExample().catch(console.error);
}
//# sourceMappingURL=example.js.map