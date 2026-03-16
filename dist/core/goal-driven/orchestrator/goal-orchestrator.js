"use strict";
/**
 * Goal Orchestrator
 *
 * 负责整个Goal-Driven Agent流程的编排
 * - 串联10步用户交互流程
 * - 协调各组件配合
 * - 管理流程状态
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalOrchestrator = void 0;
const sub_goal_planner_1 = require("../planning/sub-goal-planner");
const task_planner_1 = require("../planning/task-planner");
const plan_presenter_1 = require("../planning/plan-presenter");
const sub_goal_store_1 = require("../sub-goal/sub-goal-store");
/**
 * Goal Orchestrator
 */
class GoalOrchestrator {
    goalStore;
    taskStore;
    knowledgeStore;
    notificationQueue;
    contextGatherer;
    scheduler;
    successCriteriaChecker;
    llm;
    idleDetector;
    userProfile;
    subGoalPlanner;
    taskPlanner;
    planPresenter;
    subGoalStore;
    state = new Map();
    constructor(goalStore, taskStore, knowledgeStore, notificationQueue, contextGatherer, scheduler, successCriteriaChecker, llm, idleDetector, userProfile, subGoalStore) {
        this.goalStore = goalStore;
        this.taskStore = taskStore;
        this.knowledgeStore = knowledgeStore;
        this.notificationQueue = notificationQueue;
        this.contextGatherer = contextGatherer;
        this.scheduler = scheduler;
        this.successCriteriaChecker = successCriteriaChecker;
        this.llm = llm;
        this.idleDetector = idleDetector;
        this.userProfile = userProfile;
        // Initialize SubGoalStore (create new if not provided)
        this.subGoalStore = subGoalStore || new sub_goal_store_1.SubGoalStore();
        // Initialize planners
        this.subGoalPlanner = new sub_goal_planner_1.SubGoalPlanner(goalStore, this.subGoalStore, llm);
        this.taskPlanner = new task_planner_1.TaskPlanner(taskStore, this.subGoalStore, llm);
        this.planPresenter = new plan_presenter_1.PlanPresenter(goalStore, this.subGoalStore, taskStore, notificationQueue, llm);
    }
    /**
     * Initialize SubGoalStore
     */
    async init() {
        await this.subGoalStore.init();
    }
    // ============================================================================
    // Phase 1: 目标理解与信息收集
    // ============================================================================
    /**
     * Start goal with information collection
     */
    async startGoal(userGoal) {
        // Create goal with gathering_info status
        const goal = await this.goalStore.createGoal({
            title: userGoal,
            description: '',
            status: 'gathering_info',
            priority: 'medium',
            dimensions: [],
            successCriteria: [],
            progress: { completedCriteria: 0, totalCriteria: 0, percentage: 0 },
            userContext: { collectedInfo: {} },
        });
        // Initialize state
        this.state.set(goal.id, {
            goalId: goal.id,
            phase: 'collecting_info',
            context: {},
            subGoalIds: [],
            taskIds: [],
            planConfirmed: false,
        });
        // Start interactive gathering
        const goalObj = {
            ...goal,
            dimensions: [],
            successCriteria: [],
            userContext: { collectedInfo: {} },
            createdAt: Date.now(),
        };
        const interactiveTask = await this.contextGatherer.startInteractiveGathering(goalObj);
        // Update state
        const state = this.state.get(goal.id);
        state.interactiveTaskId = interactiveTask.id;
        return {
            goalId: goal.id,
            interactiveTaskId: interactiveTask.id,
        };
    }
    /**
     * Handle user response during info collection
     */
    async handleInfoCollectionResponse(goalId, response) {
        const state = this.state.get(goalId);
        if (!state || state.phase !== 'collecting_info') {
            throw new Error('Invalid state for info collection');
        }
        if (!state.interactiveTaskId) {
            throw new Error('No interactive task found');
        }
        const result = await this.contextGatherer.processUserResponse(state.interactiveTaskId, response);
        // Update collected info in state
        Object.assign(state.context, result.extractedInfo);
        return {
            hasEnoughInfo: result.hasEnoughInfo,
            nextQuestions: result.nextQuestions?.questions,
            context: result.nextQuestions?.context,
            canProceed: result.hasEnoughInfo,
        };
    }
    // ============================================================================
    // Phase 2&3: 子目标拆解与关系梳理
    // ============================================================================
    /**
     * Decompose goal into sub-goals
     */
    async decomposeSubGoals(goalId) {
        const state = this.state.get(goalId);
        if (!state) {
            throw new Error('Goal not found in orchestrator state');
        }
        // Update phase
        state.phase = 'decomposing';
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        // Decompose sub-goals
        const subGoals = await this.subGoalPlanner.decomposeSubGoals(goalId, goal.userContext?.collectedInfo || state.context);
        // Update state
        state.subGoalIds = subGoals.map((sg) => sg.id);
        // Update goal status
        await this.goalStore.updateGoal(goalId, {
            status: 'planning',
            subGoals: state.subGoalIds,
        });
        return subGoals;
    }
    // ============================================================================
    // Phase 4&5: 任务生成与Review
    // ============================================================================
    /**
     * Generate and review tasks for all sub-goals
     */
    async generateAndReviewTasks(goalId, options) {
        const state = this.state.get(goalId);
        if (!state) {
            throw new Error('Goal not found in orchestrator state');
        }
        state.phase = 'generating_tasks';
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const allTasks = [];
        const allReviews = [];
        for (const subGoalId of state.subGoalIds) {
            const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
            if (!subGoal)
                continue;
            // Generate tasks
            const tasks = await this.taskPlanner.generateTasksForSubGoal(subGoalId, {
                goalTitle: goal.title,
                goalDescription: goal.description,
                userContext: goal.userContext?.collectedInfo || state.context,
            }, { confirmFrequency: options?.confirmFrequency });
            allTasks.push(...tasks);
            // Review tasks
            if (tasks.length > 0) {
                state.phase = 'reviewing_tasks';
                const reviews = await this.taskPlanner.reviewTasks(tasks.map((t) => t.id), {
                    goalTitle: goal.title,
                    subGoalTitle: subGoal.name,
                    goalDescription: goal.description,
                });
                allReviews.push(...reviews);
                // Adjust misaligned tasks
                const misaligned = reviews.filter((r) => !r.aligned);
                if (misaligned.length > 0) {
                    await this.taskPlanner.adjustTasks(misaligned);
                }
            }
        }
        // Update state
        state.taskIds = allTasks.map((t) => t.id);
        return {
            tasks: allTasks,
            reviewResults: allReviews,
            adjusted: allReviews.some((r) => !r.aligned),
        };
    }
    // ============================================================================
    // Phase 6: 计划汇报与确认
    // ============================================================================
    /**
     * Present plan for user confirmation
     */
    async presentPlanForConfirmation(goalId) {
        const state = this.state.get(goalId);
        if (!state) {
            throw new Error('Goal not found in orchestrator state');
        }
        state.phase = 'presenting_plan';
        // Generate report
        const report = await this.planPresenter.generatePlanReport(goalId);
        // Present and get confirmation (in real impl, this would wait for user)
        const result = await this.planPresenter.presentPlanForConfirmation(goalId);
        if (result.confirmed) {
            state.planConfirmed = true;
        }
        return {
            report,
            confirmed: result.confirmed,
        };
    }
    /**
     * Handle plan modification request
     */
    async handlePlanModification(goalId, modificationRequest) {
        await this.planPresenter.handlePlanModification(goalId, modificationRequest);
    }
    // ============================================================================
    // Phase 7: 启动执行
    // ============================================================================
    /**
     * Start execution
     */
    async startExecution(goalId) {
        const state = this.state.get(goalId);
        if (!state) {
            throw new Error('Goal not found in orchestrator state');
        }
        if (!state.planConfirmed) {
            throw new Error('Plan not confirmed yet');
        }
        state.phase = 'executing';
        // Update goal status
        await this.goalStore.updateGoal(goalId, { status: 'active' });
        // Start scheduler if not running
        if (!this.scheduler.isRunning()) {
            await this.scheduler.start();
        }
        state.phase = 'monitoring';
    }
    // ============================================================================
    // Phase 10: 定期Review
    // ============================================================================
    /**
     * Perform periodic review
     */
    async performReview(goalId) {
        const state = this.state.get(goalId);
        if (!state) {
            throw new Error('Goal not found in orchestrator state');
        }
        state.phase = 'reviewing';
        // Evaluate goal progress
        const report = await this.successCriteriaChecker.evaluateGoalProgress(goalId);
        // Get sub-goal stats
        const subGoalStats = await this.subGoalStore.getStats(goalId);
        // Generate recommendations
        const recommendations = [];
        if (report.percentage < 100) {
            // Check for stalled sub-goals
            if (subGoalStats.byStatus.active === 0 && subGoalStats.byStatus.pending > 0) {
                recommendations.push('有未启动的子目标，建议检查依赖关系');
            }
            // Check progress
            if (report.percentage < 50 && subGoalStats.total > 3) {
                recommendations.push('整体进度较慢，建议重新评估子目标优先级');
            }
        }
        // Auto-complete if criteria met
        if (report.canAutoComplete) {
            await this.successCriteriaChecker.handleCompletionConfirmation(goalId, 'complete');
        }
        // Return to monitoring
        state.phase = 'monitoring';
        return {
            canComplete: report.canAutoComplete,
            percentage: report.percentage,
            recommendations,
        };
    }
    /**
     * Handle incomplete feedback
     */
    async handleIncompleteFeedback(goalId, feedback) {
        await this.successCriteriaChecker.handleIncompleteFeedback(goalId, feedback);
        // Replan based on feedback
        const state = this.state.get(goalId);
        if (state) {
            // Could trigger replanning here
            const goal = await this.goalStore.getGoal(goalId);
            if (goal?.subGoals && goal.subGoals.length > 0) {
                // Replan first incomplete sub-goal
                for (const subGoalId of goal.subGoals) {
                    const subGoal = await this.subGoalStore.getSubGoal(subGoalId);
                    if (subGoal && subGoal.status !== 'completed') {
                        await this.taskPlanner.replanTasks(subGoalId, feedback, {
                            goalTitle: goal.title,
                            userContext: goal.userContext?.collectedInfo || {},
                        });
                        break;
                    }
                }
            }
        }
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Get current orchestration state
     */
    getState(goalId) {
        return this.state.get(goalId);
    }
    /**
     * Get all active goals' states
     */
    getAllStates() {
        return Array.from(this.state.values());
    }
    /**
     * Check if goal is ready for next phase
     */
    canProceedToNextPhase(goalId) {
        const state = this.state.get(goalId);
        if (!state) {
            return { canProceed: false, reason: 'Goal not found' };
        }
        switch (state.phase) {
            case 'collecting_info':
                return { canProceed: true }; // Assuming enough info collected
            case 'decomposing':
                return state.subGoalIds.length > 0
                    ? { canProceed: true }
                    : { canProceed: false, reason: 'Sub-goals not created' };
            case 'generating_tasks':
            case 'reviewing_tasks':
                return state.taskIds.length > 0
                    ? { canProceed: true }
                    : { canProceed: false, reason: 'Tasks not generated' };
            case 'presenting_plan':
                return state.planConfirmed
                    ? { canProceed: true }
                    : { canProceed: false, reason: 'Plan not confirmed' };
            case 'executing':
            case 'monitoring':
                return { canProceed: true };
            default:
                return { canProceed: false, reason: 'Unknown phase' };
        }
    }
    /**
     * Clean up goal state
     */
    async cleanup(goalId) {
        this.state.delete(goalId);
    }
}
exports.GoalOrchestrator = GoalOrchestrator;
//# sourceMappingURL=goal-orchestrator.js.map