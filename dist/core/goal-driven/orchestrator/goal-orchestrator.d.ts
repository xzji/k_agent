/**
 * Goal Orchestrator
 *
 * 负责整个Goal-Driven Agent流程的编排
 * - 串联10步用户交互流程
 * - 协调各组件配合
 * - 管理流程状态
 */
import { type SubGoal, type Task, type Question, type IGoalStore, type ITaskStore, type IKnowledgeStore, type INotificationQueue } from '../types';
import { ContextGatherer } from '../planning/context-gatherer';
import { type TaskReviewResult } from '../planning/task-planner';
import { type PlanReport } from '../planning/plan-presenter';
import { UnifiedTaskScheduler } from '../scheduler/unified-task-scheduler';
import { SuccessCriteriaChecker } from '../planning/success-criteria-checker';
import { SubGoalStore } from '../sub-goal/sub-goal-store';
/**
 * Orchestration phase
 */
export type OrchestrationPhase = 'idle' | 'collecting_info' | 'decomposing' | 'generating_tasks' | 'reviewing_tasks' | 'presenting_plan' | 'executing' | 'monitoring' | 'reviewing';
/**
 * Orchestration state
 */
export interface OrchestrationState {
    goalId: string;
    phase: OrchestrationPhase;
    context: Record<string, unknown>;
    subGoalIds: string[];
    taskIds: string[];
    interactiveTaskId?: string;
    planConfirmed: boolean;
}
/**
 * LLM Channel interface
 */
interface LLMChannel {
    complete(prompt: string, options?: Record<string, unknown>): Promise<{
        content: string;
        usage?: {
            total_tokens: number;
        };
    }>;
}
/**
 * Idle Detector interface
 */
interface IdleDetector {
    isUserIdle(): Promise<boolean>;
}
/**
 * User Profile interface
 */
interface UserProfile {
    userId: string;
    preferences: {
        notificationFrequency: string;
    };
}
/**
 * Goal Orchestrator
 */
export declare class GoalOrchestrator {
    private goalStore;
    private taskStore;
    private knowledgeStore;
    private notificationQueue;
    private contextGatherer;
    private scheduler;
    private successCriteriaChecker;
    private llm;
    private idleDetector;
    private userProfile;
    private subGoalPlanner;
    private taskPlanner;
    private planPresenter;
    private subGoalStore;
    private state;
    constructor(goalStore: IGoalStore, taskStore: ITaskStore, knowledgeStore: IKnowledgeStore, notificationQueue: INotificationQueue, contextGatherer: ContextGatherer, scheduler: UnifiedTaskScheduler, successCriteriaChecker: SuccessCriteriaChecker, llm: LLMChannel, idleDetector: IdleDetector, userProfile: UserProfile, subGoalStore?: SubGoalStore);
    /**
     * Initialize SubGoalStore
     */
    init(): Promise<void>;
    /**
     * Start goal with information collection
     */
    startGoal(userGoal: string): Promise<{
        goalId: string;
        interactiveTaskId: string;
    }>;
    /**
     * Handle user response during info collection
     */
    handleInfoCollectionResponse(goalId: string, response: string): Promise<{
        hasEnoughInfo: boolean;
        nextQuestions?: Question[];
        context?: string;
        canProceed?: boolean;
    }>;
    /**
     * Decompose goal into sub-goals
     */
    decomposeSubGoals(goalId: string): Promise<SubGoal[]>;
    /**
     * Generate and review tasks for all sub-goals
     */
    generateAndReviewTasks(goalId: string, options?: {
        confirmFrequency?: boolean;
    }): Promise<{
        tasks: Task[];
        reviewResults: TaskReviewResult[];
        adjusted: boolean;
    }>;
    /**
     * Present plan for user confirmation
     */
    presentPlanForConfirmation(goalId: string): Promise<{
        report: PlanReport;
        confirmed: boolean;
    }>;
    /**
     * Handle plan modification request
     */
    handlePlanModification(goalId: string, modificationRequest: string): Promise<void>;
    /**
     * Start execution
     */
    startExecution(goalId: string): Promise<void>;
    /**
     * Perform periodic review
     */
    performReview(goalId: string): Promise<{
        canComplete: boolean;
        percentage: number;
        recommendations?: string[];
    }>;
    /**
     * Handle incomplete feedback
     */
    handleIncompleteFeedback(goalId: string, feedback: string): Promise<void>;
    /**
     * Get current orchestration state
     */
    getState(goalId: string): OrchestrationState | undefined;
    /**
     * Get all active goals' states
     */
    getAllStates(): OrchestrationState[];
    /**
     * Check if goal is ready for next phase
     */
    canProceedToNextPhase(goalId: string): {
        canProceed: boolean;
        reason?: string;
    };
    /**
     * Clean up goal state
     */
    cleanup(goalId: string): Promise<void>;
}
export {};
//# sourceMappingURL=goal-orchestrator.d.ts.map