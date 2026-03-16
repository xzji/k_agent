/**
 * Goal-Driven Agent Integration Test
 *
 * This test verifies that all components are properly integrated and functional.
 * Run with: npx tsx coding-agent/test/goal-driven-integration.test.ts
 */

import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';

// Import all components from the extension
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

// Import adapters
import {
  CodingAgentLLMChannel,
  CodingAgentExecutionPipeline,
  CodingAgentIdleDetector,
} from '../src/core/goal-driven/runtime/coding-agent-adapter.js';

// Import IdleDetector
import { IdleDetector } from '../src/core/goal-driven/output-layer/idle-detector.js';

// Test configuration
const TEST_DATA_DIR = join(process.cwd(), '.test-data', 'goal-driven');

// Mock ExtensionAPI
const createMockExtensionAPI = () => ({
  registerCommand: () => {},
  registerMessageRenderer: () => {},
  sendMessage: () => {},
  on: () => {},
  notify: () => {},
});

// Test results
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

async function setupTestEnvironment() {
  // Clean up test data
  try {
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore
  }

  // Create test directory
  await mkdir(TEST_DATA_DIR, { recursive: true });

  // Set environment variable
  process.env.GOAL_DRIVEN_STORAGE = TEST_DATA_DIR;
}

async function cleanupTestEnvironment() {
  try {
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Goal-Driven Agent Integration Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  await setupTestEnvironment();

  // Test 1: Store Initialization
  await runTest('GoalStore initialization', async () => {
    const goalStore = new GoalStore(TEST_DATA_DIR);
    await goalStore.init();

    const goals = await goalStore.getAllGoals();
    if (!Array.isArray(goals)) {
      throw new Error('getAllGoals should return an array');
    }
  });

  await runTest('TaskStore initialization', async () => {
    const taskStore = new TaskStore(TEST_DATA_DIR);
    await taskStore.init();

    const tasks = await taskStore.getAllTasks();
    if (!Array.isArray(tasks)) {
      throw new Error('getAllTasks should return an array');
    }
  });

  await runTest('KnowledgeStore initialization', async () => {
    const knowledgeStore = new KnowledgeStore(TEST_DATA_DIR);
    await knowledgeStore.init();

    const entries = await knowledgeStore.search('test');
    if (!Array.isArray(entries)) {
      throw new Error('search should return an array');
    }
  });

  await runTest('SubGoalStore initialization', async () => {
    const subGoalStore = new SubGoalStore(TEST_DATA_DIR);
    await subGoalStore.init();

    const subGoals = await subGoalStore.getSubGoalsByGoal('test-goal');
    if (!Array.isArray(subGoals)) {
      throw new Error('getSubGoalsByGoal should return an array');
    }
  });

  // Test 2: NotificationQueue
  await runTest('NotificationQueue operations', async () => {
    const queue = new NotificationQueue();

    queue.enqueue({
      type: 'info',
      priority: 'high',
      title: 'Test',
      content: 'Test content',
    });

    if (queue.pendingCount !== 1) {
      throw new Error('pendingCount should be 1');
    }

    const notification = queue.dequeue();
    if (!notification) {
      throw new Error('dequeue should return a notification');
    }

    if (queue.pendingCount !== 0) {
      throw new Error('pendingCount should be 0 after dequeue');
    }
  });

  // Test 3: TaskDependencyGraph
  await runTest('TaskDependencyGraph initialization', async () => {
    const taskStore = new TaskStore(TEST_DATA_DIR);
    await taskStore.init();

    const depGraph = new TaskDependencyGraph(taskStore);
    if (!depGraph) {
      throw new Error('TaskDependencyGraph should be created');
    }
  });

  // Test 4: Create Goal and Task
  await runTest('Create goal and task', async () => {
    const goalStore = new GoalStore(TEST_DATA_DIR);
    const taskStore = new TaskStore(TEST_DATA_DIR);
    await goalStore.init();
    await taskStore.init();

    const goal = await goalStore.createGoal({
      title: 'Test Goal',
      description: 'Test description',
      status: 'gathering_info',
      priority: 'high',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    if (!goal.id) {
      throw new Error('Goal should have an ID');
    }

    const task = await taskStore.createTask({
      goalId: goal.id,
      title: 'Test Task',
      description: 'Test task description',
      type: 'one_time',
      priority: 'high',
      status: 'ready',
      execution: {
        agentPrompt: 'Test prompt',
        requiredTools: [],
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

    if (!task.id) {
      throw new Error('Task should have an ID');
    }

    const retrievedGoal = await goalStore.getGoal(goal.id);
    if (!retrievedGoal) {
      throw new Error('Should be able to retrieve the created goal');
    }

    const retrievedTask = await taskStore.getTask(task.id);
    if (!retrievedTask) {
      throw new Error('Should be able to retrieve the created task');
    }
  });

  // Test 5: KnowledgeStore operations
  await runTest('KnowledgeStore save and retrieve', async () => {
    const knowledgeStore = new KnowledgeStore(TEST_DATA_DIR);
    await knowledgeStore.init();

    const entry = await knowledgeStore.save({
      goalId: 'test-goal',
      content: 'Test knowledge entry',
      category: 'test',
      tags: ['test'],
      importance: 0.8,
      relatedDimensionIds: [],
    });

    if (!entry.id) {
      throw new Error('Knowledge entry should have an ID');
    }

    const retrieved = await knowledgeStore.getById(entry.id);
    if (!retrieved) {
      throw new Error('Should be able to retrieve the saved entry');
    }

    if (retrieved.content !== 'Test knowledge entry') {
      throw new Error('Retrieved entry should have correct content');
    }
  });

  // Test 6: SubGoalStore operations
  await runTest('SubGoalStore create and retrieve', async () => {
    const subGoalStore = new SubGoalStore(TEST_DATA_DIR);
    await subGoalStore.init();

    const subGoal = await subGoalStore.createSubGoal({
      goalId: 'test-goal',
      name: 'Test SubGoal',
      description: 'Test subgoal description',
      priority: 'high',
      status: 'pending',
      weight: 0.5,
      dependencies: [],
      taskIds: [],
      successCriteria: [],
    });

    if (!subGoal.id) {
      throw new Error('SubGoal should have an ID');
    }

    const retrieved = await subGoalStore.getSubGoal(subGoal.id);
    if (!retrieved) {
      throw new Error('Should be able to retrieve the created subgoal');
    }
  });

  // Test 7: Test clearAll methods
  await runTest('KnowledgeStore clearAll', async () => {
    const knowledgeStore = new KnowledgeStore(TEST_DATA_DIR);
    await knowledgeStore.init();

    await knowledgeStore.save({
      goalId: 'test-goal',
      content: 'Test entry',
      category: 'test',
      tags: ['test'],
      importance: 0.5,
      relatedDimensionIds: [],
    });

    await knowledgeStore.clearAll();

    const entries = await knowledgeStore.search('test');
    if (entries.length !== 0) {
      throw new Error('clearAll should remove all entries');
    }
  });

  await runTest('TaskStore clearAll', async () => {
    const goalStore = new GoalStore(TEST_DATA_DIR);
    const taskStore = new TaskStore(TEST_DATA_DIR);
    await goalStore.init();
    await taskStore.init();

    const goal = await goalStore.createGoal({
      title: 'Test Goal for clearAll',
      description: 'Test',
      status: 'gathering_info',
      priority: 'medium',
      dimensions: [],
      successCriteria: [],
      progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
      userContext: { collectedInfo: {} },
    });

    await taskStore.createTask({
      goalId: goal.id,
      title: 'Test Task',
      description: 'Test',
      type: 'one_time',
      priority: 'medium',
      status: 'ready',
      execution: {
        agentPrompt: 'Test',
        requiredTools: [],
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

    await taskStore.clearAll();

    const tasks = await taskStore.getAllTasks();
    if (tasks.length !== 0) {
      throw new Error('clearAll should remove all tasks');
    }
  });

  // Test 8: Verify all exports from index.ts
  await runTest('All components are exported from index.ts', async () => {
    const components = {
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
    };

    for (const [name, Component] of Object.entries(components)) {
      if (!Component) {
        throw new Error(`${name} is not exported`);
      }
    }
  });

  // Test 9: Verify adapters are exported
  await runTest('Adapters are exported correctly', async () => {
    if (!CodingAgentLLMChannel) {
      throw new Error('CodingAgentLLMChannel is not exported');
    }
    if (!CodingAgentExecutionPipeline) {
      throw new Error('CodingAgentExecutionPipeline is not exported');
    }
    if (!CodingAgentIdleDetector) {
      throw new Error('CodingAgentIdleDetector is not exported');
    }
  });

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
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

  await cleanupTestEnvironment();

  console.log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
