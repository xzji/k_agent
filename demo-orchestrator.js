/**
 * Goal-Driven Agent Orchestrator 使用示例
 *
 * 展示完整的 10 步流程使用方式
 */

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

// ============================================================================
// Mock 实现（实际使用时替换为真实实现）
// ============================================================================

/**
 * Mock LLM 实现
 */
class MockLLM {
  async complete(prompt, options) {
    console.log('[MockLLM] Prompt length:', prompt.length);

    // 模拟子目标拆解响应
    if (prompt.includes('拆解为合理的子目标阶段')) {
      return {
        content: JSON.stringify({
          subGoals: [
            {
              name: '需求分析',
              description: '分析购车需求，确定预算和偏好',
              priority: 'high',
              weight: 0.25,
              dependencies: [],
              estimatedDuration: 8,
              successCriteria: [
                { description: '确定预算范围', type: 'deliverable' },
                { description: '列出必选配置', type: 'deliverable' },
              ],
            },
            {
              name: '车型调研',
              description: '调研符合条件的车型',
              priority: 'high',
              weight: 0.35,
              dependencies: [],
              estimatedDuration: 16,
              successCriteria: [
                { description: '筛选3-5款候选车型', type: 'deliverable' },
              ],
            },
            {
              name: '试驾对比',
              description: '安排试驾并对比各车型',
              priority: 'medium',
              weight: 0.25,
              dependencies: [],
              estimatedDuration: 12,
              successCriteria: [
                { description: '完成所有候选车型试驾', type: 'condition' },
              ],
            },
            {
              name: '最终决策',
              description: '确定最终车型并完成购买',
              priority: 'high',
              weight: 0.15,
              dependencies: [],
              estimatedDuration: 8,
              successCriteria: [
                { description: '完成购车', type: 'deliverable' },
              ],
            },
          ],
          reasoning: '根据购车流程合理拆解为4个阶段',
        }),
      };
    }

    // 模拟任务生成响应
    if (prompt.includes('生成具体的执行任务')) {
      return {
        content: JSON.stringify({
          tasks: [
            {
              title: '搜索车型信息',
              description: '搜索符合条件的SUV车型信息',
              type: 'exploration',
              hierarchyLevel: 'task',
              priority: 'high',
              expectedResult: {
                type: 'information',
                description: '符合条件的车型列表',
                format: 'markdown',
              },
              estimatedDuration: 60,
            },
          ],
          reasoning: '需要收集车型信息',
        }),
      };
    }

    // 模拟任务 review 响应
    if (prompt.includes('Review以下任务')) {
      return {
        content: JSON.stringify({
          reviewResults: [
            {
              taskId: 'task-1',
              goalContribution: 'high',
              subGoalContribution: 'critical',
              aligned: true,
              reasoning: '任务与目标高度对齐',
            },
          ],
        }),
      };
    }

    // 模拟价值评估响应
    if (prompt.includes('评估以下任务结果的价值')) {
      return {
        content: JSON.stringify({
          valueScore: 0.85,
          valueDimensions: {
            relevance: 0.9,
            timeliness: 0.8,
            novelty: 0.85,
            actionability: 0.7,
          },
          reasoning: '信息相关性高，对决策有帮助',
          shouldNotify: true,
          priority: 'high',
        }),
      };
    }

    // 默认响应
    return {
      content: JSON.stringify({ result: 'success' }),
    };
  }

  async chatJSON(params) {
    console.log('[MockLLM] chatJSON:', params.systemPrompt?.slice(0, 50));

    // 模拟问题生成
    if (params.systemPrompt?.includes('gather information')) {
      return {
        questions: [
          {
            question: '您的预算是多少？',
            purpose: '了解预算范围',
            expectedType: 'string',
          },
        ],
        hasEnoughInfo: false,
        reasoning: '需要了解更多信息',
      };
    }

    return {};
  }
}

/**
 * Mock Execution Pipeline
 */
class MockExecutionPipeline {
  async run(task) {
    console.log(`[MockExecution] Running task: ${task.title}`);

    // 模拟执行延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      output: `Task "${task.title}" completed successfully`,
      duration: 100,
      metadata: {
        summary: '执行完成',
        keyPoints: ['要点1', '要点2'],
      },
    };
  }
}

/**
 * Mock Idle Detector
 */
class MockIdleDetector {
  constructor() {
    this.lastActivity = Date.now();
  }

  async isUserIdle() {
    // 模拟用户空闲
    return true;
  }

  getLastActivityTime() {
    return this.lastActivity;
  }
}

// ============================================================================
// 完整使用示例
// ============================================================================

async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Goal-Driven Agent Orchestrator - 完整示例              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // -------------------------------------------------------------------------
  // 1. 初始化所有存储
  // -------------------------------------------------------------------------
  console.log('【步骤 0】初始化存储...\n');

  const goalStore = new GoalStore('/tmp/demo-goal-driven');
  const taskStore = new TaskStore('/tmp/demo-goal-driven');
  const subGoalStore = new SubGoalStore('/tmp/demo-goal-driven');
  const knowledgeStore = new KnowledgeStore('/tmp/demo-goal-driven');
  const notificationQueue = new NotificationQueue();

  await goalStore.init();
  await taskStore.init();
  await subGoalStore.init();
  await knowledgeStore.init();

  console.log('✓ 所有存储初始化完成\n');

  // -------------------------------------------------------------------------
  // 2. 创建核心组件
  // -------------------------------------------------------------------------
  console.log('【步骤 0】创建核心组件...\n');

  const dependencyGraph = new TaskDependencyGraph(taskStore);
  const contextGatherer = new ContextGatherer(
    taskStore,
    notificationQueue,
    new MockLLM()
  );
  const successCriteriaChecker = new SuccessCriteriaChecker(
    goalStore,
    taskStore,
    knowledgeStore,
    notificationQueue,
    new MockLLM()
  );

  // 创建 ValueAssessor
  const valueAssessor = new ValueAssessor(
    taskStore,
    goalStore,
    knowledgeStore,
    new MockLLM()
  );

  // 创建 Scheduler
  const scheduler = new UnifiedTaskScheduler(
    taskStore,
    goalStore,
    knowledgeStore,
    notificationQueue,
    dependencyGraph,
    new MockExecutionPipeline(),
    new MockIdleDetector(),
    {
      userId: 'demo-user',
      preferences: {
        notificationFrequency: 'immediate',
      },
    },
    valueAssessor,
    {
      maxConcurrent: 2,
      cycleIntervalMs: 30000,
    }
  );

  console.log('✓ 核心组件创建完成\n');

  // -------------------------------------------------------------------------
  // 3. 创建 Orchestrator
  // -------------------------------------------------------------------------
  console.log('【步骤 0】创建 Orchestrator...\n');

  const orchestrator = new GoalOrchestrator(
    goalStore,
    taskStore,
    knowledgeStore,
    notificationQueue,
    contextGatherer,
    scheduler,
    successCriteriaChecker,
    new MockLLM(),
    new MockIdleDetector(),
    {
      userId: 'demo-user',
      preferences: {
        notificationFrequency: 'immediate',
      },
    },
    subGoalStore
  );

  await orchestrator.init();

  console.log('✓ Orchestrator 创建完成\n');

  // -------------------------------------------------------------------------
  // 4. 演示完整 10 步流程
  // -------------------------------------------------------------------------

  // ===== Phase 1: 目标理解与信息收集 =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 1】目标理解与信息收集');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const userGoal = '我想买一辆SUV，预算20万以内，油车，要省油';
  console.log(`用户目标: "${userGoal}"\n`);

  const { goalId, interactiveTaskId } = await orchestrator.startGoal(userGoal);
  console.log(`✓ 目标创建: ${goalId}`);
  console.log(`✓ 交互式任务: ${interactiveTaskId}\n`);

  // 模拟用户回答
  const userResponse =
    '我主要上下班用，偶尔周末短途自驾。偏好日系品牌，对智能配置要求不高，但一定要省油。';
  console.log(`用户回答: "${userResponse}"\n`);

  const infoResult = await orchestrator.handleInfoCollectionResponse(
    goalId,
    userResponse
  );
  console.log(`✓ 信息收集结果:`);
  console.log(`  - 信息足够: ${infoResult.hasEnoughInfo}`);
  console.log(`  - 可以继续: ${infoResult.canProceed}\n`);

  // ===== Phase 2-3: 子目标拆解 =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 2-3】子目标拆解与关系梳理');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const subGoals = await orchestrator.decomposeSubGoals(goalId);
  console.log(`✓ 拆解完成，共 ${subGoals.length} 个子目标:\n`);

  subGoals.forEach((sg, i) => {
    console.log(`  ${i + 1}. ${sg.name} (${sg.priority})`);
    console.log(`     权重: ${Math.round(sg.weight * 100)}%`);
    console.log(`     预计耗时: ${sg.estimatedDuration}小时`);
    console.log(`     描述: ${sg.description}\n`);
  });

  // ===== Phase 4-5: 任务生成与 Review =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 4-5】任务生成与 Review');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { tasks, reviewResults, adjusted } = await orchestrator.generateAndReviewTasks(
    goalId
  );

  console.log(`✓ 任务生成完成，共 ${tasks.length} 个任务`);
  console.log(`✓ Review 完成，调整了 ${reviewResults.filter((r) => !r.aligned).length} 个任务\n`);

  tasks.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.hierarchyLevel}] ${t.title} (${t.priority})`);
    console.log(`     类型: ${t.type}`);
    console.log(`     预期产出: ${t.expectedResult?.description || 'N/A'}\n`);
  });

  // ===== Phase 6: 计划汇报与确认 =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 6】计划汇报与确认');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const { report, confirmed } = await orchestrator.presentPlanForConfirmation(goalId);

  console.log('✓ 计划汇报生成:\n');
  console.log(`  摘要: ${report.summary}`);
  console.log(`  时间线: ${report.timeline}`);
  console.log(`  通知策略: ${report.notificationStrategy}\n`);

  console.log(`  子目标详情:`);
  report.subGoals.forEach((sg, i) => {
    console.log(`    ${i + 1}. ${sg.name} - ${sg.tasks.length}个任务`);
  });
  console.log();

  // ===== Phase 7: 启动执行 =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 7】启动执行');
  console.log('═══════════════════════════════════════════════════════════════\n');

  await orchestrator.startExecution(goalId);
  console.log('✓ 执行已启动\n');

  // 运行几个调度周期
  console.log('  运行调度器（模拟3秒）...');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log('✓ 调度完成\n');

  // ===== Phase 10: 定期 Review =====
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【Phase 10】定期 Review');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const review = await orchestrator.performReview(goalId);
  console.log('✓ Review 完成:');
  console.log(`  - 可以完成: ${review.canComplete}`);
  console.log(`  - 进度: ${review.percentage}%`);
  if (review.recommendations?.length) {
    console.log(`  - 建议: ${review.recommendations.join(', ')}`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // 5. 查看最终状态
  // -------------------------------------------------------------------------
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('【最终状态】');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const state = orchestrator.getState(goalId);
  console.log(`目标ID: ${state.goalId}`);
  console.log(`当前阶段: ${state.phase}`);
  console.log(`子目标数: ${state.subGoalIds.length}`);
  console.log(`任务数: ${state.taskIds.length}`);
  console.log(`计划已确认: ${state.planConfirmed}\n`);

  // 查看通知队列
  const notifications = notificationQueue.getAll();
  console.log(`通知队列: ${notifications.length} 条通知`);
  notifications.forEach((n, i) => {
    console.log(`  ${i + 1}. [${n.priority}] ${n.title}`);
  });
  console.log();

  // -------------------------------------------------------------------------
  // 6. 清理
  // -------------------------------------------------------------------------
  await scheduler.stop();
  console.log('✓ 调度器已停止\n');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                 示例运行完成！                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  return {
    goalId,
    orchestrator,
    stores: {
      goalStore,
      taskStore,
      subGoalStore,
      knowledgeStore,
    },
  };
}

// 运行示例
if (require.main === module) {
  runDemo().catch((error) => {
    console.error('示例运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runDemo };
