#!/usr/bin/env node
/**
 * Goal-Driven Agent - 可直接运行的完整演示
 *
 * 无需外部 API，直接使用本地实现
 */

const path = require('path');

// 使用编译后的代码
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

// 导入本地适配器
const {
  ClaudeLLMChannel,
  LocalExecutionPipeline,
  SimpleIdleDetector,
} = require('./dist/core/goal-driven/runtime/claude-llm-adapter');

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║         🤖 Goal-Driven Agent - 智能目标驱动代理                 ║');
  console.log('║                                                                ║');
  console.log('║         可直接运行，无需外部 API 配置                          ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // -------------------------------------------------------------------------
    // 初始化
    // -------------------------------------------------------------------------
    console.log('📦 初始化组件...\n');

    const storagePath = path.join(require('os').tmpdir(), 'goal-driven-agent');
    console.log(`   存储路径: ${storagePath}\n`);

    // 存储
    const goalStore = new GoalStore(storagePath);
    const taskStore = new TaskStore(storagePath);
    const subGoalStore = new SubGoalStore(storagePath);
    const knowledgeStore = new KnowledgeStore(storagePath);
    const notificationQueue = new NotificationQueue();

    await goalStore.init();
    await taskStore.init();
    await subGoalStore.init();
    await knowledgeStore.init();

    console.log('   ✅ GoalStore - 目标存储');
    console.log('   ✅ TaskStore - 任务存储');
    console.log('   ✅ SubGoalStore - 子目标存储');
    console.log('   ✅ KnowledgeStore - 知识存储');
    console.log('   ✅ NotificationQueue - 通知队列\n');

    // 核心组件
    const llm = new ClaudeLLMChannel();
    const executionPipeline = new LocalExecutionPipeline();
    const idleDetector = new SimpleIdleDetector();
    const dependencyGraph = new TaskDependencyGraph(taskStore);
    const valueAssessor = new ValueAssessor(
      taskStore,
      goalStore,
      knowledgeStore,
      llm
    );
    const contextGatherer = new ContextGatherer(
      taskStore,
      notificationQueue,
      llm
    );
    const successCriteriaChecker = new SuccessCriteriaChecker(
      goalStore,
      taskStore,
      knowledgeStore,
      notificationQueue,
      llm
    );

    const scheduler = new UnifiedTaskScheduler(
      taskStore,
      goalStore,
      knowledgeStore,
      notificationQueue,
      dependencyGraph,
      executionPipeline,
      idleDetector,
      {
        userId: 'demo-user',
        preferences: {
          notificationFrequency: 'immediate',
        },
      },
      valueAssessor,
      {
        maxConcurrent: 2,
        cycleIntervalMs: 5000,
      }
    );

    console.log('   ✅ ClaudeLLMChannel - LLM 适配器');
    console.log('   ✅ LocalExecutionPipeline - 本地执行管道');
    console.log('   ✅ UnifiedTaskScheduler - 统一任务调度器');
    console.log('   ✅ ValueAssessor - 价值评估器\n');

    // Orchestrator
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
      {
        userId: 'demo-user',
        preferences: {
          notificationFrequency: 'immediate',
        },
      },
      subGoalStore
    );

    await orchestrator.init();
    console.log('   ✅ GoalOrchestrator - 流程编排器\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // -------------------------------------------------------------------------
    // 获取用户目标（支持命令行参数、环境变量或交互式输入）
    // -------------------------------------------------------------------------
    const readline = require('readline');

    // 检查是否有命令行参数
    const argsGoal = process.argv.slice(2).join(' ');
    // 检查环境变量
    const envGoal = process.env.GOAL;
    // 默认目标
    const defaultGoal = '我想买一辆SUV，预算20万，要省油';

    let userGoal = argsGoal || envGoal;
    let rl;

    const question = (prompt) => {
      if (!rl) {
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
      }
      return new Promise((resolve) => rl.question(prompt, resolve));
    };

    if (!userGoal) {
      console.log('💭 请输入您的目标（例如："我想买一辆SUV，预算20万"）：');
      userGoal = (await question('> ')) || defaultGoal;
    } else {
      console.log(`💭 使用目标: "${userGoal}"`);
    }
    console.log();

    // -------------------------------------------------------------------------
    // Phase 1: 目标理解与信息收集
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 1: 目标理解与信息收集');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { goalId, interactiveTaskId } = await orchestrator.startGoal(userGoal);
    console.log(`✅ 目标已创建: ${goalId.slice(0, 8)}...`);

    // 查看生成的首个问题
    await new Promise((resolve) => setTimeout(resolve, 500));
    const notifications = notificationQueue.getAll();
    const lastNotification = notifications[notifications.length - 1];
    if (lastNotification?.type === 'help_request') {
      console.log(`\n🤖 Agent: ${lastNotification.content.split('\n')[2]}\n`);
    }

    // 用户回答（支持命令行参数或交互式）
    const argsResponse = process.argv[3];
    const envResponse = process.env.GOAL_RESPONSE;
    const defaultResponse = '预算20万以内，主要城市通勤，看重油耗和舒适性，偏好日系品牌';

    let userResponse;
    if (argsResponse) {
      userResponse = argsResponse;
      console.log(`💬 使用回答: "${userResponse}"`);
    } else if (envResponse) {
      userResponse = envResponse;
      console.log(`💬 使用回答: "${userResponse}"`);
    } else {
      userResponse = (await question('💬 您的回答（或直接回车使用默认）: ')) || defaultResponse;
    }
    console.log();

    const infoResult = await orchestrator.handleInfoCollectionResponse(
      goalId,
      userResponse
    );
    console.log(
      `✅ 信息收集: ${infoResult.hasEnoughInfo ? '信息充足 ✓' : '需要更多信息'}\n`
    );

    // -------------------------------------------------------------------------
    // Phase 2-3: 子目标拆解
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 2-3: 子目标拆解与关系梳理');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const subGoals = await orchestrator.decomposeSubGoals(goalId);
    console.log(`✅ 拆解完成！共 ${subGoals.length} 个子目标：\n`);

    subGoals.forEach((sg, i) => {
      console.log(`   ${i + 1}. ${sg.name}`);
      console.log(`      📄 ${sg.description}`);
      console.log(`      🎯 权重: ${Math.round(sg.weight * 100)}% | 优先级: ${sg.priority}`);
      console.log(`      ⏱️  预计: ${sg.estimatedDuration}小时`);
      console.log(`      ✅ 成功标准: ${sg.successCriteria.map((s) => s.description).join(', ')}`);
      console.log();
    });

    // -------------------------------------------------------------------------
    // Phase 4-5: 任务生成与 Review
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 4-5: 任务生成与 Review');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { tasks, reviewResults, adjusted } =
      await orchestrator.generateAndReviewTasks(goalId);

    console.log(`✅ 任务生成完成！共 ${tasks.length} 个任务\n`);

    // 按子目标分组显示
    const tasksBySubGoal = {};
    for (const task of tasks) {
      const sg = subGoals.find((s) => s.id === task.subGoalId);
      const sgName = sg ? sg.name : '未分组';
      if (!tasksBySubGoal[sgName]) tasksBySubGoal[sgName] = [];
      tasksBySubGoal[sgName].push(task);
    }

    for (const [sgName, sgTasks] of Object.entries(tasksBySubGoal)) {
      console.log(`   📁 ${sgName}:`);
      for (const task of sgTasks) {
        console.log(`      • ${task.title} (${task.type}, ${task.priority})`);
      }
      console.log();
    }

    console.log(`✅ Review 完成：${reviewResults.filter((r) => r.aligned).length}/${reviewResults.length} 个任务对齐\n`);

    // -------------------------------------------------------------------------
    // Phase 6: 计划汇报与确认
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 6: 计划汇报与确认');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { report, confirmed } = await orchestrator.presentPlanForConfirmation(
      goalId
    );

    console.log('📊 计划汇报：\n');
    console.log(`   ${report.summary}\n`);
    console.log(`   ⏱️  ${report.timeline}`);
    console.log(`   🔔 ${report.notificationStrategy}\n`);

    // 计划确认（支持命令行参数或交互式）
    const argsConfirm = process.argv[4];
    const envConfirm = process.env.GOAL_CONFIRM;
    let confirm = 'y';

    if (argsConfirm) {
      confirm = argsConfirm;
    } else if (envConfirm) {
      confirm = envConfirm;
    } else {
      confirm = (await question('✅ 是否确认此计划？(y/n，默认y): ')) || 'y';
    }

    if (confirm.toLowerCase() === 'n') {
      console.log('\n❌ 计划已取消');
      if (rl) rl.close();
      return;
    }
    console.log('✅ 计划已确认！\n');

    // -------------------------------------------------------------------------
    // Phase 7: 启动执行
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 7: 启动执行');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await orchestrator.startExecution(goalId);
    console.log('🚀 执行已启动！调度器运行中...\n');

    // 等待执行
    console.log('⏳ 等待任务执行（3秒）...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const stats = scheduler.getStats();
    console.log(`✅ 已完成 ${stats.tasksExecuted} 个任务`);
    console.log(`✅ 完成 ${stats.cyclesCompleted} 个调度周期\n`);

    // -------------------------------------------------------------------------
    // Phase 10: 定期 Review
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Phase 10: 定期 Review');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const review = await orchestrator.performReview(goalId);

    console.log(`📊 目标进度: ${review.percentage}%`);
    console.log(`✅ 可完成: ${review.canComplete ? '是' : '否'}`);
    if (review.recommendations?.length) {
      console.log(`💡 建议: ${review.recommendations.join(', ')}`);
    }
    console.log();

    // -------------------------------------------------------------------------
    // 最终状态
    // -------------------------------------------------------------------------
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 最终状态');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const state = orchestrator.getState(goalId);
    console.log(`   目标ID: ${state.goalId.slice(0, 16)}...`);
    console.log(`   当前阶段: ${state.phase}`);
    console.log(`   子目标数: ${state.subGoalIds.length}`);
    console.log(`   任务数: ${state.taskIds.length}`);
    console.log(`   计划已确认: ${state.planConfirmed ? '是' : '否'}`);

    // 通知队列
    const allNotifications = notificationQueue.getAll();
    console.log(`\n   📬 通知队列: ${allNotifications.length} 条通知`);
    for (const n of allNotifications.slice(0, 5)) {
      console.log(`      [${n.priority}] ${n.title.slice(0, 40)}...`);
    }

    // -------------------------------------------------------------------------
    // 清理
    // -------------------------------------------------------------------------
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧹 清理资源');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await scheduler.stop();
    if (rl) rl.close();

    console.log('✅ 调度器已停止');
    console.log('✅ 演示完成！\n');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║              🎉 演示成功完成！                                  ║');
    console.log('║                                                                ║');
    console.log('║   完整 10 步流程已全部执行：                                    ║');
    console.log('║   1️⃣  目标理解 → 2️⃣  子目标拆解 → 3️⃣  任务生成 → 4️⃣  计划确认  ║');
    console.log('║   5️⃣  启动执行 → 6️⃣  智能推送 → 7️⃣  定期 Review                ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ 运行错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行
main();
