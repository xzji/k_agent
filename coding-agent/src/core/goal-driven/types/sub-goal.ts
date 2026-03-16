/**
 * SubGoal Types
 *
 * 子目标层类型定义，作为 Goal 和 Task 之间的规划层
 */

import type { PriorityLevel, SuccessCriterion } from './index';

/**
 * SubGoal status
 */
export type SubGoalStatus = 'pending' | 'active' | 'completed' | 'failed';

/**
 * SubGoal completion requirement mode
 */
export type CompletionRequirement = 'all' | 'any' | 'majority';

/**
 * SubGoal - 子目标定义
 *
 * 位于 Goal 和 Task 之间的规划层，用于：
 * 1. 将大目标拆解为可管理的阶段
 * 2. 定义阶段间的依赖关系
 * 3. 跟踪阶段性进展
 */
export interface SubGoal {
  id: string;
  goalId: string;

  name: string;
  description: string;
  priority: PriorityLevel;
  status: SubGoalStatus;

  // 与最终目标的关系
  weight: number; // 对最终目标的贡献权重 0-1

  // 依赖关系
  dependencies: string[]; // 依赖的其他子目标ID

  // 执行时间
  estimatedDuration?: number; // 预计耗时（小时）
  deadline?: number; // 截止时间

  // 关联的任务ID
  taskIds: string[];

  // 成功标准
  successCriteria: SuccessCriterion[];

  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
}

/**
 * SubGoal creation data (without id and timestamps)
 */
export type SubGoalCreateData = Omit<SubGoal, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

/**
 * SubGoal progress tracking
 */
export interface SubGoalProgress {
  subGoalId: string;
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  completedCriteria: number;
  totalCriteria: number;
}

/**
 * SubGoal decomposition result
 */
export interface SubGoalDecompositionResult {
  subGoals: SubGoal[];
  reasoning: string;
  estimatedTotalDuration?: number;
}

/**
 * SubGoal review result
 */
export interface SubGoalReviewResult {
  subGoalId: string;
  status: 'valid' | 'needs_split' | 'needs_merge' | 'needs_reorder';
  reasoning: string;
  suggestions?: string[];
  proposedChanges?: {
    type: 'split' | 'merge' | 'reorder' | 'delete' | 'add';
    targetId: string;
    newSubGoals?: SubGoalCreateData[];
    mergeTargetId?: string;
    newOrder?: string[];
  };
}

/**
 * SubGoal store interface
 */
export interface ISubGoalStore {
  getSubGoal(subGoalId: string): Promise<SubGoal | null>;
  getSubGoalsByGoal(goalId: string): Promise<SubGoal[]>;
  getSubGoalsByStatus(status: SubGoalStatus): Promise<SubGoal[]>;
  createSubGoal(subGoal: Omit<SubGoal, 'id' | 'createdAt'>): Promise<SubGoal>;
  updateSubGoal(subGoalId: string, updates: Partial<SubGoal>): Promise<SubGoal>;
  deleteSubGoal(subGoalId: string): Promise<void>;
  addTaskToSubGoal(subGoalId: string, taskId: string): Promise<SubGoal>;
  removeTaskFromSubGoal(subGoalId: string, taskId: string): Promise<SubGoal>;
  updateProgress(subGoalId: string, progress: SubGoalProgress): Promise<SubGoal>;
  checkDependencies(subGoalId: string): Promise<{
    satisfied: boolean;
    blockingSubGoalIds: string[];
  }>;
  getStats(goalId: string): Promise<{
    total: number;
    byStatus: Record<SubGoalStatus, number>;
    completedWeight: number;
    totalWeight: number;
  }>;
}
