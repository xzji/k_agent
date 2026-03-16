#!/usr/bin/env node
/**
 * Goal-Driven Agent - 完整交互式 Demo
 *
 * 展示从目标提交到结果推送的完整流程
 * 运行: node interactive-demo.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 模拟 LLM 调用
async function mockLLM(prompt, type = 'text') {
  console.log(`\n[LLM 调用] ${prompt.slice(0, 50)}...`);
  await sleep(800);
  return `[LLM响应-${type}]`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printSection(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function printStep(step, desc) {
  console.log(`\n📌 步骤 ${step}: ${desc}`);
  console.log('-'.repeat(40));
}

// 提问函数
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

// 展示选项并获取选择
async function askWithOptions(question, options) {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}${opt.desc ? ` (${opt.desc})` : ''}`);
  });
  console.log(`  ${options.length + 1}. 自定义输入`);

  const answer = await ask('请选择 (输入数字): ');
  const choice = parseInt(answer);

  if (choice === options.length + 1) {
    const custom = await ask('请输入自定义内容: ');
    return { value: custom, isCustom: true };
  }

  if (choice >= 1 && choice <= options.length) {
    return { value: options[choice - 1].value || options[choice - 1].label, isCustom: false };
  }

  return askWithOptions(question, options);
}

// ═══════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════

class GoalDrivenAgentDemo {
  constructor() {
    this.userGoal = null;
    this.collectedInfo = {};
    this.subGoals = [];
    this.tasks = [];
    this.executionResults = [];
  }

  async run() {
    printSection('🎯 Goal-Driven Agent 完整交互演示');
    console.log('\n这是一个模拟演示，展示 Agent 如何与用户交互完成目标。\n');

    await this.step1_collectUserGoal();
    await this.step2_analyzeAndAskQuestions();
    await this.step3_decomposeSubGoals();
    await this.step4_defineGoalRelationships();
    await this.step5_generateTasks();
    await this.step6_reviewTasks();
    await this.step7_confirmFrequency();
    await this.step8_presentPlan();
    await this.step9_executeInBackground();
    await this.step10_deliverResults();
    await this.step11_collectFeedback();

    printSection('✅ 演示完成');
    console.log('\n感谢您的参与！这个演示展示了完整的交互流程。\n');
    rl.close();
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤1: 收集用户目标
  // ═══════════════════════════════════════════════════════════
  async step1_collectUserGoal() {
    printStep(1, '用户提交目标');

    // 使用默认值以便演示
    this.userGoal = '我想在3个月内通过雅思考试，目标分数7.0，目前四级500分水平';
    console.log(`📝 用户目标: ${this.userGoal}`);
    console.log('   (演示中使用默认目标)');
    console.log('\n[系统] 正在分析目标...');
    await sleep(1000);
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤2: LLM 拆解问题，向用户提问
  // ═══════════════════════════════════════════════════════════
  async step2_analyzeAndAskQuestions() {
    printStep(2, 'LLM 拆解目标，生成问题收集背景信息');

    console.log('\n🤖 [LLM] 分析目标: "' + this.userGoal + '"');
    console.log('   识别出需要了解的关键信息:');
    console.log('   - 当前英语基础水平');
    console.log('   - 每天可投入学习时间');
    console.log('   - 预算范围');
    console.log('   - 偏好的学习方式');
    await sleep(1500);

    // 问题1: 当前水平
    const q1 = await askWithOptions(
      '为了制定合适的计划，请告诉我您目前的英语水平:',
      [
        { label: '四级 425-500分', value: 'cet4_425_500' },
        { label: '四级 500-550分', value: 'cet4_500_550' },
        { label: '六级 425-500分', value: 'cet6_425_500' },
        { label: '六级 500分以上', value: 'cet6_500_plus' },
      ]
    );
    this.collectedInfo.englishLevel = q1.value;
    console.log(`   ✅ 记录: 英语水平 = ${q1.value}${q1.isCustom ? ' (自定义)' : ''}`);

    // 问题2: 学习时间
    const q2 = await askWithOptions(
      '您每天能投入多少时间学习?',
      [
        { label: '1小时以内', value: '1h', desc: '适合轻松备考' },
        { label: '1-2小时', value: '1_2h', desc: '推荐的学习强度' },
        { label: '2-3小时', value: '2_3h', desc: '高强度备考' },
        { label: '3小时以上', value: '3h_plus', desc: '冲刺模式' },
      ]
    );
    this.collectedInfo.dailyTime = q2.value;
    console.log(`   ✅ 记录: 每日学习时间 = ${q2.value}`);

    // 问题3: 预算
    const q3 = await askWithOptions(
      '您的备考预算范围是?',
      [
        { label: '1000元以内', value: '1000', desc: '主要使用免费资源' },
        { label: '1000-3000元', value: '1000_3000', desc: '可购买部分课程' },
        { label: '3000-5000元', value: '3000_5000', desc: '可选择优质课程' },
        { label: '5000元以上', value: '5000_plus', desc: '全面备考支持' },
      ]
    );
    this.collectedInfo.budget = q3.value;
    console.log(`   ✅ 记录: 预算 = ${q3.value}`);

    // 问题4: 学习方式
    const q4 = await askWithOptions(
      '您偏好哪种学习方式?',
      [
        { label: '自学', value: 'self', desc: '自己看书、做题' },
        { label: '在线课程', value: 'online', desc: '视频课程学习' },
        { label: '线下培训', value: 'offline', desc: '面授课程' },
        { label: '混合模式', value: 'mixed', desc: '自学+课程结合' },
      ]
    );
    this.collectedInfo.learningStyle = q4.value;
    console.log(`   ✅ 记录: 学习方式 = ${q4.value}`);

    console.log('\n📊 [系统] 已收集的背景信息:');
    console.log(JSON.stringify(this.collectedInfo, null, 2));
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤3: 拆解子目标
  // ═══════════════════════════════════════════════════════════
  async step3_decomposeSubGoals() {
    printStep(3, 'Agent 拆解子目标');

    console.log('\n🤖 [LLM] 基于目标分析，拆解为以下子目标:');
    await sleep(1500);

    this.subGoals = [
      {
        id: 'sg-1',
        name: '了解雅思考试结构和评分标准',
        description: '全面熟悉雅思4个模块的考试形式、题型和评分标准',
        priority: 'critical',
        estimatedDuration: '1周',
        dependencies: [],
        completionCriteria: '能清楚说明每个模块的题型和时间分配'
      },
      {
        id: 'sg-2',
        name: '准备学习资料和工具',
        description: '根据预算和学习方式，获取合适的书籍、APP和课程',
        priority: 'high',
        estimatedDuration: '1-2周',
        dependencies: ['sg-1'],
        completionCriteria: '拥有完整的学习资料包'
      },
      {
        id: 'sg-3',
        name: '建立每日学习习惯',
        description: `按照每日${this.collectedInfo.dailyTime}的学习强度，建立稳定的学习节奏`,
        priority: 'critical',
        estimatedDuration: '持续到考试',
        dependencies: ['sg-2'],
        completionCriteria: '连续7天完成学习计划'
      },
      {
        id: 'sg-4',
        name: '听力能力提升到7分水平',
        description: '通过系统练习，听力部分达到7分要求',
        priority: 'high',
        estimatedDuration: '8周',
        dependencies: ['sg-3'],
        completionCriteria: '模拟考试听力部分7分以上'
      },
      {
        id: 'sg-5',
        name: '阅读能力提升到7分水平',
        description: '掌握阅读技巧，达到7分要求',
        priority: 'high',
        estimatedDuration: '8周',
        dependencies: ['sg-3'],
        completionCriteria: '模拟考试阅读部分7分以上'
      },
      {
        id: 'sg-6',
        name: '写作能力提升到7分水平',
        description: '掌握写作套路和评分标准，达到7分要求',
        priority: 'high',
        estimatedDuration: '10周',
        dependencies: ['sg-3'],
        completionCriteria: '写作Task1和Task2均达到7分标准'
      },
      {
        id: 'sg-7',
        name: '口语能力提升到7分水平',
        description: '通过话题准备和练习，达到7分要求',
        priority: 'high',
        estimatedDuration: '10周',
        dependencies: ['sg-3'],
        completionCriteria: '口语模拟测试7分以上'
      },
      {
        id: 'sg-8',
        name: '完成报名并参加考试',
        description: '在合适的时间报名并完成正式考试',
        priority: 'critical',
        estimatedDuration: '1周',
        dependencies: ['sg-4', 'sg-5', 'sg-6', 'sg-7'],
        completionCriteria: '完成正式考试'
      }
    ];

    this.subGoals.forEach((sg, i) => {
      const icon = sg.priority === 'critical' ? '🔴' : '🟡';
      const depStr = sg.dependencies.length > 0
        ? ` [依赖: ${sg.dependencies.join(', ')}]`
        : ' [无依赖]';
      console.log(`\n   ${icon} 子目标 ${i + 1}: ${sg.name}${depStr}`);
      console.log(`      描述: ${sg.description}`);
      console.log(`      预计耗时: ${sg.estimatedDuration}`);
      console.log(`      完成标准: ${sg.completionCriteria}`);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤4: 梳理子目标关系
  // ═══════════════════════════════════════════════════════════
  async step4_defineGoalRelationships() {
    printStep(4, '梳理子目标与最终目标的关系');

    console.log('\n📊 最终目标实现条件: 全部子目标完成 (8/8)');
    console.log('\n🗺️  子目标依赖关系图:');

    const graph = `
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   子目标1: 了解考试结构                                  │
    │        ↓                                                │
    │   子目标2: 准备学习资料                                  │
    │        ↓                                                │
    │   子目标3: 建立学习习惯 ◄────────────────────┐          │
    │        ↓                                    │          │
    │   ┌────┴────┬────────┬────────┐            │          │
    │   ↓         ↓        ↓        ↓            │          │
    │ 子目标4   子目标5   子目标6   子目标7       │          │
    │ 听力提升   阅读提升   写作提升   口语提升      │          │
    │   └────────┴────────┴────────┘            │          │
    │              ↓                            │          │
    │        子目标8: 完成考试                    │          │
    │                                           │          │
    │   ┌───────────────────────────────────────┘          │
    │   ↓ 循环: 持续学习习惯                                 │
    │                                                        │
    └─────────────────────────────────────────────────────────┘
    `;
    console.log(graph);

    console.log('\n📋 依赖关系说明:');
    console.log('   • 子目标1 → 子目标2 → 子目标3 (顺序依赖)');
    console.log('   • 子目标3 → 子目标4/5/6/7 (并行执行)');
    console.log('   • 子目标4/5/6/7 → 子目标8 (全部完成后才能考试)');

    console.log('\n🎯 关键路径:');
    console.log('   了解考试 → 准备资料 → 建立习惯 → 四项提升 → 完成考试');
    console.log('   预计总时长: 12周 (约3个月)');
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤5: 生成任务
  // ═══════════════════════════════════════════════════════════
  async step5_generateTasks() {
    printStep(5, '针对每个子目标生成任务');

    console.log('\n🤖 [LLM] 为每个子目标生成具体任务...\n');
    await sleep(1500);

    this.tasks = [
      // 子目标1: 了解考试结构
      {
        id: 'task-1-1',
        subGoalId: 'sg-1',
        name: '搜索雅思考试官方介绍',
        description: '搜索雅思官网和权威介绍，了解考试基本信息',
        type: 'exploration',
        priority: 'critical',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '一份雅思考试结构说明文档',
        executionCycle: '一次性',
        reviewStatus: 'pending'
      },
      {
        id: 'task-1-2',
        subGoalId: 'sg-1',
        name: '整理各模块评分标准',
        description: '整理听力、阅读、写作、口语的评分细则',
        type: 'one_time',
        priority: 'high',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '评分标准对照表',
        executionCycle: '一次性',
        reviewStatus: 'pending'
      },

      // 子目标2: 准备学习资料
      {
        id: 'task-2-1',
        subGoalId: 'sg-2',
        name: '根据预算搜索备考书籍',
        description: `搜索适合${this.collectedInfo.englishLevel}水平的备考书籍，预算${this.collectedInfo.budget}`,
        type: 'exploration',
        priority: 'high',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '推荐书籍清单（含价格对比）',
        executionCycle: '一次性',
        reviewStatus: 'pending'
      },
      {
        id: 'task-2-2',
        subGoalId: 'sg-2',
        name: '搜索免费练习资源',
        description: '寻找官方和第三方的免费练习题库',
        type: 'exploration',
        priority: 'medium',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '免费资源汇总列表',
        executionCycle: '一次性',
        reviewStatus: 'pending'
      },

      // 子目标3: 建立学习习惯
      {
        id: 'task-3-1',
        subGoalId: 'sg-3',
        name: '制定每日学习计划',
        description: `制定每日${this.collectedInfo.dailyTime}的学习安排，分配四个模块时间`,
        type: 'one_time',
        priority: 'critical',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '详细的每日学习计划表',
        executionCycle: '一次性',
        reviewStatus: 'pending'
      },
      {
        id: 'task-3-2',
        subGoalId: 'sg-3',
        name: '每日学习提醒',
        description: '每天提醒用户按计划学习',
        type: 'recurring',
        priority: 'critical',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '每日学习提醒通知',
        executionCycle: '每天9:00',
        reviewStatus: 'pending'
      },
      {
        id: 'task-3-3',
        subGoalId: 'sg-3',
        name: '每周学习总结',
        description: '每周总结学习完成情况，调整下周计划',
        type: 'recurring',
        priority: 'high',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '周学习报告',
        executionCycle: '每周日晚',
        reviewStatus: 'pending'
      },

      // 子目标4-7: 四项能力提升（各生成一个代表性任务）
      {
        id: 'task-4-1',
        subGoalId: 'sg-4',
        name: '听力专项练习',
        description: '每日听力练习，完成真题和模拟题',
        type: 'recurring',
        priority: 'high',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '听力练习完成记录和错题分析',
        executionCycle: '每天',
        reviewStatus: 'pending'
      },
      {
        id: 'task-5-1',
        subGoalId: 'sg-5',
        name: '阅读专项练习',
        description: '每日阅读练习，提升阅读速度和准确率',
        type: 'recurring',
        priority: 'high',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '阅读练习完成记录和技巧总结',
        executionCycle: '每天',
        reviewStatus: 'pending'
      },
      {
        id: 'task-6-1',
        subGoalId: 'sg-6',
        name: '写作练习与批改',
        description: '每周完成2篇写作练习，分析范文',
        type: 'recurring',
        priority: 'high',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '写作练习文档和评分',
        executionCycle: '每周二、五',
        reviewStatus: 'pending'
      },
      {
        id: 'task-7-1',
        subGoalId: 'sg-7',
        name: '口语话题准备',
        description: '准备当季口语话题，练习回答',
        type: 'recurring',
        priority: 'high',
        urgency: 'medium',
        completionRate: 0,
        expectedResult: '口语话题库和回答示例',
        executionCycle: '每天',
        reviewStatus: 'pending'
      },

      // 子目标8: 完成考试
      {
        id: 'task-8-1',
        subGoalId: 'sg-8',
        name: '监控考试报名开放',
        description: '监控雅思官网，及时提醒报名时间',
        type: 'monitoring',
        priority: 'critical',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '报名提醒通知',
        executionCycle: '持续监控',
        reviewStatus: 'pending'
      },
      {
        id: 'task-8-2',
        subGoalId: 'sg-8',
        name: '考前一周提醒',
        description: '考试前一周提醒准备事项',
        type: 'event_triggered',
        priority: 'critical',
        urgency: 'high',
        completionRate: 0,
        expectedResult: '考前准备清单',
        executionCycle: '考前7天触发',
        reviewStatus: 'pending'
      }
    ];

    console.log(`✅ 共生成 ${this.tasks.length} 个任务\n`);

    // 按子目标分组展示
    this.subGoals.forEach(sg => {
      const sgTasks = this.tasks.filter(t => t.subGoalId === sg.id);
      if (sgTasks.length > 0) {
        console.log(`📦 子目标 "${sg.name}"`);
        sgTasks.forEach(task => {
          const typeIcon = {
            exploration: '🔍',
            one_time: '📝',
            recurring: '⏰',
            monitoring: '👀',
            event_triggered: '⚡'
          }[task.type];
          console.log(`   ${typeIcon} ${task.name} [${task.type}]`);
          console.log(`      周期: ${task.executionCycle}`);
          console.log(`      预期结果: ${task.expectedResult}`);
        });
        console.log('');
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤6: Review 任务
  // ═══════════════════════════════════════════════════════════
  async step6_reviewTasks() {
    printStep(6, 'Review 任务 - 判断是否围绕终极目标');

    console.log('\n🤖 [系统] 正在评估每个任务的相关性...\n');
    await sleep(1500);

    const reviews = this.tasks.map(task => {
      const subGoal = this.subGoals.find(sg => sg.id === task.subGoalId);

      // 评估贡献度
      let contribution = 'high';
      let reason = '';

      if (task.type === 'exploration' && task.subGoalId === 'sg-1') {
        contribution = 'critical';
        reason = '了解考试是后续所有准备的基础';
      } else if (task.type === 'recurring' && task.subGoalId.startsWith('sg-')) {
        contribution = 'high';
        reason = '持续提升能力，直接服务于7分目标';
      } else if (task.name.includes('搜索') && task.name.includes('资料')) {
        contribution = 'medium';
        reason = '为学习提供资源支持';
      }

      return {
        ...task,
        reviewResult: {
          isAligned: true,
          contribution,
          reason,
          confidence: contribution === 'critical' ? 0.95 : contribution === 'high' ? 0.85 : 0.7
        }
      };
    });

    console.log('📊 Review 结果:\n');
    reviews.forEach((task, i) => {
      const icon = task.reviewResult.isAligned ? '✅' : '❌';
      const contribIcon = {
        critical: '🔴',
        high: '🟢',
        medium: '🟡',
        low: '⚪'
      }[task.reviewResult.contribution];

      console.log(`${icon} 任务 ${i + 1}: ${task.name}`);
      console.log(`   贡献度: ${contribIcon} ${task.reviewResult.contribution}`);
      console.log(`   原因: ${task.reviewResult.reason}`);
      console.log(`   置信度: ${(task.reviewResult.confidence * 100).toFixed(0)}%`);

      // 标记是否需要用户确认
      if (task.reviewResult.contribution === 'medium') {
        console.log(`   ⚠️  建议: 可向用户确认此任务是否必要`);
      }
      console.log('');
    });

    this.tasks = reviews;

    // 统计
    const aligned = reviews.filter(r => r.reviewResult.isAligned).length;
    const critical = reviews.filter(r => r.reviewResult.contribution === 'critical').length;
    console.log(`📈 Review 统计: ${aligned}/${reviews.length} 个任务与目标对齐`);
    console.log(`   关键任务: ${critical} 个`);
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤7: 确认任务频率
  // ═══════════════════════════════════════════════════════════
  async step7_confirmFrequency() {
    printStep(7, '确认任务执行频率');

    console.log('\n🤖 以下周期性任务的频率需要确认或优化:\n');

    const recurringTasks = this.tasks.filter(t => t.type === 'recurring');

    for (const task of recurringTasks) {
      console.log(`⏰ ${task.name}`);
      console.log(`   当前设定: ${task.executionCycle}`);

      const confirm = await askWithOptions(
        '   这个频率合适吗?',
        [
          { label: '合适', value: 'ok' },
          { label: '太频繁，降低频率', value: 'decrease' },
          { label: '不够频繁，增加频率', value: 'increase' },
        ]
      );

      if (confirm.value === 'decrease') {
        const newFreq = await askWithOptions(
          '   请选择新频率:',
          [
            { label: '每周3次', value: '3x_week' },
            { label: '每周2次', value: '2x_week' },
            { label: '每周1次', value: 'weekly' },
          ]
        );
        task.executionCycle = newFreq.value;
        console.log(`   ✅ 已调整为: ${task.executionCycle}`);
      } else if (confirm.value === 'increase') {
        const newFreq = await askWithOptions(
          '   请选择新频率:',
          [
            { label: '每天2次', value: '2x_daily' },
            { label: '保持每天1次', value: 'daily' },
          ]
        );
        task.executionCycle = newFreq.value;
        console.log(`   ✅ 已调整为: ${task.executionCycle}`);
      } else {
        console.log(`   ✅ 保持原频率: ${task.executionCycle}`);
      }
      console.log('');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤8: 向用户汇报计划
  // ═══════════════════════════════════════════════════════════
  async step8_presentPlan() {
    printStep(8, '向用户完整汇报计划');

    const plan = `
╔════════════════════════════════════════════════════════════╗
║                    📋 您的雅思备考计划                      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🎯 最终目标: ${this.userGoal.slice(0, 35)}...
║                                                            ║
║  📊 目标分解: 8个子目标，13个具体任务                      ║
║                                                            ║
║  🗓️  时间规划:                                             ║
║     • 第1-2周: 了解考试 + 准备资料                         ║
║     • 第3-12周: 每日学习 + 专项提升                        ║
║     • 第10周: 报名考试                                     ║
║     • 第12周: 参加考试                                     ║
║                                                            ║
║  ⏰ 定期任务:                                              ║
║     • 每日学习提醒 (9:00)                                  ║
║     • 每周学习总结 (周日)                                  ║
║     • 报名监控 (持续)                                      ║
║                                                            ║
║  🔔 通知策略:                                              ║
║     • 任务完成时推送结果                                   ║
║     • 只在您空闲时推送，不打断主动对话                     ║
║     • 紧急事项（如报名截止）立即推送                       ║
║                                                            ║
║  📈 进度追踪:                                              ║
║     • 实时显示完成进度                                     ║
║     • 达到80%时询问是否标记完成                            ║
║     • 根据反馈自动调整计划                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `;

    console.log(plan);

    const confirm = await askWithOptions(
      '请确认这个计划:',
      [
        { label: '✅ 确认，开始执行', value: 'confirm' },
        { label: '📝 需要修改部分内容', value: 'modify' },
        { label: '❌ 取消', value: 'cancel' },
      ]
    );

    if (confirm.value === 'confirm') {
      console.log('\n🚀 计划已确认！系统将开始在后台执行任务。');
      console.log('   您随时可以问我关于这个目标的进展。');
    } else if (confirm.value === 'modify') {
      const modifyItem = await ask('请描述您想修改的内容: ');
      console.log(`\n📝 收到修改意见: ${modifyItem}`);
      console.log('   [系统会根据反馈调整计划...]');
      await sleep(1000);
      console.log('   ✅ 计划已调整');
    } else {
      console.log('\n❌ 计划已取消');
      process.exit(0);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤9: 后台执行
  // ═══════════════════════════════════════════════════════════
  async step9_executeInBackground() {
    printStep(9, '后台执行（不影响用户交互）');

    console.log('\n🤖 [系统] 正在后台执行任务...\n');
    console.log('   💡 提示: 此时用户可以继续和 Agent 进行其他对话');
    console.log('   💡 后台任务执行过程不会打断用户\n');

    // 模拟任务1执行
    const task1 = this.tasks.find(t => t.id === 'task-1-1');
    console.log(`⏳ 执行任务: ${task1.name}`);
    await sleep(2000);

    // 生成执行结果
    const result1 = {
      taskId: task1.id,
      taskName: task1.name,
      executedAt: new Date().toISOString(),
      result: {
        type: 'document',
        title: '雅思考试结构说明',
        content: `
## 雅思考试结构 (IELTS)

### 1. 听力 (Listening) - 30分钟
- 4个部分，40道题
- 难度递增
- 评分: 每题1分，满分40分，转换为9分制

### 2. 阅读 (Reading) - 60分钟
- 3篇文章，40道题
- 学术类: 来自书籍、期刊、报纸
- 评分: 每题1分，满分40分

### 3. 写作 (Writing) - 60分钟
- Task 1: 图表描述 (150字)
- Task 2: 议论文 (250字)
- 评分: 任务完成、连贯性、词汇、语法

### 4. 口语 (Speaking) - 11-14分钟
- Part 1: 自我介绍和问答
- Part 2: 个人陈述
- Part 3: 深入讨论

### 总分计算
四科平均分，0.25进位到0.5，0.75进位到1
        `.trim(),
        value: 'high' // 价值判断
      }
    };
    this.executionResults.push(result1);
    console.log(`   ✅ 完成: 生成 ${result1.result.title}`);
    console.log(`   📄 结果类型: ${result1.result.type}`);

    // 模拟任务2执行
    const task2 = this.tasks.find(t => t.id === 'task-2-1');
    console.log(`\n⏳ 执行任务: ${task2.name}`);
    await sleep(2000);

    const result2 = {
      taskId: task2.id,
      taskName: task2.name,
      executedAt: new Date().toISOString(),
      result: {
        type: 'list',
        title: '推荐备考书籍清单',
        items: [
          { name: '剑桥雅思真题4-18', price: '¥280', reason: '官方真题，必做' },
          { name: '雅思词汇真经', price: '¥45', reason: '词汇基础' },
          { name: '雅思写作官方题库', price: '¥68', reason: '写作范文' },
          { name: 'Native Speaker', price: '¥55', reason: '口语地道表达' },
        ],
        value: 'high'
      }
    };
    this.executionResults.push(result2);
    console.log(`   ✅ 完成: 生成 ${result2.result.title}`);
    console.log(`   📄 结果类型: ${result2.result.type}`);

    console.log('\n📊 后台执行统计:');
    console.log(`   已完成任务: 2/${this.tasks.length}`);
    console.log('   其他任务将在计划时间陆续执行...');
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤10: 价值判断 + 空闲时推送
  // ═══════════════════════════════════════════════════════════
  async step10_deliverResults() {
    printStep(10, '价值判断与结果推送');

    console.log('\n🤖 [系统] 评估执行结果的价值...\n');

    for (const execResult of this.executionResults) {
      console.log(`📊 评估: "${execResult.result.title}"`);

      // 价值判断逻辑
      let valueScore = 0;
      let reasons = [];

      if (execResult.result.type === 'document') {
        valueScore += 0.4;
        reasons.push('包含结构化信息');
      }
      if (execResult.result.content && execResult.result.content.length > 500) {
        valueScore += 0.3;
        reasons.push('内容详实');
      }
      if (execResult.result.value === 'high') {
        valueScore += 0.3;
        reasons.push('对用户目标有直接帮助');
      }

      const hasValue = valueScore >= 0.6;
      console.log(`   价值评分: ${(valueScore * 100).toFixed(0)}%`);
      console.log(`   评估理由: ${reasons.join(', ')}`);
      console.log(`   结论: ${hasValue ? '✅ 有价值，准备推送' : '⚪ 价值较低，暂不推送'}`);

      if (hasValue) {
        console.log('\n   ⏳ 等待用户空闲...');
        await sleep(1500);
        console.log('   👤 检测到用户空闲（5分钟内无交互）');
        console.log('   📬 推送结果:\n');

        // 模拟推送通知
        const notification = `
┌─────────────────────────────────────────────────────────┐
│  📬 新通知 - 来自 "雅思备考" 目标                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📄 ${execResult.result.title}
│                                                         │
│  任务: ${execResult.taskName}
│  完成时间: ${new Date(execResult.executedAt).toLocaleString()}
│                                                         │
│  💡 为什么推送:                                         │
│  ${reasons.join('，')}
│  对您达成7分目标有直接帮助                              │
│                                                         │
│  📌 内容预览:                                           │
│  ${execResult.result.content ? execResult.result.content.slice(0, 100).replace(/\n/g, ' ') + '...' : '包含 ' + execResult.result.items?.length + ' 个推荐项'}
│                                                         │
│  [查看完整内容] [有帮助] [没帮助]                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
        `;
        console.log(notification);
      }
      console.log('');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 步骤11: 收集用户反馈
  // ═══════════════════════════════════════════════════════════
  async step11_collectFeedback() {
    printStep(11, '收集用户反馈，调整价值判断');

    console.log('\n🤖 请对刚才的推送结果给出反馈，帮助 Agent 学习:\n');

    for (const execResult of this.executionResults) {
      const feedback = await askWithOptions(
        `"${execResult.result.title}" 对您有帮助吗?`,
        [
          { label: '很有帮助', value: 'very_helpful' },
          { label: '有一点帮助', value: 'somewhat_helpful' },
          { label: '没有帮助', value: 'not_helpful' },
          { label: '不需要这个结果', value: 'not_needed' },
        ]
      );

      // 根据反馈调整价值判断逻辑
      const adjustment = {
        very_helpful: { weight: 1.2, note: '用户认可，未来类似结果提高优先级' },
        somewhat_helpful: { weight: 1.0, note: '保持当前策略' },
        not_helpful: { weight: 0.8, note: '降低此类结果的推送频率' },
        not_needed: { weight: 0.5, note: '用户不需要此类信息，大幅降权' }
      }[feedback.value];

      console.log(`   ✅ 反馈已记录: ${feedback.value}`);
      console.log(`   📝 调整策略: ${adjustment.note}`);
      console.log(`   📊 权重调整: ${adjustment.weight}x\n`);

      // 存储反馈用于模型学习
      execResult.userFeedback = {
        rating: feedback.value,
        weightAdjustment: adjustment.weight,
        timestamp: new Date().toISOString()
      };
    }

    console.log('📊 反馈汇总:');
    console.log(`   总反馈数: ${this.executionResults.length}`);
    console.log(`   正面反馈: ${this.executionResults.filter(r =>
      r.userFeedback?.rating === 'very_helpful' || r.userFeedback?.rating === 'somewhat_helpful'
    ).length}`);
    console.log('   ✅ 价值判断模型已更新');
    console.log('   💡 未来的推送将更加精准');
  }
}

// 运行演示
const demo = new GoalDrivenAgentDemo();
demo.run().catch(console.error);
