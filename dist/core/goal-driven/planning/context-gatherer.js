"use strict";
/**
 * Context Gatherer
 *
 * Handles progressive information collection through interactive questioning.
 * Supports conversation-style information gathering rather than form-like questionnaires.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextGatherer = void 0;
const utils_1 = require("../utils");
/**
 * Context Gatherer for progressive information collection
 */
class ContextGatherer {
    taskStore;
    notificationQueue;
    llm;
    constructor(taskStore, notificationQueue, llm) {
        this.taskStore = taskStore;
        this.notificationQueue = notificationQueue;
        this.llm = llm;
    }
    /**
     * Start interactive information gathering for a goal
     * Creates an interactive task and generates the first batch of questions
     */
    async startInteractiveGathering(goal, context) {
        // Check if there's already an active interactive task for this goal
        const existingTasks = await this.taskStore.getTasksByGoal(goal.id);
        const activeInteractiveTask = existingTasks.find((t) => t.type === 'interactive' &&
            ['pending', 'ready', 'in_progress', 'waiting_user'].includes(t.status));
        if (activeInteractiveTask) {
            console.log(`[ContextGatherer] Reusing existing interactive task: ${activeInteractiveTask.id}`);
            return activeInteractiveTask;
        }
        // Generate first batch of questions
        const questions = await this.generateQuestions(goal, {}, context);
        // Create interactive task
        const task = await this.taskStore.createTask({
            goalId: goal.id,
            title: `Information gathering for: ${goal.title}`,
            description: 'Progressive information collection to better understand the goal',
            type: 'interactive',
            priority: 'high',
            status: 'waiting_user',
            execution: {
                agentPrompt: `Collect information for goal: ${goal.title}`,
                requiredTools: [],
                requiredContext: ['goal_context'],
                capabilityMode: 'direct',
            },
            adaptiveConfig: {
                canAdjustDifficulty: false,
                canAdjustFrequency: false,
                successThreshold: 0.5,
                executionHistory: [],
            },
            relatedKnowledgeIds: [],
            dependencies: [],
            pendingQuestions: questions,
            collectedInfo: {},
            executionHistory: [],
        });
        // Send notification to user
        this.notifyUserOfQuestions(task, questions);
        return task;
    }
    /**
     * Generate next batch of questions based on collected information
     */
    async generateQuestions(goal, collectedInfo, context) {
        const prompt = this.buildQuestionPrompt(goal, collectedInfo, context);
        try {
            const result = await this.llm.chatJSON({
                systemPrompt: `You are an intelligent assistant helping to gather information for a user's goal.

Your task is to generate 1-2 natural, conversational questions to collect missing information.

Guidelines:
1. Ask questions like a helpful colleague, not like a form or survey
2. Base follow-up questions on what the user has already shared
3. Prioritize information that will significantly impact the plan
4. Keep questions concise and focused
5. Avoid asking multiple things at once
6. If you have enough information, set hasEnoughInfo to true

Always respond in valid JSON format.`,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            });
            // Transform the result into proper Question objects
            const questions = result.questions.slice(0, 2).map((q, index) => ({
                id: q.id || `q-${(0, utils_1.generateId)().slice(0, 8)}`,
                question: q.question,
                purpose: q.purpose,
                expectedType: q.expectedType,
                choices: q.choices?.map((c) => typeof c === 'string'
                    ? { value: c, label: c }
                    : { value: c.value, label: c.label, allowCustom: c.allowCustom }),
            }));
            return {
                questions,
                context: result.reasoning,
            };
        }
        catch (error) {
            console.error('[ContextGatherer] Error generating questions:', error);
            // Return fallback questions
            return {
                questions: [
                    {
                        id: 'fallback-1',
                        question: `Could you tell me more about what you're looking for with "${goal.title}"?`,
                        purpose: 'Understand the core intent behind the goal',
                        expectedType: 'string',
                    },
                ],
                context: 'Using fallback questions due to generation error',
            };
        }
    }
    /**
     * Build the prompt for question generation
     */
    buildQuestionPrompt(goal, collectedInfo, context) {
        const hasCollectedInfo = Object.keys(collectedInfo).length > 0;
        return `## Goal
Title: ${goal.title}
Description: ${goal.description || 'No description provided'}

${context ? `## Additional Context\n${context}\n` : ''}

## Already Collected Information
${hasCollectedInfo
            ? Object.entries(collectedInfo)
                .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
                .join('\n')
            : 'No information collected yet'}

## Required Information Areas
${goal.userContext.requiredInfo
            ? goal.userContext.requiredInfo.map((info) => `- ${info}`).join('\n')
            : '- Core objective and desired outcomes\n- Timeline and constraints\n- Resources available\n- Potential challenges'}

## Task
Generate 1-2 natural follow-up questions to gather the most important missing information.

Consider:
1. What's already known vs. what would be most valuable to know next?
2. What would help create a better plan for this goal?
3. How can the question feel like a natural conversation?

Respond with JSON in this format:
{
  "questions": [
    {
      "question": "The natural question text",
      "purpose": "Brief explanation of what this question helps us understand",
      "expectedType": "string|number|choice|boolean",
      "choices": ["option1", "option2"] // Only for choice type
    }
  ],
  "hasEnoughInfo": false, // Set true if we have sufficient information
  "reasoning": "Why these questions (or why we have enough info)"
}`;
    }
    /**
     * Notify user of pending questions
     */
    notifyUserOfQuestions(task, questions) {
        const formattedQuestions = questions.questions
            .map((q, index) => `${index + 1}. ${q.question}`)
            .join('\n\n');
        const notification = {
            type: 'help_request',
            priority: 'high',
            title: `Need more information: ${task.title}`,
            content: `To help you with "${task.title}", I need to understand a bit more:\n\n${formattedQuestions}\n\nPlease reply with your answer(s).`,
            goalId: task.goalId,
            taskId: task.id,
        };
        this.notificationQueue.enqueue(notification);
    }
    /**
     * Process user response to interactive task
     * Extracts information and determines if more questions are needed
     */
    async processUserResponse(taskId, userResponse) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        // Extract information from response
        const extractedInfo = await this.extractInfoFromResponse(userResponse, task.pendingQuestions);
        // Add to collected information
        await this.taskStore.addCollectedInfo(taskId, extractedInfo);
        // Get updated collected info
        const updatedTask = await this.taskStore.getTask(taskId);
        const allCollectedInfo = updatedTask?.collectedInfo || {};
        // Get goal for context
        // Note: GoalStore is not directly available, would need to be injected
        // For now, we'll create a minimal goal context from the task
        const goalContext = {
            id: task.goalId,
            title: task.title,
            userContext: {
                collectedInfo: allCollectedInfo,
            },
        };
        // Check if we have enough information
        const sufficiencyCheck = await this.checkInfoSufficiency(goalContext, allCollectedInfo);
        if (sufficiencyCheck.hasEnoughInfo) {
            // Information gathering complete
            await this.taskStore.updateStatus(taskId, 'completed', {
                completionReason: 'Sufficient information collected',
            });
            return {
                extractedInfo,
                hasEnoughInfo: true,
            };
        }
        // Generate next questions
        const nextQuestions = await this.generateQuestions(goalContext, allCollectedInfo);
        // Update task with new questions
        await this.taskStore.updateTask(taskId, {
            pendingQuestions: nextQuestions,
            status: 'waiting_user',
        });
        // Notify user
        this.notifyUserOfQuestions({ ...task, pendingQuestions: nextQuestions }, nextQuestions);
        return {
            extractedInfo,
            hasEnoughInfo: false,
            nextQuestions,
        };
    }
    /**
     * Extract structured information from user response
     */
    async extractInfoFromResponse(userResponse, pendingQuestions) {
        if (!pendingQuestions || pendingQuestions.questions.length === 0) {
            // No specific questions to extract against, do general extraction
            return this.extractGeneralInfo(userResponse);
        }
        const prompt = `## Questions Asked
${pendingQuestions.questions
            .map((q) => `- ${q.question} (looking for: ${q.purpose})`)
            .join('\n')}

## User's Response
"""
${userResponse}
"""

## Task
Extract the key information from the user's response. For each question, identify what was answered.
If the user answered multiple questions, extract all relevant information.

Respond with JSON:
{
  "extractedInfo": {
    "fieldName": "extracted value",
    // more fields as appropriate
  },
  "unclearPoints": ["anything that was unclear"],
  "followUpNeeded": false // true if we need to ask for clarification
}`;
        try {
            const result = await this.llm.chatJSON({
                systemPrompt: 'You are an expert at extracting structured information from natural language responses.',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return result.extractedInfo;
        }
        catch (error) {
            console.error('[ContextGatherer] Error extracting info:', error);
            // Fallback: store the raw response
            return {
                rawResponse: userResponse,
                extractedAt: (0, utils_1.now)(),
            };
        }
    }
    /**
     * Extract general information without specific questions
     */
    extractGeneralInfo(userResponse) {
        // Simple keyword-based extraction
        const keywords = (0, utils_1.extractKeywords)(userResponse).split(' ');
        return {
            rawResponse: userResponse,
            keywords,
            extractedAt: (0, utils_1.now)(),
        };
    }
    /**
     * Check if we have enough information to proceed
     */
    async checkInfoSufficiency(goal, collectedInfo) {
        const prompt = `## Goal
Title: ${goal.title}
Description: ${goal.description || 'N/A'}

## Required Information Areas
${goal.userContext.requiredInfo
            ? goal.userContext.requiredInfo.join(', ')
            : 'Core objective, timeline, resources, constraints'}

## Information Collected So Far
${Object.entries(collectedInfo)
            .map(([key, value]) => `- ${key}: ${JSON.stringify(value).slice(0, 100)}`)
            .join('\n')}

## Task
Assess whether we have enough information to create a good plan for this goal.
Consider:
1. Do we understand the core objective?
2. Do we know the timeline/constraints?
3. Do we understand what resources are available?
4. Do we know the user's preferences or constraints?

Respond with JSON:
{
  "hasEnoughInfo": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of assessment",
  "missingCriticalInfo": ["list any critical missing pieces"]
}`;
        try {
            const result = await this.llm.chatJSON({
                systemPrompt: 'You are an expert at assessing information completeness for planning purposes.',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
            });
            return {
                hasEnoughInfo: result.hasEnoughInfo && result.confidence > 0.7,
                reasoning: result.reasoning,
            };
        }
        catch (error) {
            console.error('[ContextGatherer] Error checking sufficiency:', error);
            // Fallback: assume we have enough if we have 3+ pieces of info
            const infoCount = Object.keys(collectedInfo).length;
            return {
                hasEnoughInfo: infoCount >= 3,
                reasoning: `Fallback assessment based on collected info count: ${infoCount}`,
            };
        }
    }
    /**
     * Resume an interactive task that was waiting for user input
     */
    async resumeInteractiveTask(taskId) {
        const task = await this.taskStore.getTask(taskId);
        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }
        if (task.status !== 'waiting_user') {
            throw new Error(`Task ${taskId} is not in waiting_user state`);
        }
        // Mark as ready to continue
        const updatedTask = await this.taskStore.updateStatus(taskId, 'ready');
        return updatedTask;
    }
    /**
     * Cancel an interactive task
     */
    async cancelInteractiveTask(taskId, reason) {
        const task = await this.taskStore.updateStatus(taskId, 'cancelled', {
            cancellationReason: reason || 'Cancelled by user or system',
            cancelledAt: (0, utils_1.now)(),
        });
        return task;
    }
    /**
     * Get summary of collected information for a goal
     */
    async getCollectedInfoSummary(goalId) {
        const tasks = await this.taskStore.getTasksByGoal(goalId);
        const interactiveTasks = tasks.filter((t) => t.type === 'interactive');
        const allInfo = {};
        const sources = [];
        for (const task of interactiveTasks) {
            if (task.collectedInfo) {
                Object.assign(allInfo, task.collectedInfo);
                sources.push(task.id);
            }
        }
        return {
            info: allInfo,
            sources,
        };
    }
    /**
     * Validate user response against question type
     */
    async validateResponse(question, response) {
        // Handle choice type with custom input
        if (question.expectedType === 'choice' && question.choices) {
            const matchingChoice = question.choices.find((c) => c.value.toLowerCase() === response.toLowerCase() ||
                c.label.toLowerCase() === response.toLowerCase());
            if (matchingChoice) {
                return {
                    valid: true,
                    extractedValue: matchingChoice.value,
                };
            }
            // Check if custom input is allowed
            const allowsCustom = question.choices.some((c) => c.allowCustom);
            if (allowsCustom) {
                return {
                    valid: true,
                    extractedValue: response,
                };
            }
            return {
                valid: false,
                extractedValue: null,
                needsClarification: true,
                clarificationQuestion: `请选择以下选项之一：${question.choices.map((c) => c.label).join('、')}`,
            };
        }
        // Handle multichoice type
        if (question.expectedType === 'multichoice' && question.choices) {
            const selectedValues = response
                .split(/[,，;；]/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            const validValues = [];
            const invalidValues = [];
            for (const value of selectedValues) {
                const matchingChoice = question.choices.find((c) => c.value.toLowerCase() === value.toLowerCase() ||
                    c.label.toLowerCase() === value.toLowerCase());
                if (matchingChoice) {
                    validValues.push(matchingChoice.value);
                }
                else {
                    invalidValues.push(value);
                }
            }
            // Check if custom input is allowed for invalid values
            const allowsCustom = question.choices.some((c) => c.allowCustom);
            if (invalidValues.length > 0 && !allowsCustom) {
                return {
                    valid: false,
                    extractedValue: null,
                    needsClarification: true,
                    clarificationQuestion: `"${invalidValues.join('、')}" 不是有效选项。请选择：${question.choices.map((c) => c.label).join('、')}`,
                };
            }
            return {
                valid: true,
                extractedValue: [...validValues, ...(allowsCustom ? invalidValues : [])],
            };
        }
        // Handle number type
        if (question.expectedType === 'number') {
            const num = parseFloat(response);
            if (isNaN(num)) {
                return {
                    valid: false,
                    extractedValue: null,
                    needsClarification: true,
                    clarificationQuestion: '请输入一个有效的数字。',
                };
            }
            return {
                valid: true,
                extractedValue: num,
            };
        }
        // Handle boolean type
        if (question.expectedType === 'boolean') {
            const lowerResponse = response.toLowerCase().trim();
            const affirmative = ['yes', '是', '对', 'true', '1', 'y'];
            const negative = ['no', '否', '不对', 'false', '0', 'n'];
            if (affirmative.includes(lowerResponse)) {
                return {
                    valid: true,
                    extractedValue: true,
                };
            }
            if (negative.includes(lowerResponse)) {
                return {
                    valid: true,
                    extractedValue: false,
                };
            }
            return {
                valid: false,
                extractedValue: null,
                needsClarification: true,
                clarificationQuestion: '请回答"是"或"否"。',
            };
        }
        // Default: string type - accept as-is
        return {
            valid: true,
            extractedValue: response,
        };
    }
}
exports.ContextGatherer = ContextGatherer;
//# sourceMappingURL=context-gatherer.js.map