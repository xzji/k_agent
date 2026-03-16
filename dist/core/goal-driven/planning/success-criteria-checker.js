"use strict";
/**
 * Success Criteria Checker
 *
 * Automatically evaluates goal progress against success criteria.
 * Provides user confirmation flow when goals appear to be complete.
 * Handles user feedback for incomplete goals by generating follow-up tasks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessCriteriaChecker = void 0;
const utils_1 = require("../utils");
/**
 * Success Criteria Checker
 */
class SuccessCriteriaChecker {
    goalStore;
    taskStore;
    knowledgeStore;
    notificationQueue;
    llm;
    config;
    constructor(goalStore, taskStore, knowledgeStore, notificationQueue, llm, config) {
        this.goalStore = goalStore;
        this.taskStore = taskStore;
        this.knowledgeStore = knowledgeStore;
        this.notificationQueue = notificationQueue;
        this.llm = llm;
        this.config = {
            autoCompleteThreshold: 80,
            minConfidenceForAutoComplete: 0.75,
            allCriticalMustBeMet: true,
            ...config,
        };
    }
    /**
     * Evaluate goal progress against all success criteria
     */
    async evaluateGoalProgress(goalId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        console.log(`[SuccessCriteriaChecker] Evaluating goal: ${goal.title}`);
        // Get goal-related knowledge
        const knowledge = await this.knowledgeStore.getByGoal(goalId);
        const taskSummary = await this.getTaskSummary(goalId);
        // Evaluate each criterion
        const evaluations = await Promise.all(goal.successCriteria.map((criterion) => this.evaluateCriterion(criterion, goal, knowledge, taskSummary)));
        // Calculate overall progress
        const completedCount = evaluations.filter((e) => e.completed).length;
        const totalCount = evaluations.length;
        const percentage = totalCount > 0
            ? Math.round((completedCount / totalCount) * 100)
            : 0;
        // Calculate average confidence
        const avgConfidence = evaluations.length > 0
            ? evaluations.reduce((sum, e) => sum + e.confidence, 0) / evaluations.length
            : 0;
        // Determine if auto-completion is possible
        const canAutoComplete = this.shouldSuggestAutoComplete(percentage, evaluations, avgConfidence);
        // Update goal progress
        const progress = {
            completedCriteria: completedCount,
            totalCriteria: totalCount,
            percentage,
            lastEvaluatedAt: (0, utils_1.now)(),
        };
        await this.goalStore.updateProgress(goalId, progress);
        // Build report
        const report = {
            goalId,
            percentage,
            completedCriteria: completedCount,
            totalCriteria: totalCount,
            evaluations,
            canAutoComplete,
        };
        // If can auto-complete, send confirmation request
        if (canAutoComplete && goal.status !== 'completed') {
            this.sendCompletionConfirmationRequest(goal, report);
        }
        return report;
    }
    /**
     * Evaluate a single success criterion
     */
    async evaluateCriterion(criterion, goal, knowledge, taskSummary) {
        // Skip already completed criteria
        if (criterion.completed) {
            return {
                criterionId: criterion.id,
                description: criterion.description,
                completed: true,
                reasoning: 'Criterion was previously marked as completed',
                confidence: 1.0,
            };
        }
        const prompt = this.buildEvaluationPrompt(criterion, goal, knowledge, taskSummary);
        try {
            const result = await this.llm.chatJSON({
                systemPrompt: `You are an expert at evaluating goal completion criteria.

Your task is to assess whether a specific success criterion has been met based on:
1. The collected knowledge and results
2. The completed tasks and their outputs
3. The overall progress toward the goal

Evaluate honestly and conservatively - only mark as completed if there is clear evidence.

Respond in JSON format with:
- completed: boolean
- confidence: 0.0-1.0 (your confidence in this assessment)
- reasoning: explanation of your evaluation
- evidence: array of specific evidence supporting your assessment`,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return {
                criterionId: criterion.id,
                description: criterion.description,
                completed: result.completed && result.confidence >= 0.7,
                reasoning: result.reasoning,
                confidence: result.confidence,
            };
        }
        catch (error) {
            console.error(`[SuccessCriteriaChecker] Error evaluating criterion ${criterion.id}:`, error);
            // Return conservative evaluation on error
            return {
                criterionId: criterion.id,
                description: criterion.description,
                completed: false,
                reasoning: 'Evaluation failed, assuming not completed',
                confidence: 0,
            };
        }
    }
    /**
     * Build the evaluation prompt for a criterion
     */
    buildEvaluationPrompt(criterion, goal, knowledge, taskSummary) {
        const knowledgeSummary = knowledge
            .map((k) => `[${k.category}] ${k.content.slice(0, 300)}...`)
            .join('\n\n');
        return `## Goal
Title: ${goal.title}
Description: ${goal.description || 'N/A'}

## Success Criterion to Evaluate
ID: ${criterion.id}
Description: ${criterion.description}
Type: ${criterion.type}

## Knowledge Collected
${knowledgeSummary || 'No knowledge collected yet'}

## Task Summary
${taskSummary}

## Evaluation Task
Based on the collected knowledge and completed tasks, has this success criterion been met?

Provide a thorough evaluation considering:
1. Is there clear evidence that this criterion is satisfied?
2. What specific evidence supports this?
3. Is there any contradictory evidence?
4. How confident are you in this assessment?

Respond with JSON:
{
  "completed": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation",
  "evidence": ["specific evidence 1", "specific evidence 2"]
}`;
    }
    /**
     * Get summary of tasks for the goal
     */
    async getTaskSummary(goalId) {
        const tasks = await this.taskStore.getTasksByGoal(goalId);
        const completed = tasks.filter((t) => t.status === 'completed');
        const failed = tasks.filter((t) => t.status === 'failed');
        const inProgress = tasks.filter((t) => t.status === 'in_progress');
        const summary = `
Total tasks: ${tasks.length}
Completed: ${completed.length}
Failed: ${failed.length}
In Progress: ${inProgress.length}

Completed Tasks:
${completed.map((t) => `- ${t.title} (${t.type})`).join('\n')}

Failed Tasks:
${failed.map((t) => `- ${t.title}: ${t.executionHistory.slice(-1)[0]?.error || 'Unknown error'}`).join('\n')}
`;
        return summary;
    }
    /**
     * Determine if we should suggest auto-completion
     */
    shouldSuggestAutoComplete(percentage, evaluations, avgConfidence) {
        // Must meet minimum percentage
        if (percentage < this.config.autoCompleteThreshold) {
            return false;
        }
        // Must have sufficient confidence
        if (avgConfidence < this.config.minConfidenceForAutoComplete) {
            return false;
        }
        // All critical criteria must be met (if configured)
        if (this.config.allCriticalMustBeMet) {
            const criticalMet = evaluations.every((e) => e.completed);
            if (!criticalMet) {
                return false;
            }
        }
        return true;
    }
    /**
     * Send completion confirmation request to user
     */
    sendCompletionConfirmationRequest(goal, report) {
        const evaluationSummary = report.evaluations
            .map((e) => `${e.completed ? '✅' : '⏳'} ${e.description}`)
            .join('\n');
        const content = `## Goal Progress Update: "${goal.title}"

**Progress: ${report.percentage}%** (${report.completedCriteria}/${report.totalCriteria} criteria met)

### Status of Success Criteria:
${evaluationSummary}

### Next Step
Based on the progress, this goal appears to be nearly complete. Would you like to:

1. **Mark as Complete** - Goal achieved
2. **Continue Working** - Not quite done yet
3. **Review Details** - See full evaluation details

Please reply with your choice (1, 2, or 3).`;
        const notification = {
            type: 'confirmation',
            priority: 'high',
            title: `Goal "${goal.title}" may be complete`,
            content,
            goalId: goal.id,
        };
        this.notificationQueue.enqueue(notification);
    }
    /**
     * Handle user response to completion confirmation
     */
    async handleCompletionConfirmation(goalId, userChoice, userFeedback) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        switch (userChoice) {
            case 'complete':
                await this.completeGoal(goalId);
                break;
            case 'continue':
                await this.handleIncompleteFeedback(goalId, userFeedback);
                break;
            case 'review':
                await this.sendDetailedEvaluation(goalId);
                break;
        }
    }
    /**
     * Mark a goal as complete
     */
    async completeGoal(goalId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal)
            return;
        // Update all criteria as completed
        const updatedCriteria = goal.successCriteria.map((c) => ({
            ...c,
            completed: true,
            completedAt: c.completedAt || (0, utils_1.now)(),
        }));
        // Update goal status
        await this.goalStore.updateGoal(goalId, {
            status: 'completed',
            successCriteria: updatedCriteria,
            completedAt: (0, utils_1.now)(),
        });
        // Send confirmation
        const notification = {
            type: 'report',
            priority: 'high',
            title: `Goal completed: ${goal.title}`,
            content: `Congratulations! The goal "${goal.title}" has been marked as complete.`,
            goalId,
        };
        this.notificationQueue.enqueue(notification);
    }
    /**
     * Handle user feedback that goal is incomplete
     */
    async handleIncompleteFeedback(goalId, userFeedback) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        console.log(`[SuccessCriteriaChecker] Processing incomplete feedback for ${goalId}`);
        // Analyze feedback to understand what's missing
        const analysis = await this.analyzeIncompleteFeedback(goal, userFeedback);
        // Create new tasks based on analysis
        const newTasks = [];
        for (const taskDef of analysis.newTasksNeeded) {
            const task = await this.taskStore.createTask({
                goalId,
                title: taskDef.title,
                description: taskDef.description,
                type: taskDef.type,
                priority: taskDef.priority,
                status: 'pending',
                execution: {
                    agentPrompt: taskDef.description,
                    requiredTools: taskDef.requiredTools || [],
                    requiredContext: [],
                    capabilityMode: 'composite',
                },
                adaptiveConfig: {
                    canAdjustDifficulty: true,
                    canAdjustFrequency: false,
                    successThreshold: 0.5,
                    executionHistory: [],
                },
                relatedKnowledgeIds: [],
                dependencies: taskDef.dependencies || [],
                executionHistory: [],
            });
            newTasks.push(task);
        }
        // Send notification about new tasks
        const notification = {
            type: 'report',
            priority: 'medium',
            title: 'New tasks created based on your feedback',
            content: `Based on your feedback, I've identified ${analysis.missingAspects.length} unfinished aspects and created ${newTasks.length} new tasks to address them.\n\nMissing aspects:\n${analysis.missingAspects.map((a) => `- ${a}`).join('\n')}`,
            goalId,
        };
        this.notificationQueue.enqueue(notification);
        return newTasks;
    }
    /**
     * Analyze user feedback to identify missing aspects and needed tasks
     */
    async analyzeIncompleteFeedback(goal, userFeedback) {
        if (!userFeedback) {
            // Generic feedback, create exploration task
            return {
                missingAspects: ['Goal not yet complete'],
                newTasksNeeded: [
                    {
                        title: 'Continue working on goal',
                        description: `Continue progress toward: ${goal.title}`,
                        type: 'exploration',
                        priority: 'medium',
                    },
                ],
            };
        }
        const prompt = `## Goal
Title: ${goal.title}
Description: ${goal.description || 'N/A'}

## Success Criteria
${goal.successCriteria.map((c) => `- ${c.description} (${c.completed ? 'completed' : 'pending'})`).join('\n')}

## User Feedback
"""
${userFeedback}
"""

## Task
Analyze the user's feedback to understand:
1. What aspects of the goal are still incomplete?
2. What specific tasks should be created to address these gaps?

Consider:
- Which success criteria are actually not met (despite our assessment)?
- What new information or deliverables are needed?
- What type of tasks would best address these gaps?

Respond with JSON:
{
  "missingAspects": ["aspect 1", "aspect 2"],
  "newTasksNeeded": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "type": "one_time|recurring|exploration|interactive",
      "priority": "high|medium|low",
      "requiredTools": ["tool1"],
      "dependencies": []
    }
  ]
}`;
        try {
            const result = await this.llm.chatJSON({
                systemPrompt: 'You are an expert at analyzing user feedback and identifying gaps in goal completion.',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5,
            });
            return result;
        }
        catch (error) {
            console.error('[SuccessCriteriaChecker] Error analyzing feedback:', error);
            // Fallback: create a generic follow-up task
            return {
                missingAspects: ['Additional work needed based on user feedback'],
                newTasksNeeded: [
                    {
                        title: 'Address user feedback',
                        description: userFeedback,
                        type: 'interactive',
                        priority: 'high',
                    },
                ],
            };
        }
    }
    /**
     * Send detailed evaluation report to user
     */
    async sendDetailedEvaluation(goalId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal)
            return;
        const report = await this.evaluateGoalProgress(goalId);
        const detailedEvaluations = report.evaluations
            .map((e) => `### ${e.completed ? '✅' : '⏳'} ${e.description}
**Status:** ${e.completed ? 'Completed' : 'Not Completed'}
**Confidence:** ${Math.round(e.confidence * 100)}%
**Reasoning:** ${e.reasoning}`)
            .join('\n\n');
        const content = `## Detailed Evaluation: ${goal.title}

**Overall Progress:** ${report.percentage}%
**Criteria Met:** ${report.completedCriteria}/${report.totalCriteria}

---

${detailedEvaluations}

---

Would you like to:
1. Mark as complete
2. Continue working
3. Add new success criteria`;
        const notification = {
            type: 'report',
            priority: 'medium',
            title: `Detailed evaluation: ${goal.title}`,
            content,
            goalId,
        };
        this.notificationQueue.enqueue(notification);
    }
    /**
     * Add a new success criterion to a goal
     */
    async addSuccessCriterion(goalId, description, type = 'condition') {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const newCriterion = {
            id: `sc-${(0, utils_1.generateId)().slice(0, 8)}`,
            description,
            type,
            completed: false,
        };
        const updatedCriteria = [...goal.successCriteria, newCriterion];
        const updatedGoal = await this.goalStore.updateGoal(goalId, {
            successCriteria: updatedCriteria,
        });
        // Re-evaluate progress with new criterion
        await this.evaluateGoalProgress(goalId);
        return updatedGoal;
    }
    /**
     * Manually mark a criterion as completed
     */
    async markCriterionCompleted(goalId, criterionId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const updatedCriteria = goal.successCriteria.map((c) => c.id === criterionId
            ? { ...c, completed: true, completedAt: (0, utils_1.now)() }
            : c);
        const updatedGoal = await this.goalStore.updateGoal(goalId, {
            successCriteria: updatedCriteria,
        });
        // Re-evaluate progress
        await this.evaluateGoalProgress(goalId);
        return updatedGoal;
    }
    /**
     * Get completion statistics for all active goals
     */
    async getCompletionStats() {
        const activeGoals = await this.goalStore.getActiveGoals();
        let totalPercentage = 0;
        const nearCompletion = [];
        const needingAttention = [];
        for (const goal of activeGoals) {
            const report = await this.evaluateGoalProgress(goal.id);
            totalPercentage += report.percentage;
            if (report.percentage >= 70) {
                nearCompletion.push(goal.id);
            }
            else if (report.percentage < 30) {
                needingAttention.push(goal.id);
            }
        }
        return {
            totalGoals: activeGoals.length,
            averageCompletion: activeGoals.length > 0
                ? Math.round(totalPercentage / activeGoals.length)
                : 0,
            goalsNearCompletion: nearCompletion,
            goalsNeedingAttention: needingAttention,
        };
    }
}
exports.SuccessCriteriaChecker = SuccessCriteriaChecker;
//# sourceMappingURL=success-criteria-checker.js.map