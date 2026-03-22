/**
 * Goal-Driven Agent End-to-End Test
 *
 * This test simulates the complete user flow similar to buy_car_demo_showcase.js
 * Tests the full orchestration flow: goal creation -> info gathering -> subgoal decomposition -> task generation
 * Run with: npx tsx coding-agent/test/goal-driven-e2e.test.ts
 */

import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';

import {
  GoalOrchestrator,
  UnifiedTaskScheduler,
  GoalStore,
  TaskStore,
  KnowledgeStore,
  SubGoalStore,
  NotificationQueue,
  ContextGatherer,
  SuccessCriteriaChecker,
  TaskDependencyGraph,
  ValueAssessor,
  PlanPresenter,
  TaskPlanner,
  SubGoalPlanner,
} from '../src/core/goal-driven/index.js';

// Test configuration
const TEST_DATA_DIR = join(process.cwd(), '.test-data', 'goal-driven-e2e');

// Mock LLM Channel that simulates responses
class MockLLMChannel {
  private responseQueue: Array<{ type: string; data: unknown }> = [];

  queueResponse(type: string, data: unknown) {
    this.responseQueue.push({ type, data });
  }

  async complete(prompt: string, options?: Record<string, unknown>): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }> {
    const response = this.responseQueue.shift();
    if (!response) {
      return { content: '{"result": "success"}', usage: { total_tokens: 100 } };
    }
    return { content: JSON.stringify(response.data), usage: { total_tokens: 100 } };
  }

  async chatJSON<T>(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
  }): Promise<T> {
    const response = this.responseQueue.shift();
    if (!response) {
      return { questions: [], hasEnoughInfo: true, reasoning: 'Mock response' } as T;
    }
    return response.data as T;
  }
}

// Mock Idle Detector
class MockIdleDetector {
  private idle = true;

  async isUserIdle(): Promise<boolean> {
    return this.idle;
  }

  getLastActivityTime(): number {
    return Date.now() - 60000; // 1 minute ago
  }

  recordActivity(): void {
    this.idle = false;
  }

  setIdle(idle: boolean): void {
    this.idle = idle;
  }
}

// Mock Execution Pipeline
class MockExecutionPipeline {
  async run(task: any): Promise<any> {
    return {
      success: true,
      output: `Executed: ${task.title}`,
      duration: 100,
      metadata: {
        summary: 'Task completed',
        keyPoints: ['Point 1', 'Point 2'],
      },
    };
  }
}

async function setupEnvironment() {
  try {
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {}
  await mkdir(TEST_DATA_DIR, { recursive: true });
  process.env.GOAL_DRIVEN_STORAGE = TEST_DATA_DIR;
}

async function cleanupEnvironment() {
  try {
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {}
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Goal-Driven Agent E2E Test');
  console.log('  Simulating: Buy Car Scenario');
  console.log('═══════════════════════════════════════════════════════════\n');

  await setupEnvironment();

  const testResults: { name: string; passed: boolean; error?: string }[] = [];

  async function runTest(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      testResults.push({ name, passed: true });
      console.log(`✅ ${name}`);
    } catch (error) {
      testResults.push({ name, passed: false, error: String(error) });
      console.log(`❌ ${name}: ${error}`);
    }
  }

  // Initialize all components
  console.log('📦 Initializing components...\n');

  const goalStore = new GoalStore(TEST_DATA_DIR);
  const taskStore = new TaskStore(TEST_DATA_DIR);
  const knowledgeStore = new KnowledgeStore(TEST_DATA_DIR);
  const subGoalStore = new SubGoalStore(TEST_DATA_DIR);
  const notificationQueue = new NotificationQueue();
  const dependencyGraph = new TaskDependencyGraph(taskStore);

  const llmChannel = new MockLLMChannel();
  const idleDetector = new MockIdleDetector();
  const executionPipeline = new MockExecutionPipeline();

  await goalStore.init();
  await taskStore.init();
  await knowledgeStore.init();
  await subGoalStore.init();

  const contextGatherer = new ContextGatherer(taskStore, notificationQueue, llmChannel);
  const successCriteriaChecker = new SuccessCriteriaChecker(
    goalStore,
    taskStore,
    knowledgeStore,
    notificationQueue,
    llmChannel
  );

  const valueAssessor = new ValueAssessor(taskStore, knowledgeStore, llmChannel, {
    minRelevanceThreshold: 0.5,
    minNoveltyThreshold: 0.3,
  });

  const userProfile = {
    userId: 'test-user',
    preferences: {
      notificationFrequency: 'immediate' as const,
    },
  };

  const scheduler = new UnifiedTaskScheduler(
    taskStore,
    goalStore,
    knowledgeStore,
    notificationQueue,
    dependencyGraph,
    executionPipeline as any,
    idleDetector as any,
    userProfile,
    valueAssessor,
    {
      maxConcurrent: 2,
      cycleIntervalMs: 30000,
      enableConcurrency: true,
    }
  );

  const orchestrator = new GoalOrchestrator(
    goalStore,
    taskStore,
    knowledgeStore,
    notificationQueue,
    contextGatherer,
    scheduler,
    successCriteriaChecker,
    llmChannel as any,
    idleDetector as any,
    userProfile,
    subGoalStore
  );

  await orchestrator.init();

  console.log('✅ All components initialized\n');

  // Test 1: Start Goal (Phase 1 - Info Gathering)
  await runTest('Phase 1: Start Goal - Info Gathering', async () => {
    // Queue LLM responses for question generation
    llmChannel.queueResponse('questions', {
      questions: [
        {
          id: 'q1',
          question: '您主要用车场景是什么？（城市通勤/长途自驾/商务等）',
          purpose: '了解用车需求',
          expectedType: 'string',
        },
        {
          id: 'q2',
          question: '您的购车预算范围是多少？',
          purpose: '确定预算区间',
          expectedType: 'string',
        },
      ],
      hasEnoughInfo: false,
      reasoning: '需要收集基本信息',
    });

    const result = await orchestrator.startGoal('我想买一辆SUV，预算20万以内，油车，要省油');

    if (!result.goalId) {
      throw new Error('Goal should have an ID');
    }

    if (!result.interactiveTaskId) {
      throw new Error('Should create an interactive task');
    }

    // Verify goal status
    const goal = await goalStore.getGoal(result.goalId);
    if (goal?.status !== 'gathering_info') {
      throw new Error('Goal status should be gathering_info');
    }

    console.log(`   Created goal: ${result.goalId.slice(0, 8)}...`);
    console.log(`   Interactive task: ${result.interactiveTaskId.slice(0, 8)}...`);

    // Store for later tests
    (global as any).testGoalId = result.goalId;
    (global as any).testInteractiveTaskId = result.interactiveTaskId;
  });

  // Test 2: Handle User Response (Continue Info Gathering)
  await runTest('Phase 1b: Handle User Response', async () => {
    const goalId = (global as any).testGoalId;
    const interactiveTaskId = (global as any).testInteractiveTaskId;

    // Queue responses in order of use:
    // 1. First extractInfoFromResponse is called (needs 'extract' response)
    llmChannel.queueResponse('extract', {
      extractedInfo: {
        usageScenario: '城市通勤为主，偶尔周末自驾游',
        annualMileage: '1.5-2万公里',
        budget: '20万以内',
        passengerCount: '主要2人，偶尔4-5人',
        brandPreference: '国产或合资都可以',
      },
      unclearPoints: [],
      followUpNeeded: false,
    });

    // 2. Then checkInfoSufficiency is called (needs 'sufficiency' response)
    llmChannel.queueResponse('sufficiency', {
      hasEnoughInfo: true,
      confidence: 0.85,
      reasoning: '已收集足够信息',
      missingCriticalInfo: [],
    });

    const result = await contextGatherer.processUserResponse(
      interactiveTaskId,
      '主要城市通勤，偶尔周末自驾，预算20万以内，主要2人使用'
    );

    if (!result.extractedInfo) {
      throw new Error('Should extract info from response');
    }

    console.log(`   Extracted ${Object.keys(result.extractedInfo).length} info items`);
    console.log(`   Has enough info: ${result.hasEnoughInfo}`);
  });

  // Test 3: Decompose SubGoals (Phase 2-3)
  await runTest('Phase 2-3: Decompose SubGoals', async () => {
    const goalId = (global as any).testGoalId;

    // Queue LLM response for subgoal decomposition
    llmChannel.queueResponse('subgoals', {
      subGoals: [
        {
          name: '筛选符合需求的车型清单',
          description: '基于预算和需求筛选候选车型',
          priority: 'high',
          weight: 0.25,
          dependencies: [],
          estimatedDurationMinutes: 480,
          successCriteria: [
            { description: '输出5-8款候选车型', type: 'deliverable' },
          ],
        },
        {
          name: '收集目标车型详细参数与口碑',
          description: '对比油耗、空间、配置、可靠性',
          priority: 'high',
          weight: 0.25,
          dependencies: ['temp-0'],
          estimatedDurationMinutes: 480,
          successCriteria: [
            { description: '完成参数对比表', type: 'deliverable' },
          ],
        },
        {
          name: '获取本地经销商报价信息',
          description: '3-5家4S店报价对比',
          priority: 'medium',
          weight: 0.2,
          dependencies: ['temp-1'],
          estimatedDurationMinutes: 720,
          successCriteria: [
            { description: '获得3家以上报价', type: 'deliverable' },
          ],
        },
        {
          name: '安排试驾体验',
          description: '试驾2-3款意向车型',
          priority: 'high',
          weight: 0.15,
          dependencies: ['temp-2'],
          estimatedDurationMinutes: 960,
          successCriteria: [
            { description: '完成试驾', type: 'deliverable' },
          ],
        },
        {
          name: '确定最终购车方案',
          description: '选定车型、配置、颜色',
          priority: 'high',
          weight: 0.15,
          dependencies: ['temp-3'],
          estimatedDurationMinutes: 480,
          successCriteria: [
            { description: '确定购车方案', type: 'deliverable' },
          ],
        },
      ],
      reasoning: '按照购车决策流程拆解',
    });

    const subGoals = await orchestrator.decomposeSubGoals(goalId);

    if (subGoals.length === 0) {
      throw new Error('Should create subgoals');
    }

    console.log(`   Created ${subGoals.length} subgoals:`);
    subGoals.forEach((sg, i) => {
      console.log(`   ${i + 1}. ${sg.name} (${sg.priority})`);
    });

    // Store for later
    (global as any).testSubGoalIds = subGoals.map(sg => sg.id);
  });

  // Test 4: Generate Tasks (Phase 4-5)
  await runTest('Phase 4-5: Generate and Review Tasks', async () => {
    const goalId = (global as any).testGoalId;

    // Queue task generation responses for each subgoal
    for (let i = 0; i < 5; i++) {
      llmChannel.queueResponse('tasks', {
        tasks: [
          {
            title: `任务 ${i + 1}-1: 搜索信息`,
            description: '搜索相关信息',
            execution_cycle: 'once',
            execution_mode: 'standard',
            hierarchyLevel: 'task',
            priority: 'high',
            expectedResult: {
              type: 'information',
              description: '收集到的信息',
              format: 'markdown',
            },
            estimatedDurationMinutes: 60,
          },
          {
            title: `任务 ${i + 1}-2: 整理报告`,
            description: '整理并生成报告',
            execution_cycle: 'once',
            execution_mode: 'standard',
            hierarchyLevel: 'task',
            priority: 'high',
            expectedResult: {
              type: 'deliverable',
              description: '报告文档',
              format: 'markdown',
            },
            estimatedDurationMinutes: 30,
          },
        ],
        reasoning: '根据子目标生成任务',
      });

      // Queue task review response
      llmChannel.queueResponse('review', {
        reviewResults: [
          {
            taskId: 'placeholder',
            goalContribution: 'high',
            subGoalContribution: 'critical',
            aligned: true,
            reasoning: '任务与目标对齐',
          },
        ],
      });
    }

    const result = await orchestrator.generateAndReviewTasks(goalId);

    console.log(`   Generated ${result.tasks.length} tasks`);
    console.log(`   Reviewed ${result.reviewResults.length} tasks`);
  });

  // Test 5: Present Plan (Phase 6)
  await runTest('Phase 6: Present Plan for Confirmation', async () => {
    const goalId = (global as any).testGoalId;

    const result = await orchestrator.presentPlanForConfirmation(goalId);

    if (!result.report) {
      throw new Error('Should generate plan report');
    }

    console.log(`   Goal: ${result.report.goalTitle}`);
    console.log(`   SubGoals: ${result.report.summary.subGoalCount}`);
    console.log(`   Tasks: ${result.report.summary.taskCount}`);
    console.log(`   Confirmed: ${result.confirmed}`);
  });

  // Test 6: Start Execution (Phase 7)
  await runTest('Phase 7: Start Execution', async () => {
    const goalId = (global as any).testGoalId;

    // Mark plan as confirmed first
    const state = orchestrator.getState(goalId);
    if (state) {
      (state as any).planConfirmed = true;
    }

    await orchestrator.startExecution(goalId);

    const goal = await goalStore.getGoal(goalId);
    if (goal?.status !== 'active') {
      throw new Error('Goal status should be active after starting execution');
    }

    console.log(`   Goal status: ${goal.status}`);
    console.log(`   Scheduler running: ${scheduler.isRunning()}`);

    // Stop scheduler for test cleanup
    await scheduler.stop();
  });

  // Test 7: Verify Complete Flow
  await runTest('Complete Flow Verification', async () => {
    const goalId = (global as any).testGoalId;

    const goal = await goalStore.getGoal(goalId);
    const tasks = await taskStore.getTasksByGoal(goalId);
    const subGoals = await subGoalStore.getSubGoalsByGoal(goalId);

    console.log(`   Goal: ${goal?.title}`);
    console.log(`   Status: ${goal?.status}`);
    console.log(`   SubGoals: ${subGoals.length}`);
    console.log(`   Tasks: ${tasks.length}`);

    if (subGoals.length === 0) {
      throw new Error('Should have subgoals');
    }

    if (tasks.length === 0) {
      throw new Error('Should have tasks');
    }

    // Verify task types
    const explorationTasks = tasks.filter(t => t.type === 'exploration');
    const oneTimeTasks = tasks.filter(t => t.type === 'one_time');

    console.log(`   Exploration tasks: ${explorationTasks.length}`);
    console.log(`   One-time tasks: ${oneTimeTasks.length}`);
  });

  // Test 8: Knowledge Storage
  await runTest('Knowledge Storage', async () => {
    const goalId = (global as any).testGoalId;

    // Save some knowledge
    await knowledgeStore.save({
      goalId,
      content: '本田XR-V是一款省油的紧凑型SUV，车主众测油耗约6.8L/100km',
      category: 'car_info',
      tags: ['SUV', '省油', '本田'],
      importance: 0.9,
      relatedDimensionIds: [],
    });

    await knowledgeStore.save({
      goalId,
      content: '丰田锋兰达实际油耗约7.2L/100km，空间表现不错',
      category: 'car_info',
      tags: ['SUV', '省油', '丰田'],
      importance: 0.85,
      relatedDimensionIds: [],
    });

    const entries = await knowledgeStore.getByGoal(goalId);

    if (entries.length !== 2) {
      throw new Error(`Should have 2 knowledge entries, got ${entries.length}`);
    }

    console.log(`   Saved ${entries.length} knowledge entries`);

    // Test search
    const searchResults = await knowledgeStore.search('丰田');
    if (searchResults.length === 0) {
      throw new Error('Search should find the Toyota entry');
    }

    console.log(`   Search '丰田': ${searchResults.length} results`);
  });

  // Print Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Test Summary');
  console.log('═══════════════════════════════════════════════════════════');

  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  console.log(`\nTotal: ${testResults.length} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n');

  await cleanupEnvironment();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('E2E test failed with error:', error);
  process.exit(1);
});
