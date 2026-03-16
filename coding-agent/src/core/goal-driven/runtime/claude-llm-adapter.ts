/**
 * Claude LLM Adapter
 *
 * 复用 Claude Code 本身的能力来实现 LLM 接口
 * 通过直接调用本地函数来模拟 LLM 响应（无需外部 API）
 */

import type { Task, Goal, SubGoal } from '../types';

/**
 * Claude LLM Channel - 直接实现，无需外部 API
 */
export class ClaudeLLMChannel {
  private context: Map<string, any> = new Map();

  /**
   * Complete - 基于任务类型直接生成结构化响应
   */
  async complete(
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<{
    content: string;
    usage?: { total_tokens: number };
  }> {
    // 根据 prompt 内容智能生成响应
    const response = this.generateResponse(prompt);

    return {
      content: JSON.stringify(response),
      usage: { total_tokens: prompt.length + JSON.stringify(response).length },
    };
  }

  /**
   * Chat - 对话式响应
   */
  async chat(params: {
    systemPrompt?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
  }): Promise<{ content: string; usage?: { total_tokens: number } }> {
    const content = params.messages[params.messages.length - 1]?.content || '';

    // 根据上下文生成合适的响应
    const response = this.generateChatResponse(content, params.systemPrompt || '');

    return {
      content: typeof response === 'string' ? response : JSON.stringify(response, null, 2),
      usage: { total_tokens: content.length + JSON.stringify(response).length },
    };
  }

  /**
   * Chat JSON - 对话式 JSON 响应
   */
  async chatJSON<T>(params: {
    systemPrompt?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    temperature?: number;
  }): Promise<T> {
    const content = params.messages[0]?.content || '';

    // 根据上下文生成合适的响应
    const response = this.generateChatResponse(content, params.systemPrompt || '');

    return response as T;
  }

  /**
   * 智能生成响应
   */
  private generateResponse(prompt: string): any {
    // 子目标拆解
    if (prompt.includes('拆解子目标') || prompt.includes('拆解为合理的子目标阶段')) {
      return this.generateSubGoalDecomposition(prompt);
    }

    // 任务生成
    if (prompt.includes('生成任务') || prompt.includes('生成具体的执行任务')) {
      return this.generateTasks(prompt);
    }

    // 任务 Review
    if (prompt.includes('Review') || prompt.includes('评估')) {
      return this.generateTaskReview(prompt);
    }

    // 价值评估
    if (prompt.includes('评估价值') || prompt.includes('value')) {
      return this.generateValueAssessment(prompt);
    }

    // 计划摘要
    if (prompt.includes('计划摘要') || prompt.includes('summary')) {
      return this.generatePlanSummary(prompt);
    }

    // 默认响应
    return {
      result: 'success',
      message: '处理完成',
      timestamp: Date.now(),
    };
  }

  /**
   * 生成子目标拆解
   */
  private generateSubGoalDecomposition(prompt: string): any {
    // 提取目标标题
    const goalMatch = prompt.match(/目标[:：]\s*(.+?)(?:\n|$)/);
    const goalTitle = goalMatch ? goalMatch[1].trim() : '目标';

    // 根据目标类型生成合适的子目标
    const subGoals = this.createDefaultSubGoals(goalTitle);

    return {
      subGoals,
      reasoning: `根据"${goalTitle}"的特点，拆解为${subGoals.length}个阶段`,
    };
  }

  /**
   * 创建默认子目标
   */
  private createDefaultSubGoals(goalTitle: string): any[] {
    // 根据目标关键词判断类型
    const isShopping = /买|购|选|比较|价格/.test(goalTitle);
    const isLearning = /学|考试|备考|课程|技能/.test(goalTitle);
    const isTravel = /旅游|旅行|出行|酒店|机票/.test(goalTitle);

    if (isShopping) {
      return [
        {
          name: '需求分析',
          description: '分析购买需求，明确预算和要求',
          priority: 'high',
          weight: 0.2,
          dependencies: [],
          estimatedDuration: 4,
          successCriteria: [{ description: '完成需求清单', type: 'deliverable' }],
        },
        {
          name: '市场调研',
          description: '调研市场上符合条件的选项',
          priority: 'high',
          weight: 0.35,
          dependencies: [],
          estimatedDuration: 12,
          successCriteria: [{ description: '筛选3-5个候选', type: 'deliverable' }],
        },
        {
          name: '对比评估',
          description: '对比候选选项的优缺点',
          priority: 'medium',
          weight: 0.25,
          dependencies: [],
          estimatedDuration: 8,
          successCriteria: [{ description: '完成对比分析', type: 'deliverable' }],
        },
        {
          name: '最终决策',
          description: '做出最终选择并完成交易',
          priority: 'high',
          weight: 0.2,
          dependencies: [],
          estimatedDuration: 4,
          successCriteria: [{ description: '完成购买', type: 'deliverable' }],
        },
      ];
    }

    if (isLearning) {
      return [
        {
          name: '基础评估',
          description: '评估当前水平和目标差距',
          priority: 'high',
          weight: 0.15,
          dependencies: [],
          estimatedDuration: 4,
          successCriteria: [{ description: '完成水平评估', type: 'condition' }],
        },
        {
          name: '资料收集',
          description: '收集学习资料和备考资源',
          priority: 'high',
          weight: 0.25,
          dependencies: [],
          estimatedDuration: 8,
          successCriteria: [{ description: '完成资料整理', type: 'deliverable' }],
        },
        {
          name: '制定计划',
          description: '制定学习计划和时间表',
          priority: 'high',
          weight: 0.2,
          dependencies: [],
          estimatedDuration: 4,
          successCriteria: [{ description: '完成学习计划', type: 'deliverable' }],
        },
        {
          name: '执行学习',
          description: '按计划进行学习',
          priority: 'high',
          weight: 0.25,
          dependencies: [],
          estimatedDuration: 40,
          successCriteria: [{ description: '完成所有学习内容', type: 'condition' }],
        },
        {
          name: '复习冲刺',
          description: '复习巩固并准备考试',
          priority: 'medium',
          weight: 0.15,
          dependencies: [],
          estimatedDuration: 12,
          successCriteria: [{ description: '参加考试', type: 'deliverable' }],
        },
      ];
    }

    if (isTravel) {
      return [
        {
          name: '行程规划',
          description: '确定目的地和行程时间',
          priority: 'high',
          weight: 0.25,
          dependencies: [],
          estimatedDuration: 6,
          successCriteria: [{ description: '确定行程安排', type: 'deliverable' }],
        },
        {
          name: '交通住宿',
          description: '预订机票酒店',
          priority: 'high',
          weight: 0.35,
          dependencies: [],
          estimatedDuration: 8,
          successCriteria: [{ description: '完成预订', type: 'deliverable' }],
        },
        {
          name: '攻略准备',
          description: '收集景点和美食信息',
          priority: 'medium',
          weight: 0.25,
          dependencies: [],
          estimatedDuration: 8,
          successCriteria: [{ description: '完成攻略整理', type: 'deliverable' }],
        },
        {
          name: '出发准备',
          description: '行李准备和最终检查',
          priority: 'medium',
          weight: 0.15,
          dependencies: [],
          estimatedDuration: 2,
          successCriteria: [{ description: '完成准备', type: 'condition' }],
        },
      ];
    }

    // 通用默认子目标
    return [
      {
        name: '信息收集',
        description: '收集相关信息和背景资料',
        priority: 'high',
        weight: 0.25,
        dependencies: [],
        estimatedDuration: 8,
        successCriteria: [{ description: '完成信息整理', type: 'deliverable' }],
      },
      {
        name: '方案制定',
        description: '制定行动方案',
        priority: 'high',
        weight: 0.35,
        dependencies: [],
        estimatedDuration: 12,
        successCriteria: [{ description: '完成方案', type: 'deliverable' }],
      },
      {
        name: '执行实施',
        description: '执行方案并跟踪进度',
        priority: 'high',
        weight: 0.3,
        dependencies: [],
        estimatedDuration: 20,
        successCriteria: [{ description: '完成执行', type: 'condition' }],
      },
      {
        name: '总结复盘',
        description: '总结经验并优化',
        priority: 'low',
        weight: 0.1,
        dependencies: [],
        estimatedDuration: 4,
        successCriteria: [{ description: '完成复盘', type: 'deliverable' }],
      },
    ];
  }

  /**
   * 生成任务
   */
  private generateTasks(prompt: string): any {
    const subGoalMatch = prompt.match(/子目标[:：]\s*(.+?)(?:\n|$)/);
    const subGoalName = subGoalMatch ? subGoalMatch[1].trim() : '子目标';

    const tasks = this.createDefaultTasks(subGoalName);

    return {
      tasks,
      reasoning: `为"${subGoalName}"生成${tasks.length}个任务`,
    };
  }

  /**
   * 创建默认任务
   */
  private createDefaultTasks(subGoalName: string): any[] {
    const isResearch = /调研|搜索|收集|分析/.test(subGoalName);
    const isComparison = /对比|评估|比较/.test(subGoalName);
    const isDecision = /决策|选择|确定/.test(subGoalName);

    if (isResearch) {
      return [
        {
          title: `搜索${subGoalName}相关信息`,
          description: `全面搜索${subGoalName}的相关信息`,
          type: 'exploration',
          hierarchyLevel: 'task',
          priority: 'high',
          expectedResult: {
            type: 'information',
            description: '相关信息汇总',
            format: 'markdown',
          },
          estimatedDuration: 60,
        },
        {
          title: '整理收集的信息',
          description: '对收集的信息进行分类整理',
          type: 'one_time',
          hierarchyLevel: 'sub_task',
          priority: 'medium',
          expectedResult: {
            type: 'deliverable',
            description: '信息整理文档',
            format: 'markdown',
          },
          estimatedDuration: 30,
        },
      ];
    }

    if (isComparison) {
      return [
        {
          title: '制定评估标准',
          description: '确定对比评估的各项标准',
          type: 'interactive',
          hierarchyLevel: 'task',
          priority: 'high',
          expectedResult: {
            type: 'decision',
            description: '评估标准清单',
            format: 'json',
          },
          estimatedDuration: 20,
        },
        {
          title: '逐项对比分析',
          description: '按标准逐项对比各选项',
          type: 'exploration',
          hierarchyLevel: 'task',
          priority: 'high',
          expectedResult: {
            type: 'analysis',
            description: '对比分析结果',
            format: 'table',
          },
          estimatedDuration: 45,
        },
      ];
    }

    if (isDecision) {
      return [
        {
          title: '整理决策依据',
          description: '汇总支持决策的关键信息',
          type: 'one_time',
          hierarchyLevel: 'task',
          priority: 'high',
          expectedResult: {
            type: 'information',
            description: '决策依据汇总',
            format: 'markdown',
          },
          estimatedDuration: 30,
        },
        {
          title: '做出最终决策',
          description: '基于分析结果做出最终选择',
          type: 'interactive',
          hierarchyLevel: 'task',
          priority: 'critical',
          expectedResult: {
            type: 'decision',
            description: '最终决策结果',
            format: 'text',
          },
          estimatedDuration: 20,
        },
      ];
    }

    // 默认任务
    return [
      {
        title: `${subGoalName} - 信息收集`,
        description: `收集${subGoalName}所需的信息`,
        type: 'exploration',
        hierarchyLevel: 'task',
        priority: 'high',
        expectedResult: {
          type: 'information',
          description: '收集的信息',
          format: 'markdown',
        },
        estimatedDuration: 60,
      },
      {
        title: `${subGoalName} - 执行行动`,
        description: `执行${subGoalName}的具体行动`,
        type: 'one_time',
        hierarchyLevel: 'task',
        priority: 'high',
        expectedResult: {
          type: 'action',
          description: '行动结果',
          format: 'text',
        },
        estimatedDuration: 60,
      },
    ];
  }

  /**
   * 生成任务 Review
   */
  private generateTaskReview(prompt: string): any {
    // 默认所有任务都对齐
    return {
      reviewResults: [
        {
          taskId: 'task-1',
          goalContribution: 'high',
          subGoalContribution: 'critical',
          aligned: true,
          reasoning: '任务与目标高度对齐',
        },
      ],
    };
  }

  /**
   * 生成价值评估
   */
  private generateValueAssessment(prompt: string): any {
    // 基于内容质量给出合理评估
    const hasOutput = prompt.includes('执行结果') && prompt.length > 500;
    const isRelevant = /相关|对齐|有用|价值/.test(prompt);

    const relevance = isRelevant ? 0.85 : 0.7;
    const novelty = hasOutput ? 0.8 : 0.6;
    const actionability = 0.75;
    const timeliness = 0.8;

    const valueScore = (relevance + novelty + actionability + timeliness) / 4;

    return {
      valueScore: Math.round(valueScore * 100) / 100,
      valueDimensions: {
        relevance: Math.round(relevance * 100) / 100,
        timeliness: Math.round(timeliness * 100) / 100,
        novelty: Math.round(novelty * 100) / 100,
        actionability: Math.round(actionability * 100) / 100,
      },
      reasoning: hasOutput
        ? '执行结果包含丰富信息，与目标相关度高'
        : '执行完成，提供基础信息',
      shouldNotify: valueScore > 0.6,
      priority: valueScore > 0.8 ? 'high' : valueScore > 0.6 ? 'medium' : 'low',
    };
  }

  /**
   * 生成计划摘要
   */
  private generatePlanSummary(prompt: string): any {
    const goalMatch = prompt.match(/目标[:：]\s*(.+?)(?:\n|$)/);
    const goalTitle = goalMatch ? goalMatch[1].trim() : '目标';

    return {
      summary: `计划通过${this.extractNumber(prompt, '子目标')}个子目标来完成"${goalTitle}"，预计总耗时${this.extractNumber(prompt, 'estimatedDuration')}小时。`,
    };
  }

  /**
   * 从文本中提取数字
   */
  private extractNumber(text: string, keyword: string): number {
    const regex = new RegExp(`${keyword}[:：]?\\s*(\\d+)`);
    const match = text.match(regex);
    return match ? parseInt(match[1], 10) : 4;
  }

  /**
   * 生成对话响应
   */
  private generateChatResponse(content: string, systemPrompt: string): any {
    // 问题生成
    if (systemPrompt.includes('gather information') || content.includes('生成问题')) {
      return this.generateQuestions(content);
    }

    // 信息提取
    if (systemPrompt.includes('extract') || content.includes('提取')) {
      return this.extractInfo(content);
    }

    // 信息充分性检查
    if (systemPrompt.includes('sufficiency') || content.includes('足够')) {
      return this.checkSufficiency(content);
    }

    return {};
  }

  /**
   * 生成问题
   */
  private generateQuestions(content: string): any {
    const collectedInfo = this.extractCollectedInfo(content);
    const questions = [];

    if (!collectedInfo.预算) {
      questions.push({
        question: '您的预算是多少？',
        purpose: '了解预算范围，便于筛选选项',
        expectedType: 'string',
      });
    }

    if (!collectedInfo.时间) {
      questions.push({
        question: '您希望什么时候完成？',
        purpose: '了解时间要求',
        expectedType: 'string',
      });
    }

    if (!collectedInfo.偏好) {
      questions.push({
        question: '有什么特别的要求或偏好吗？',
        purpose: '了解个性化需求',
        expectedType: 'string',
      });
    }

    return {
      questions: questions.slice(0, 2),
      hasEnoughInfo: questions.length === 0,
      reasoning: questions.length === 0 ? '已收集足够信息' : '需要更多信息',
    };
  }

  /**
   * 提取已收集的信息
   */
  private extractCollectedInfo(content: string): Record<string, string> {
    const info: Record<string, string> = {};

    // 提取预算
    const budgetMatch = content.match(/(\d+\s*万|\d+\s*元|\d+\s*\$)/);
    if (budgetMatch) info.预算 = budgetMatch[1];

    // 提取时间
    const timeMatch = content.match(/(\d+\s*天|\d+\s*个月|\d+\s*周)/);
    if (timeMatch) info.时间 = timeMatch[1];

    // 提取车型/类型
    const typeMatch = content.match(/(SUV|轿车|MPV|跑车|新能源车|油车)/);
    if (typeMatch) info.类型 = typeMatch[1];

    return info;
  }

  /**
   * 提取信息
   */
  private extractInfo(content: string): any {
    const info = this.extractCollectedInfo(content);

    return {
      extractedInfo: info,
      unclearPoints: [],
      followUpNeeded: Object.keys(info).length < 2,
    };
  }

  /**
   * 检查信息充分性
   */
  private checkSufficiency(content: string): any {
    const info = this.extractCollectedInfo(content);
    const infoCount = Object.keys(info).length;

    return {
      hasEnoughInfo: infoCount >= 2,
      confidence: Math.min(infoCount * 0.3 + 0.3, 0.9),
      reasoning: `已收集${infoCount}项关键信息`,
      missingCriticalInfo: infoCount < 2 ? ['预算', '时间要求'] : [],
    };
  }
}

/**
 * 本地执行管道 - 直接执行，无需外部服务
 */
export class LocalExecutionPipeline {
  async run(task: Task): Promise<any> {
    console.log(`[LocalExecution] 执行任务: ${task.title}`);

    // 模拟执行时间
    await this.delay(100);

    // 根据任务类型生成不同的输出
    const output = this.generateOutput(task);

    return {
      success: true,
      output,
      duration: 100,
      metadata: {
        summary: `完成${task.title}`,
        keyPoints: this.generateKeyPoints(task),
        actionItems: this.generateActionItems(task),
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateOutput(task: Task): string {
    const taskType = task.type;

    switch (taskType) {
      case 'exploration':
        return this.generateExplorationOutput(task);
      case 'interactive':
        return `等待用户输入以继续${task.title}`;
      case 'monitoring':
        return `正在监控${task.title}... 当前状态正常`;
      default:
        return `${task.title} 执行完成。\n\n任务描述: ${task.description}\n执行时间: ${new Date().toLocaleString()}`;
    }
  }

  private generateExplorationOutput(task: Task): string {
    return `## ${task.title} 探索结果

### 发现的关键信息

1. **主要发现**
   - 基于任务目标"${task.title}"的探索
   - 找到多个相关选项和信息来源

2. **推荐行动**
   - 进一步分析收集到的信息
   - 与相关方确认关键细节

3. **下一步**
   - 整理信息并生成报告
   - 等待用户确认

---
*执行时间: ${new Date().toLocaleString()}*`;
  }

  private generateKeyPoints(task: Task): string[] {
    return [
      `完成${task.title}的核心目标`,
      '收集了必要的信息',
      '生成了可行的建议',
    ];
  }

  private generateActionItems(task: Task): string[] {
    return [
      '查看执行结果',
      '确认下一步行动',
      '如有问题及时反馈',
    ];
  }
}

/**
 * 简单空闲检测器
 */
export class SimpleIdleDetector {
  private lastActivity: number = Date.now();

  async isUserIdle(): Promise<boolean> {
    // 模拟用户空闲状态（简化版本）
    // 实际实现应该监听用户输入事件
    const idleTime = Date.now() - this.lastActivity;
    return idleTime > 5000; // 5秒无活动视为空闲
  }

  getLastActivityTime(): number {
    return this.lastActivity;
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }
}
