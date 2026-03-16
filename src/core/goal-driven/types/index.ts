/**
 * Goal-Driven Agent - Core Types
 *
 * This module defines all the type definitions for the goal-driven agent architecture,
 * including tasks, goals, success criteria, and execution-related types.
 */

// ============================================================================
// Priority and Status Enums
// ============================================================================

/**
 * Priority levels for tasks and goals
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'background';

/**
 * Task types supported by the unified scheduler
 */
export type TaskType =
  | 'exploration'      // Dimension exploration tasks
  | 'one_time'         // One-time execution tasks
  | 'recurring'        // Periodic recurring tasks
  | 'event_triggered'  // Event-driven tasks
  | 'monitoring'       // Continuous monitoring tasks
  | 'interactive';     // Tasks requiring user interaction

/**
 * Task status in the state machine
 */
export type TaskStatus =
  | 'pending'        // Waiting to be scheduled
  | 'blocked'        // Dependencies not met
  | 'ready'          // Ready for execution
  | 'in_progress'    // Currently executing
  | 'waiting_user'   // Waiting for user input
  | 'completed'      // Successfully completed
  | 'failed'         // Execution failed
  | 'cancelled';     // Cancelled by user or system

/**
 * Task hierarchy level
 * 支持层级：task → sub_task → action
 */
export type TaskHierarchyLevel = 'task' | 'sub_task' | 'action';

/**
 * Expected result type for task
 */
export type ExpectedResultType = 'information' | 'deliverable' | 'decision' | 'action' | 'confirmation';

/**
 * Task expected result definition
 */
export interface TaskExpectedResult {
  type: ExpectedResultType;
  description: string;
  format: 'json' | 'markdown' | 'table' | 'text' | 'code';
  validationCriteria?: string[];  // 验证结果是否合格的标准
}

/**
 * Goal status
 */
export type GoalStatus =
  | 'gathering_info'  // Collecting initial information
  | 'planning'        // Creating task plan
  | 'active'          // Actively being pursued
  | 'paused'          // Temporarily paused
  | 'completed';      // All success criteria met

// ============================================================================
// Execution Related Types
// ============================================================================

/**
 * Capability modes for tool adaptation
 */
export type CapabilityMode = 'direct' | 'composite' | 'creative' | 'escalate';

/**
 * Execution configuration for a task
 */
export interface ExecutionConfig {
  agentPrompt: string;
  requiredTools: string[];
  requiredContext: string[];
  estimatedDuration?: number;
  capabilityMode: CapabilityMode;
}

/**
 * Schedule configuration for recurring tasks
 */
export interface ScheduleConfig {
  type: 'interval';
  intervalMs: number;
  maxExecutions?: number;
  startAt?: number;
}

/**
 * Single execution record
 */
export interface ExecutionRecord {
  timestamp: number;
  status: 'success' | 'failed' | 'cancelled';
  duration?: number;
  userRating?: number;      // 1-5 star rating
  completionRate?: number;  // 0-1 completion percentage
  tokenUsage?: number;
  summary?: string;
  output?: string;
  error?: string;
}

/**
 * Adaptive configuration for task behavior
 */
export interface AdaptiveConfig {
  canAdjustDifficulty: boolean;
  canAdjustFrequency: boolean;
  successThreshold: number;  // Below this, adjustments are made
  executionHistory: ExecutionRecord[];
}

// ============================================================================
// Question and Interaction Types
// ============================================================================

/**
 * Choice option with optional custom input support
 */
export interface ChoiceOption {
  value: string;
  label: string;
  allowCustom?: boolean;  // 是否允许用户输入自定义值
}

/**
 * A single question in an interactive batch
 */
export interface Question {
  id: string;
  question: string;
  purpose: string;
  expectedType: 'string' | 'number' | 'choice' | 'boolean' | 'multichoice';
  choices?: ChoiceOption[];  // For choice/multichoice type
}

/**
 * A batch of questions for interactive gathering
 */
export interface QuestionBatch {
  questions: Question[];
  context?: string;
}

/**
 * Extracted information from user response
 */
export interface ExtractedInfo {
  [key: string]: unknown;
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task actual result after execution
 */
export interface TaskActualResult {
  content: string;
  type: ExpectedResultType;
  format: string;
  timestamp: number;
  quality: number;  // 质量评分 0-1
}

/**
 * Core Task interface
 */
export interface Task {
  id: string;
  goalId: string;
  subGoalId?: string;     // Associated sub-goal (optional)
  dimensionId?: string;   // Associated dimension (optional)
  parentTaskId?: string;  // Parent task for nesting

  title: string;
  description: string;
  type: TaskType;
  priority: PriorityLevel;
  status: TaskStatus;

  // Hierarchy level (optional for backward compatibility)
  hierarchyLevel?: TaskHierarchyLevel;

  // Execution configuration
  execution: ExecutionConfig;

  // Expected result definition (optional for backward compatibility)
  expectedResult?: TaskExpectedResult;

  // Actual result after execution
  actualResult?: TaskActualResult;

  // Schedule configuration (for recurring tasks)
  schedule?: ScheduleConfig;

  // Adaptive configuration
  adaptiveConfig: AdaptiveConfig;

  // Related knowledge IDs
  relatedKnowledgeIds: string[];

  // Dependencies
  dependencies: string[];

  // Interactive task specific
  pendingQuestions?: QuestionBatch;
  collectedInfo?: Record<string, unknown>;

  // Notification strategy (from buy_car_demo_showcase)
  valueThreshold?: number;        // 价值阈值 0-1，决定是否推送
  shouldNotify?: boolean;         // 是否应该推送给用户
  notifyReason?: string;          // 推送原因说明
  notifyTiming?: string;          // 推送时机（如"立即","完成后","每天一次"等）
  requiresUserInput?: boolean;    // 是否需要用户输入
  userRole?: string;              // 用户在此任务中的角色

  // Execution tracking
  executionHistory: ExecutionRecord[];

  // Timestamps
  createdAt: number;
  lastExecutedAt?: number;
  nextExecutionAt?: number;
  updatedAt?: number;
}

/**
 * Unified task type for internal scheduling
 */
export interface UnifiedTask {
  id: string;
  type: TaskType;
  goalId: string;
  dimensionId?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  nextExecutionAt?: number;
  taskRef?: Task;  // Reference to actual task
}

// ============================================================================
// Success Criteria Types
// ============================================================================

/**
 * Success criterion type
 */
export type SuccessCriterionType = 'milestone' | 'deliverable' | 'condition';

/**
 * Individual success criterion
 */
export interface SuccessCriterion {
  id: string;
  description: string;
  type: SuccessCriterionType;
  completed: boolean;
  completedAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Goal progress tracking
 */
export interface GoalProgress {
  completedCriteria: number;
  totalCriteria: number;
  percentage: number;
  lastEvaluatedAt?: number;
}

/**
 * Progress report for goal evaluation
 */
export interface ProgressReport {
  goalId: string;
  percentage: number;
  completedCriteria: number;
  totalCriteria: number;
  evaluations: CriterionEvaluation[];
  canAutoComplete: boolean;
}

/**
 * Individual criterion evaluation result
 */
export interface CriterionEvaluation {
  criterionId: string;
  description: string;
  completed: boolean;
  reasoning: string;
  confidence: number;  // 0-1 confidence score
}

// ============================================================================
// Dimension Types
// ============================================================================

/**
 * Information need definition
 */
export interface InformationNeed {
  id: string;
  description: string;
  priority: PriorityLevel;
  satisfied?: boolean;
}

/**
 * Source configuration
 */
export interface SourceConfig {
  id: string;
  type: 'web_search' | 'file_system' | 'api' | 'user_input';
  config: Record<string, unknown>;
  priority: PriorityLevel;
}

/**
 * Dimension for exploration
 */
export interface Dimension {
  id: string;
  goalId: string;
  name: string;
  description?: string;
  priority: PriorityLevel;
  infoNeeds: InformationNeed[];
  sources: SourceConfig[];
  status: 'pending' | 'exploring' | 'completed';
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// Goal Types
// ============================================================================

/**
 * User context for goal
 */
export interface GoalUserContext {
  collectedInfo: Record<string, unknown>;
  requiredInfo?: string[];
  preferences?: Record<string, unknown>;
}

/**
 * Goal node definition
 */
export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: PriorityLevel;
  deadline?: number;

  // Sub-goals
  subGoals?: string[];  // SubGoal IDs

  // Exploration space
  dimensions: Dimension[];

  // Success tracking
  successCriteria: SuccessCriterion[];
  progress: GoalProgress;

  // User context
  userContext: GoalUserContext;

  // Timestamps
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
}

// ============================================================================
// Knowledge Types
// ============================================================================

/**
 * Knowledge entry
 */
export interface KnowledgeEntry {
  id: string;
  goalId: string;
  taskId?: string;
  content: string;
  category: string;
  tags: string[];
  importance: number;  // 0-1 importance score
  sourceUrl?: string;
  relatedDimensionIds: string[];
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;  // Soft delete
}

/**
 * Knowledge query options
 */
export interface KnowledgeQueryOptions {
  maxResults?: number;
  minRelevance?: number;
  category?: string;
  tags?: string[];
}

// ============================================================================
// Scheduler Types
// ============================================================================

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  maxConcurrent: number;
  defaultPriority: PriorityLevel;
  cycleIntervalMs: number;
  enableConcurrency: boolean;
}

/**
 * Execution result metadata
 */
export interface ExecutionResultMetadata {
  summary?: string;        // 结果摘要
  keyPoints?: string[];    // 关键要点
  actionItems?: string[];  // 行动项
}

/**
 * Execution result from pipeline
 */
export interface ExecutionResult {
  success: boolean;
  output?: string;
  outputType?: ExpectedResultType;
  outputFormat?: string;  // markdown, json, html等
  error?: string;
  tokenUsage?: number;
  duration: number;
  knowledgeEntries?: KnowledgeEntry[];

  // 新增：结果元数据
  metadata?: ExecutionResultMetadata;
}

/**
 * Pipeline context for task execution
 */
export interface PipelineContext {
  task: Task;
  goal: Goal;
  userProfile?: UserProfile;
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User preferences
 */
export interface UserPreferences {
  quietHours?: { start: number; end: number };  // Hour of day (0-23)
  notificationFrequency: 'immediate' | 'hourly_digest' | 'daily_digest';
  preferredNotificationTime?: number;  // Hour of day
}

/**
 * User profile
 */
export interface UserProfile {
  userId: string;
  preferences: UserPreferences;
  interactionPattern?: Record<string, unknown>;
  goalContexts?: Record<string, unknown>;
  createdAt: number;
  updatedAt?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

/**
 * Notification types
 */
export type NotificationType =
  | 'report'
  | 'help_request'
  | 'confirmation'
  | 'info'
  | 'urgent';

/**
 * Notification entry
 */
export interface Notification {
  id: string;
  type: NotificationType;
  priority: PriorityLevel;
  title: string;
  content: string;
  goalId?: string;
  taskId?: string;
  actionPlanId?: string;
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
}

// ============================================================================
// Performance and Adaptive Types
// ============================================================================

/**
 * Execution pattern extracted from history
 */
export interface ExecutionPattern {
  type: string;
  value: number;
  description: string;
}

/**
 * Performance assessment for adaptive planning
 */
export interface PerformanceAssessment {
  successRate: number;
  userSatisfaction: 'high' | 'medium' | 'low';
  requiresMajorAdjustment: boolean;
  suggestions: string[];
}

// ============================================================================
// Store Interface Types
// ============================================================================

/**
 * Task store interface
 */
export interface ITaskStore {
  getTask(taskId: string): Promise<Task | null>;
  getTasksByGoal(goalId: string): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  getReadyTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;
  updateStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, unknown>
  ): Promise<Task>;
  updateNextExecution(taskId: string, nextExecutionAt: number): Promise<Task>;
  addExecutionRecord(taskId: string, record: ExecutionRecord): Promise<Task>;
  addCollectedInfo(taskId: string, info: ExtractedInfo): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
}

/**
 * Goal store interface
 */
export interface IGoalStore {
  getGoal(goalId: string): Promise<Goal | null>;
  getActiveGoals(): Promise<Goal[]>;
  getAllGoals(): Promise<Goal[]>;
  createGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal>;
  updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal>;
  updateProgress(goalId: string, progress: GoalProgress): Promise<Goal>;
  deleteGoal(goalId: string): Promise<void>;
}

/**
 * Knowledge store interface
 */
export interface IKnowledgeStore {
  save(entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>): Promise<KnowledgeEntry>;
  getById(id: string): Promise<KnowledgeEntry | null>;
  getByGoal(goalId: string): Promise<KnowledgeEntry[]>;
  search(query: string, options?: KnowledgeQueryOptions): Promise<KnowledgeEntry[]>;
  getRelevantKnowledgeForTask(
    task: Task,
    query: string,
    options?: KnowledgeQueryOptions
  ): Promise<KnowledgeEntry[]>;
  delete(id: string): Promise<void>;
}

/**
 * Notification queue interface
 */
export interface INotificationQueue {
  enqueue(notification: Omit<Notification, 'id' | 'createdAt'>): Notification;
  dequeue(): Notification | undefined;
  peek(): Notification | undefined;
  getAll(): Notification[];
  hasUrgent(): boolean;
  markDelivered(id: string): void;
  markRead(id: string): void;
}

// Re-export sub-goal types
export * from './sub-goal';
