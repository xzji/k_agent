/**
 * Context Gatherer
 *
 * Handles progressive information collection through interactive questioning.
 * Supports conversation-style information gathering rather than form-like questionnaires.
 */

import {
  type Goal,
  type Task,
  type QuestionBatch,
  type Question,
  type ChoiceOption,
  type ExtractedInfo,
  type Notification,
  type ITaskStore,
  type INotificationQueue,
} from '../types';
import { generateId, now, extractKeywords } from '../utils';
import { logError } from '../utils/logger';
import type { GoalDrivenConfigStore } from '../config/store.js';

/**
 * LLM Channel interface for generating questions
 */
interface LLMChannel {
  chatJSON<T>(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
  }): Promise<T>;
}

/**
 * Context Gatherer for progressive information collection
 */
export class ContextGatherer {
  private taskStore: ITaskStore;
  private notificationQueue: INotificationQueue;
  private llm: LLMChannel;
  private configStore: GoalDrivenConfigStore;

  constructor(
    taskStore: ITaskStore,
    notificationQueue: INotificationQueue,
    llm: LLMChannel,
    configStore: GoalDrivenConfigStore
  ) {
    this.taskStore = taskStore;
    this.notificationQueue = notificationQueue;
    this.llm = llm;
    this.configStore = configStore;
  }

  /**
   * Start interactive information gathering for a goal
   * Creates an interactive task and generates the first batch of questions
   */
  async startInteractiveGathering(
    goal: Goal,
    context?: string
  ): Promise<Task> {
    // Check if there's already an active interactive task for this goal
    const existingTasks = await this.taskStore.getTasksByGoal(goal.id);
    const activeInteractiveTask = existingTasks.find(
      (t) => t.type === 'interactive' &&
             ['pending', 'ready', 'in_progress', 'waiting_user'].includes(t.status)
    );

    if (activeInteractiveTask) {
      return activeInteractiveTask;
    }

    // Generate first batch of questions (round 1)
    const questions = await this.generateQuestions(goal, {}, context, 1);

    // Create interactive task
    const task = await this.taskStore.createTask({
      goalId: goal.id,
      title: `Information gathering for: ${goal.title}`,
      description: 'Progressive information collection to better understand the goal',
      executionCycle: 'once',
      executionMode: 'interactive',
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
      gatheringRound: 1,  // Start at round 1 of 3
    });

    // Send notification to user
    this.notifyUserOfQuestions(task, questions);

    return task;
  }

  /**
   * Generate next batch of questions based on collected information
   */
  async generateQuestions(
    goal: Goal,
    collectedInfo: Record<string, unknown>,
    context?: string,
    currentRound: number = 1
  ): Promise<QuestionBatch> {
    const prompt = this.buildQuestionPrompt(goal, collectedInfo, context, currentRound);

    try {
      const result = await this.llm.chatJSON<{
        questions: Array<{
          id?: string;
          question: string;
          purpose: string;
          expectedType: 'string' | 'number' | 'choice' | 'boolean' | 'multichoice';
          choices?: Array<{
            value: string;
            label: string;
            allowCustom?: boolean;
          }>;
        }>;
        hasEnoughInfo: boolean;
        reasoning: string;
      }>({
        systemPrompt: `You are an intelligent assistant helping to gather information for a user's goal.

Your task is to generate 1-3 natural, conversational questions to collect missing information.

CRITICAL CONSTRAINTS:
1. Generate AT MOST 3 questions per round
2. Information gathering will stop after ${this.configStore.get('maxInfoCollectionRounds')} rounds maximum
3. Prioritize the most important unanswered questions
4. If you have enough information after user responses, set hasEnoughInfo to true immediately

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
      // Handle case where result or result.questions might be undefined
      const rawQuestions = result?.questions || [];
      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        return {
          questions: [
            {
              id: 'fallback-1',
              question: `Could you tell me more about what you're looking for with "${goal.title}"?`,
              purpose: 'Understand the core intent behind the goal',
              expectedType: 'string' as const,
            },
          ],
          context: 'Using fallback questions due to empty response',
        };
      }

      const questions: Question[] = rawQuestions.slice(0, 3).map((q) => ({
        id: q.id || `q-${generateId().slice(0, 8)}`,
        question: q.question,
        purpose: q.purpose,
        expectedType: q.expectedType,
        choices: q.choices?.map((c) =>
          typeof c === 'string'
            ? { value: c, label: c }
            : { value: c.value, label: c.label, allowCustom: c.allowCustom }
        ),
      }));

      return {
        questions,
        context: result.reasoning,
      };
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'question_generation', goal.id);
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
  private buildQuestionPrompt(
    goal: Goal,
    collectedInfo: Record<string, unknown>,
    context?: string,
    currentRound: number = 1
  ): string {
    const hasCollectedInfo = Object.keys(collectedInfo).length > 0;
    const maxRounds = this.configStore.get('maxInfoCollectionRounds');

    return `## Goal
Title: ${goal.title}
Description: ${goal.description || 'No description provided'}

${context ? `## Additional Context\n${context}\n` : ''}

## Collection Progress
Round: ${currentRound} of ${maxRounds}
${hasCollectedInfo
  ? `Already collected ${Object.keys(collectedInfo).length} pieces of information`
  : 'No information collected yet - this is the first round'}

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

CRITICAL INSTRUCTIONS:
- This is round ${currentRound} of ${maxRounds} maximum rounds
- ${currentRound === 1 ? 'First round: ask foundational questions about the core goal' : ''}
- ${currentRound === 2 ? 'Second round: ask follow-up questions to get specific details based on first round answers' : ''}
- ${currentRound >= 3 ? 'Final round: ask any remaining critical questions before proceeding' : ''}
- Only set hasEnoughInfo to true if we have thoroughly covered all important areas
- Be thorough - better to ask one more question than to proceed with insufficient information

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
  "hasEnoughInfo": false, // Set true ONLY if we have sufficient detailed information
  "reasoning": "Why these questions (or why we have enough info)"
}`;
  }

  /**
   * Notify user of pending questions
   */
  private notifyUserOfQuestions(task: Task, questions: QuestionBatch): void {
    const formattedQuestions = questions.questions
      .map((q, index) => `${index + 1}. ${q.question}`)
      .join('\n\n');

    const notification: Omit<Notification, 'id' | 'createdAt'> = {
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
  async processUserResponse(
    taskId: string,
    userResponse: string
  ): Promise<{
    extractedInfo: ExtractedInfo;
    hasEnoughInfo: boolean;
    nextQuestions?: QuestionBatch;
  }> {
    const task = await this.taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Extract information from response
    const extractedInfo = await this.extractInfoFromResponse(
      userResponse,
      task.pendingQuestions
    );

    // Add to collected information
    await this.taskStore.addCollectedInfo(taskId, extractedInfo);

    // Get updated collected info
    const updatedTask = await this.taskStore.getTask(taskId);
    const allCollectedInfo = updatedTask?.collectedInfo || {};

    // Track gathering round
    const currentRound = updatedTask?.gatheringRound || 1;
    const maxRounds = this.configStore.get('maxInfoCollectionRounds');
    const minRounds = this.configStore.get('minInfoCollectionRounds');

    // Get goal for context
    // Note: GoalStore is not directly available, would need to be injected
    // For now, we'll create a minimal goal context from the task
    const goalContext: Partial<Goal> = {
      id: task.goalId,
      title: task.title,
      userContext: {
        collectedInfo: allCollectedInfo,
      },
    };

    // Check if we have enough information
    const sufficiencyCheck = await this.checkInfoSufficiency(
      goalContext as Goal,
      allCollectedInfo
    );

    // Complete if: (1) has enough info AND at least minRounds OR (2) reached max rounds
    const canComplete = (sufficiencyCheck.hasEnoughInfo && currentRound >= minRounds) || currentRound >= maxRounds;

    if (canComplete) {
      const completionReason = sufficiencyCheck.hasEnoughInfo
        ? 'Sufficient information collected'
        : `Maximum rounds (${maxRounds}) reached, proceeding with available information`;

      // Information gathering complete
      await this.taskStore.updateStatus(taskId, 'completed', {
        completionReason,
      });

      return {
        extractedInfo,
        hasEnoughInfo: true,
        context: completionReason,
      };
    }

    // Generate next questions
    const nextQuestions = await this.generateQuestions(
      goalContext as Goal,
      allCollectedInfo
    );

    // Update task with new questions and increment round
    await this.taskStore.updateTask(taskId, {
      pendingQuestions: nextQuestions,
      status: 'waiting_user',
      gatheringRound: currentRound + 1,
    });

    // Notify user
    this.notifyUserOfQuestions(
      { ...task, pendingQuestions: nextQuestions },
      nextQuestions
    );

    return {
      extractedInfo,
      hasEnoughInfo: false,
      nextQuestions,
    };
  }

  /**
   * Extract structured information from user response
   */
  private async extractInfoFromResponse(
    userResponse: string,
    pendingQuestions?: QuestionBatch
  ): Promise<ExtractedInfo> {
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
      const result = await this.llm.chatJSON<{
        extractedInfo: Record<string, unknown>;
        unclearPoints: string[];
        followUpNeeded: boolean;
      }>({
        systemPrompt: 'You are an expert at extracting structured information from natural language responses.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      return result.extractedInfo;
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'info_extraction');
      // Fallback: store the raw response
      return {
        rawResponse: userResponse,
        extractedAt: now(),
      };
    }
  }

  /**
   * Extract general information without specific questions
   */
  private extractGeneralInfo(userResponse: string): ExtractedInfo {
    // Simple keyword-based extraction
    const keywords = extractKeywords(userResponse).split(' ');

    return {
      rawResponse: userResponse,
      keywords,
      extractedAt: now(),
    };
  }

  /**
   * Check if we have enough information to proceed
   */
  private async checkInfoSufficiency(
    goal: Goal,
    collectedInfo: Record<string, unknown>
  ): Promise<{ hasEnoughInfo: boolean; reasoning: string }> {
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

CRITICAL REQUIREMENTS:
- We need at MINIMUM 2-3 rounds of information gathering before proceeding
- Must have specific details, not just general statements
- Must understand: specific objective, concrete timeline, available resources, constraints

Be CONSERVATIVE - only mark as hasEnoughInfo if:
1. We have SPECIFIC details (not vague statements)
2. We know concrete numbers/dates/quantities where relevant
3. We understand the user's specific context and preferences
4. Information collection has been thorough (multiple rounds)

Respond with JSON:
{
  "hasEnoughInfo": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Explanation of assessment",
  "missingCriticalInfo": ["list any critical missing pieces"]
}`;

    try {
      const result = await this.llm.chatJSON<{
        hasEnoughInfo: boolean;
        confidence: number;
        reasoning: string;
        missingCriticalInfo: string[];
      }>({
        systemPrompt: 'You are an expert at assessing information completeness for planning purposes.',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      return {
        hasEnoughInfo: result.hasEnoughInfo && result.confidence > 0.7,
        reasoning: result.reasoning,
      };
    } catch (error) {
      await logError(error instanceof Error ? error : String(error), 'info_sufficiency_check', goal.id);
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
  async resumeInteractiveTask(taskId: string): Promise<Task> {
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
  async cancelInteractiveTask(taskId: string, reason?: string): Promise<Task> {
    const task = await this.taskStore.updateStatus(taskId, 'cancelled', {
      cancellationReason: reason || 'Cancelled by user or system',
      cancelledAt: now(),
    });

    return task;
  }

  /**
   * Get summary of collected information for a goal
   */
  async getCollectedInfoSummary(goalId: string): Promise<{
    info: Record<string, unknown>;
    sources: string[];
  }> {
    const tasks = await this.taskStore.getTasksByGoal(goalId);
    const interactiveTasks = tasks.filter((t) => t.type === 'interactive');

    const allInfo: Record<string, unknown> = {};
    const sources: string[] = [];

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
  async validateResponse(
    question: Question,
    response: string
  ): Promise<{
    valid: boolean;
    extractedValue: unknown;
    needsClarification?: boolean;
    clarificationQuestion?: string;
  }> {
    // Handle choice type with custom input
    if (question.expectedType === 'choice' && question.choices) {
      const matchingChoice = question.choices.find(
        (c) =>
          c.value.toLowerCase() === response.toLowerCase() ||
          c.label.toLowerCase() === response.toLowerCase()
      );

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

      const validValues: string[] = [];
      const invalidValues: string[] = [];

      for (const value of selectedValues) {
        const matchingChoice = question.choices.find(
          (c) =>
            c.value.toLowerCase() === value.toLowerCase() ||
            c.label.toLowerCase() === value.toLowerCase()
        );

        if (matchingChoice) {
          validValues.push(matchingChoice.value);
        } else {
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
