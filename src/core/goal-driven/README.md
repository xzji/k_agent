# Goal-Driven Agent - Unified Task Scheduler Architecture

This module implements the upgraded architecture that fuses the 9-module pipeline with a unified task scheduling model.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      UnifiedTaskScheduler                               │
│                    (BackgroundLoop + TaskScheduler)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐ │
│  │ Exploration │    │  Recurring  │    │ Interactive │    │  One-   │ │
│  │   Tasks     │    │   Tasks     │    │   Tasks     │    │  Time   │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └────┬────┘ │
│         │                  │                  │                │      │
│         └──────────────────┴──────────────────┴────────────────┘      │
│                                    │                                  │
│                         ┌──────────▼──────────┐                       │
│                         │   Dependency Graph  │                       │
│                         │   + Cycle Detection │                       │
│                         └──────────┬──────────┘                       │
│                                    │                                  │
│                         ┌──────────▼──────────┐                       │
│                         │  Execution Pipeline │                       │
│                         │  (9-Module System)  │                       │
│                         └──────────┬──────────┘                       │
│                                    │                                  │
│    ┌───────────────┐    ┌──────────┴──────────┐    ┌───────────────┐ │
│    │  Knowledge    │◄───┤   Result Synthesis  ├───►│  Notification │ │
│    │   Store       │    │                     │    │    Queue      │ │
│    └───────────────┘    └─────────────────────┘    └───────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. UnifiedTaskScheduler

The main scheduling engine that coordinates all task types:

- **Exploration Tasks**: Dimension-based information gathering
- **Recurring Tasks**: Periodic execution with adaptive adjustment
- **Interactive Tasks**: Progressive information collection with user interaction
- **Monitoring Tasks**: Continuous monitoring with change detection
- **Event-Triggered Tasks**: Conditional execution based on events
- **One-Time Tasks**: Single execution tasks

```typescript
const scheduler = new UnifiedTaskScheduler(
  taskStore,
  goalStore,
  knowledgeStore,
  notificationQueue,
  dependencyGraph,
  executionPipeline,
  idleDetector,
  userProfile,
  { maxConcurrent: 3, cycleIntervalMs: 60000 }
);

await scheduler.start();
```

### 2. TaskStore

JSON-based task persistence with the following structure:

```
~/.pi/agent/goal-driven/
├── goals/
│   └── goals.json           # Goal definitions
├── tasks/
│   └── {goalId}/
│       └── tasks.json       # Task lists per goal
└── knowledge/
    └── global.jsonl         # Knowledge entries (append-only)
```

### 3. TaskDependencyGraph

Manages task dependencies with:
- Kahn's algorithm for topological sorting
- Cycle detection
- Automatic status propagation

```typescript
const depGraph = new TaskDependencyGraph(taskStore);

// Check for cycles
const cycles = depGraph.detectCircularDependencies(tasks);

// Check if dependencies are met
const canExecute = await depGraph.checkDependencies(taskId);

// Get execution order
const order = depGraph.getExecutionOrder(tasks);
```

### 4. ContextGatherer

Progressive information collection for interactive tasks:

```typescript
const gatherer = new ContextGatherer(taskStore, notificationQueue, llm);

// Start gathering
const task = await gatherer.startInteractiveGathering(goal);

// Process user response
const result = await gatherer.processUserResponse(taskId, userResponse);
if (result.hasEnoughInfo) {
  // Proceed to task decomposition
}
```

**State Machine:**
```
pending → ready → in_progress → waiting_user → ready → completed
                          ↑                        │
                          └──── user response ─────┘
```

### 5. SuccessCriteriaChecker

Automatic goal progress evaluation:

```typescript
const checker = new SuccessCriteriaChecker(
  goalStore, taskStore, knowledgeStore, notificationQueue, llm
);

// Evaluate progress
const report = await checker.evaluateGoalProgress(goalId);

// Handle user confirmation
if (report.canAutoComplete) {
  await checker.handleCompletionConfirmation(goalId, 'complete');
}

// Handle incomplete feedback
await checker.handleIncompleteFeedback(goalId, userFeedback);
```

### 6. KnowledgeStore

Goal-scoped knowledge reuse:

```typescript
const knowledgeStore = new KnowledgeStore();

// Save knowledge
await knowledgeStore.save({
  goalId,
  taskId,
  content: 'Important finding...',
  category: 'research',
  tags: ['important', 'verified'],
  importance: 0.9,
});

// Get relevant knowledge for task
const knowledge = await knowledgeStore.getRelevantKnowledgeForTask(
  task,
  query,
  { maxResults: 5, minRelevance: 0.6 }
);

// Inject into prompt
const enhancedPrompt = await knowledgeStore.injectKnowledgeIntoPrompt(
  task,
  basePrompt,
  { maxResults: 3 }
);
```

## Task Types

| Type | Description | Use Case |
|------|-------------|----------|
| `exploration` | Dimension-based info gathering | Research, discovery |
| `one_time` | Single execution | Setup, initialization |
| `recurring` | Periodic with adaptation | Practice, reminders |
| `interactive` | Requires user input | Preference collection |
| `monitoring` | Continuous monitoring | Alerts, tracking |
| `event_triggered` | Conditional execution | Notifications, triggers |

## Data Models

### Task

```typescript
interface Task {
  id: string;
  goalId: string;
  dimensionId?: string;
  parentTaskId?: string;

  title: string;
  description: string;
  type: TaskType;
  priority: PriorityLevel;
  status: TaskStatus;

  execution: ExecutionConfig;
  schedule?: ScheduleConfig;
  adaptiveConfig: AdaptiveConfig;

  dependencies: string[];
  executionHistory: ExecutionRecord[];

  // Interactive task specific
  pendingQuestions?: QuestionBatch;
  collectedInfo?: Record<string, unknown>;
}
```

### SuccessCriterion

```typescript
interface SuccessCriterion {
  id: string;
  description: string;
  type: 'milestone' | 'deliverable' | 'condition';
  completed: boolean;
  completedAt?: number;
}
```

### Goal

```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: PriorityLevel;

  dimensions: Dimension[];
  successCriteria: SuccessCriterion[];
  progress: GoalProgress;

  userContext: GoalUserContext;
}
```

## Usage Example

```typescript
import {
  UnifiedTaskScheduler,
  TaskStore,
  GoalStore,
  KnowledgeStore,
  NotificationQueue,
  TaskDependencyGraph,
  ContextGatherer,
  SuccessCriteriaChecker,
} from './index';

// Initialize stores
const goalStore = new GoalStore();
const taskStore = new TaskStore();
const knowledgeStore = new KnowledgeStore();
const notificationQueue = new NotificationQueue();

await goalStore.init();
await taskStore.init();
await knowledgeStore.init();

// Create goal
const goal = await goalStore.createGoal({
  title: 'Learn TypeScript',
  description: 'Master TypeScript for professional development',
  status: 'gathering_info',
  priority: 'high',
  dimensions: [
    {
      name: 'Learning Resources',
      priority: 'high',
      infoNeeds: [{ description: 'Find best TypeScript courses' }],
      sources: [{ type: 'web_search', config: {} }],
    },
  ],
  successCriteria: [
    {
      description: 'Complete 3 online courses',
      type: 'deliverable',
      completed: false,
    },
    {
      description: 'Build a production project',
      type: 'milestone',
      completed: false,
    },
  ],
  progress: { completedCriteria: 0, totalCriteria: 2, percentage: 0 },
  userContext: { collectedInfo: {} },
});

// Create scheduler
const dependencyGraph = new TaskDependencyGraph(taskStore);
const scheduler = new UnifiedTaskScheduler(
  taskStore,
  goalStore,
  knowledgeStore,
  notificationQueue,
  dependencyGraph,
  executionPipeline,
  idleDetector,
  userProfile
);

// Start scheduling
await scheduler.start();

// Handle user response to interactive task
scheduler.handleUserResponse(taskId, userResponse);
```

## Configuration

### SchedulerConfig

```typescript
interface SchedulerConfig {
  maxConcurrent: number;        // Default: 3
  defaultPriority: PriorityLevel; // Default: 'medium'
  cycleIntervalMs: number;      // Default: 60000 (1 minute)
  enableConcurrency: boolean;   // Default: true
}
```

### Storage Configuration

Set via environment variable:

```bash
export GOAL_DRIVEN_STORAGE=~/.pi/agent/goal-driven
```

## Testing

Run the tests:

```bash
npm test
```

## License

MIT
