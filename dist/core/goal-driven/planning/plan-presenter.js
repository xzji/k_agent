"use strict";
/**
 * Plan Presenter
 *
 * 负责计划的展示、汇报和用户确认
 * - 生成完整的计划汇报
 * - 向用户展示计划并获取确认
 * - 处理用户的计划修改请求
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanPresenter = void 0;
/**
 * Plan Presenter
 */
class PlanPresenter {
    goalStore;
    subGoalStore;
    taskStore;
    notificationQueue;
    llm;
    constructor(goalStore, subGoalStore, taskStore, notificationQueue, llm) {
        this.goalStore = goalStore;
        this.subGoalStore = subGoalStore;
        this.taskStore = taskStore;
        this.notificationQueue = notificationQueue;
        this.llm = llm;
    }
    /**
     * Generate plan report for a goal
     */
    async generatePlanReport(goalId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
        // Build sub-goal and task structure
        const subGoalReports = [];
        let totalTasks = 0;
        let notifyTasks = 0;
        let interactiveTasks = 0;
        for (const sg of subGoals) {
            const tasks = [];
            for (const taskId of sg.taskIds) {
                const task = await this.taskStore.getTask(taskId);
                if (task) {
                    tasks.push(task);
                    totalTasks++;
                    if (task.shouldNotify)
                        notifyTasks++;
                    if (task.requiresUserInput)
                        interactiveTasks++;
                }
            }
            subGoalReports.push({
                id: sg.id,
                name: sg.name,
                description: sg.description,
                priority: sg.priority,
                status: sg.status,
                weight: sg.weight,
                estimatedDuration: sg.estimatedDuration,
                tasks: tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    type: t.type,
                    priority: t.priority,
                    hierarchyLevel: t.hierarchyLevel ?? 'standard',
                    expectedResult: t.expectedResult?.description ?? '',
                    shouldNotify: t.shouldNotify,
                    notifyReason: t.notifyReason,
                    notifyTiming: t.notifyTiming,
                    requiresUserInput: t.requiresUserInput,
                })),
            });
        }
        // Calculate timeline
        const totalDuration = subGoals.reduce((sum, sg) => sum + (sg.estimatedDuration || 0), 0);
        // Generate notification strategy based on goal priority
        const notificationStrategy = this.generateNotificationStrategy(goal);
        // Build summary object
        const summary = {
            subGoalCount: subGoals.length,
            taskCount: totalTasks,
            notifyTaskCount: notifyTasks,
            interactiveTaskCount: interactiveTasks,
            estimatedDuration: this.formatTimeline(totalDuration),
        };
        return {
            goalId,
            goalTitle: goal.title,
            summary,
            subGoals: subGoalReports,
            timeline: this.formatTimeline(totalDuration),
            notificationStrategy,
        };
    }
    /**
     * Generate plan summary using LLM
     */
    async generateSummary(goal, subGoals) {
        const prompt = `请为目标生成一个简洁的计划摘要：

目标: ${goal.title}
描述: ${goal.description || '无'}
优先级: ${goal.priority}

子目标 (${subGoals.length}个):
${subGoals.map((sg) => `- ${sg.name} (${sg.priority}, 权重${Math.round(sg.weight * 100)}%)`).join('\n')}

请用2-3句话概括这个计划的核心要点。`;
        try {
            const response = await this.llm.complete(prompt, { temperature: 0.5 });
            return response.content.trim();
        }
        catch (error) {
            // Fallback summary
            return `计划包含${subGoals.length}个子目标，将按优先级${goal.priority}执行。`;
        }
    }
    /**
     * Format duration for display
     */
    formatDuration(hours) {
        if (hours < 1)
            return '小于1小时';
        if (hours < 24)
            return `${Math.round(hours)}小时`;
        const days = Math.round(hours / 24);
        if (days < 30)
            return `${days}天`;
        const months = Math.round(days / 30);
        return `${months}个月`;
    }
    /**
     * Format timeline
     */
    formatTimeline(totalHours) {
        if (totalHours === 0)
            return '时间待定';
        const duration = this.formatDuration(totalHours);
        return `预计总耗时: ${duration}`;
    }
    /**
     * Generate notification strategy
     */
    generateNotificationStrategy(goal) {
        const strategies = {
            critical: '关键进展和紧急情况立即通知，执行汇报在用户空闲时推送',
            high: '重要进展实时通知，一般汇报空闲时推送',
            medium: '每日汇总，重要节点即时通知',
            low: '按需汇报，批量推送',
            background: '静默执行，完成后统一汇报',
        };
        return strategies[goal.priority] || strategies.medium;
    }
    /**
     * Present plan to user for confirmation
     */
    async presentPlanForConfirmation(goalId) {
        const report = await this.generatePlanReport(goalId);
        // Format plan for display
        const planContent = this.formatPlanForDisplay(report);
        // Create confirmation notification
        const notification = {
            type: 'confirmation',
            priority: 'high',
            title: `【计划确认】${report.goalTitle.slice(0, 30)}...`,
            content: planContent,
            goalId,
        };
        // Enqueue notification
        this.notificationQueue.enqueue(notification);
        // In real implementation, this would wait for user response
        // For now, return a placeholder result
        return {
            confirmed: true,
        };
    }
    /**
     * Format plan for display
     */
    formatPlanForDisplay(report) {
        const lines = [];
        lines.push('## 计划概要');
        lines.push(`目标: ${report.goalTitle}`);
        lines.push(`子目标数: ${report.summary.subGoalCount}`);
        lines.push(`任务总数: ${report.summary.taskCount}`);
        lines.push(`需要推送: ${report.summary.notifyTaskCount} 个任务`);
        lines.push(`需要您参与: ${report.summary.interactiveTaskCount} 个任务`);
        lines.push(`预计耗时: ${report.summary.estimatedDuration}`);
        lines.push('');
        lines.push('## 执行阶段');
        for (let i = 0; i < report.subGoals.length; i++) {
            const sg = report.subGoals[i];
            lines.push(`\n### ${i + 1}. ${sg.name}`);
            lines.push(`描述: ${sg.description}`);
            lines.push(`优先级: ${sg.priority} | 权重: ${Math.round(sg.weight * 100)}%`);
            if (sg.estimatedDuration) {
                lines.push(`预计耗时: ${this.formatDuration(sg.estimatedDuration)}`);
            }
            if (sg.tasks.length > 0) {
                lines.push('\n任务列表:');
                for (const task of sg.tasks) {
                    lines.push(`  - [${task.hierarchyLevel}] ${task.title} (${task.priority})`);
                    lines.push(`    预期产出: ${task.expectedResult}`);
                }
            }
        }
        lines.push('\n---');
        lines.push(`\n${report.timeline}`);
        lines.push(`通知策略: ${report.notificationStrategy}`);
        lines.push('\n请确认此计划或提出修改意见。');
        return lines.join('\n');
    }
    /**
     * Handle plan modification request
     */
    async handlePlanModification(goalId, modificationRequest) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            throw new Error(`Goal not found: ${goalId}`);
        }
        // Parse modification request using LLM
        const prompt = `请解析用户的计划修改请求，提取具体的修改意图：

用户请求: "${modificationRequest}"

当前计划涉及目标: ${goal.title}

请按JSON格式返回：
{
  "modificationType": "add_subgoal|remove_subgoal|reorder|adjust_priority|adjust_timeline|other",
  "target": "描述修改目标",
  "details": "详细说明",
  "requiresConfirmation": true|false
}`;
        try {
            const response = await this.llm.complete(prompt, {
                temperature: 0.3,
                response_format: { type: 'json_object' },
            });
            const modification = JSON.parse(response.content);
            // Create notification about the modification
            const notification = {
                type: 'info',
                priority: 'medium',
                title: '计划修改请求已收到',
                content: `已收到您的修改请求：${modification.details}\n\n系统将据此调整计划。`,
                goalId,
            };
            this.notificationQueue.enqueue(notification);
        }
        catch (error) {
            console.error('[PlanPresenter] Failed to parse modification:', error);
            // Fallback: just acknowledge
            const notification = {
                type: 'info',
                priority: 'medium',
                title: '计划修改请求',
                content: `已记录您的修改请求：${modificationRequest}\n\n系统将在后续规划中考虑。`,
                goalId,
            };
            this.notificationQueue.enqueue(notification);
        }
    }
    /**
     * Get plan summary for quick view
     */
    async getPlanSummary(goalId) {
        const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
        let totalTasks = 0;
        let completedTasks = 0;
        let totalWeight = 0;
        let completedWeight = 0;
        for (const sg of subGoals) {
            totalWeight += sg.weight;
            if (sg.status === 'completed') {
                completedWeight += sg.weight;
            }
            for (const taskId of sg.taskIds) {
                totalTasks++;
                const task = await this.taskStore.getTask(taskId);
                if (task?.status === 'completed') {
                    completedTasks++;
                }
            }
        }
        const overallProgress = totalWeight > 0 ? completedWeight / totalWeight : 0;
        return {
            totalSubGoals: subGoals.length,
            totalTasks,
            completedTasks,
            overallProgress: Math.round(overallProgress * 100),
        };
    }
    /**
     * Check if plan is ready for presentation
     */
    async isPlanReady(goalId) {
        const goal = await this.goalStore.getGoal(goalId);
        if (!goal) {
            return { ready: false, reason: '目标不存在' };
        }
        const subGoals = await this.subGoalStore.getSubGoalsByGoal(goalId);
        if (subGoals.length === 0) {
            return { ready: false, reason: '尚未拆解子目标' };
        }
        // Check if any sub-goal has tasks
        let hasTasks = false;
        for (const sg of subGoals) {
            if (sg.taskIds.length > 0) {
                hasTasks = true;
                break;
            }
        }
        if (!hasTasks) {
            return { ready: false, reason: '尚未生成任务' };
        }
        return { ready: true };
    }
}
exports.PlanPresenter = PlanPresenter;
//# sourceMappingURL=plan-presenter.js.map