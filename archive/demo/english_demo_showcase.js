#!/usr/bin/env node
/**
 * Goal-Driven Agent - 完整交互流程展示（修订版）
 *
 * 更新内容:
 * 1. 任务增加: 预期结果、是否需要用户参与、是否需要推送
 * 2. 增加: 定期目标 review 机制
 * 3. 移除: 用户反馈收集
 *
 * 运行: node interactive-demo-showcase.js
 */

function printSection(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function printStep(step, desc) {
  console.log(`\n📌 步骤 ${step}: ${desc}`);
  console.log('─'.repeat(50));
}

function printSubStep(title) {
  console.log(`\n  ▶ ${title}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════

async function runDemo() {
  printSection('🎯 Goal-Driven Agent - 完整交互流程展示（修订版）');
  console.log('\n更新内容:');
  console.log('  1. 任务属性: 预期结果、用户参与、推送判断');
  console.log('  2. 定期目标 Review 机制');
  console.log('  3. 移除用户反馈收集\n');
  await sleep(800);

  // ═══════════════════════════════════════════════════════════
  // 阶段1: 目标理解与计划制定
  // ═══════════════════════════════════════════════════════════

  await step1_collectGoal();
  await step2_collectInfo();
  await step3_decomposeSubGoals();
  await step4_defineRelationships();
  await step5_generateTasks();
  await step6_reviewTasks();
  await step7_confirmPlan();

  // ═══════════════════════════════════════════════════════════
  // 阶段2: 执行与监控
  // ═══════════════════════════════════════════════════════════

  await step8_executeTasks();
  await step9_firstGoalReview();
  await step10_adjustPlan();
  await step11_continueExecution();
  await step12_secondGoalReview();

  // ═══════════════════════════════════════════════════════════
  // 结束
  // ═══════════════════════════════════════════════════════════
  printSection('✅ 演示完成');
  console.log('\n📊 修订版特性:');
  console.log('   ✅ 任务包含预期结果定义');
  console.log('   ✅ 明确用户参与需求和推送策略');
  console.log('   ✅ 定期目标 Review 机制（第2、4周）');
  console.log('   ✅ 根据进度动态调整任务\n');
}

// ═══════════════════════════════════════════════════════════
// 步骤1: 收集目标
// ═══════════════════════════════════════════════════════════
async function step1_collectGoal() {
  printStep(1, '用户提交目标');

  const userGoal = '我想在3个月内通过雅思考试，目标分数7.0，目前四级500分水平';
  console.log(`📝 用户输入: "${userGoal}"`);
  console.log('\n[系统] 接收到目标，开始分析...');
  await sleep(1000);
}

// ═══════════════════════════════════════════════════════════
// 步骤2: 收集背景信息
// ═══════════════════════════════════════════════════════════
async function step2_collectInfo() {
  printStep(2, 'LLM 拆解目标，收集背景信息');

  console.log('\n🤖 [LLM] 分析目标，生成问题...');
  await sleep(1200);

  const collectedInfo = {
    englishLevel: '四级 500-550分',
    dailyTime: '1-2小时',
    budget: '3000-5000元',
    learningStyle: '混合模式'
  };

  console.log('✅ 已收集信息:');
  console.log(`   • 英语水平: ${collectedInfo.englishLevel}`);
  console.log(`   • 每日时间: ${collectedInfo.dailyTime}`);
  console.log(`   • 预算: ${collectedInfo.budget}`);
  console.log(`   • 学习方式: ${collectedInfo.learningStyle}`);
}

// ═══════════════════════════════════════════════════════════
// 步骤3: 拆解子目标
// ═══════════════════════════════════════════════════════════
async function step3_decomposeSubGoals() {
  printStep(3, '拆解子目标');

  console.log('\n🤖 [LLM] 基于目标拆解为子目标...\n');
  await sleep(1200);

  const subGoals = [
    { id: 'sg-1', name: '了解雅思考试结构', priority: 'critical', deadline: '第1周', status: 'pending' },
    { id: 'sg-2', name: '准备学习资料', priority: 'high', deadline: '第2周', status: 'pending' },
    { id: 'sg-3', name: '建立每日学习习惯', priority: 'critical', deadline: '第3周起', status: 'pending' },
    { id: 'sg-4', name: '听力能力提升到7分', priority: 'high', deadline: '第10周', status: 'pending' },
    { id: 'sg-5', name: '阅读能力提升到7分', priority: 'high', deadline: '第10周', status: 'pending' },
    { id: 'sg-6', name: '写作能力提升到7分', priority: 'high', deadline: '第11周', status: 'pending' },
    { id: 'sg-7', name: '口语能力提升到7分', priority: 'high', deadline: '第11周', status: 'pending' },
    { id: 'sg-8', name: '完成报名并参加考试', priority: 'critical', deadline: '第12周', status: 'pending' }
  ];

  subGoals.forEach((sg, i) => {
    const icon = sg.priority === 'critical' ? '🔴' : '🟡';
    console.log(`   ${icon} ${sg.name}`);
    console.log(`      截止: ${sg.deadline} | 状态: ${sg.status}`);
  });
}

// ═══════════════════════════════════════════════════════════
// 步骤4: 梳理关系
// ═══════════════════════════════════════════════════════════
async function step4_defineRelationships() {
  printStep(4, '梳理目标关系');

  console.log('\n📊 最终目标实现条件: 全部8个子目标完成\n');
  console.log('🗺️  依赖关系:');
  console.log('   sg1(了解) → sg2(资料) → sg3(习惯)');
  console.log('                    ↓');
  console.log('        sg4(听力) sg5(阅读) sg6(写作) sg7(口语)');
  console.log('                    ↓');
  console.log('              sg8(完成考试)');
}

// ═══════════════════════════════════════════════════════════
// 步骤5: 生成任务（增加新属性）
// ═══════════════════════════════════════════════════════════
async function step5_generateTasks() {
  printStep(5, '生成任务（包含预期结果、推送策略）');

  console.log('\n🤖 [LLM] 为每个子目标生成任务...');
  console.log('\n任务属性说明:');
  console.log('   📤 预期结果: 执行后产出什么');
  console.log('   👤 用户参与: 是否需要用户参与');
  console.log('   🔔 推送判断: 结果是否要推送给用户\n');
  await sleep(1500);

  const tasks = [
    // ═══════════════════════════════════════════════════════
    // 子目标1: 了解考试
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '了解雅思考试结构',
      name: '搜索雅思考试官方介绍',
      type: 'exploration',
      cycle: '一次性',
      // 预期结果
      expectedResult: '一份包含考试结构、评分标准、报名流程的文档',
      resultFormat: '结构化文档（Markdown）',
      // 用户参与
      requiresUserInput: false,
      userRole: '无需参与，系统自动搜索整理',
      // 推送判断
      shouldNotify: true,
      notifyReason: '用户必须了解考试结构才能开始备考',
      notifyTiming: '执行完成后立即',
      valueThreshold: 0.8
    },
    {
      subGoal: '了解雅思考试结构',
      name: '整理各模块评分细则',
      type: 'one_time',
      cycle: '一次性',
      expectedResult: '听力/阅读/写作/口语四科的评分对照表',
      resultFormat: '对比表格',
      requiresUserInput: false,
      userRole: '系统自动整理',
      shouldNotify: true,
      notifyReason: '评分标准直接影响备考策略',
      notifyTiming: '执行完成后立即',
      valueThreshold: 0.7
    },

    // ═══════════════════════════════════════════════════════
    // 子目标2: 准备资料
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '准备学习资料',
      name: '搜索备考书籍（按预算筛选）',
      type: 'exploration',
      cycle: '一次性',
      expectedResult: '推荐书籍清单（含价格、适用人群、购买链接）',
      resultFormat: '列表+详情',
      requiresUserInput: false,
      userRole: '系统自动搜索比价',
      shouldNotify: true,
      notifyReason: '用户需要根据预算购买书籍',
      notifyTiming: '执行完成后立即',
      valueThreshold: 0.9
    },
    {
      subGoal: '准备学习资料',
      name: '询问用户偏好确认书单',
      type: 'interactive',
      cycle: '一次性',
      expectedResult: '用户确认后的最终书单',
      resultFormat: '用户选择结果',
      requiresUserInput: true,
      userRole: '从推荐列表中选择要购买的书籍',
      shouldNotify: true,
      notifyReason: '需要用户确认购买决策',
      notifyTiming: '生成推荐后立即',
      valueThreshold: 1.0
    },

    // ═══════════════════════════════════════════════════════
    // 子目标3: 建立习惯
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '建立每日学习习惯',
      name: '制定每日学习计划',
      type: 'one_time',
      cycle: '一次性',
      expectedResult: '基于用户时间安排的每日学习安排表',
      resultFormat: '时间表+任务清单',
      requiresUserInput: true,
      userRole: '确认时间安排是否合理，可提出修改',
      shouldNotify: true,
      notifyReason: '用户需要确认计划可行性',
      notifyTiming: '生成后立即',
      valueThreshold: 0.9
    },
    {
      subGoal: '建立每日学习习惯',
      name: '每日学习提醒',
      type: 'recurring',
      cycle: '每天9:00',
      expectedResult: '当日学习任务提醒通知',
      resultFormat: '推送通知',
      requiresUserInput: false,
      userRole: '接收提醒，开始学习',
      shouldNotify: true,
      notifyReason: '提醒功能本身就是推送',
      notifyTiming: '每天9:00定时',
      valueThreshold: 0.5
    },
    {
      subGoal: '建立每日学习习惯',
      name: '每周学习总结',
      type: 'recurring',
      cycle: '每周日晚',
      expectedResult: '本周完成情况统计+下周计划调整建议',
      resultFormat: '周报文档',
      requiresUserInput: false,
      userRole: '查看报告，可选择反馈',
      shouldNotify: true,
      notifyReason: '用户需要了解学习进度',
      notifyTiming: '周日晚推送',
      valueThreshold: 0.6
    },
    {
      subGoal: '建立每日学习习惯',
      name: '检测用户学习状态',
      type: 'monitoring',
      cycle: '持续监控',
      expectedResult: '学习完成率统计数据',
      resultFormat: '内部数据',
      requiresUserInput: false,
      userRole: '无需感知，后台监控',
      shouldNotify: false,  // ← 不推送
      notifyReason: 'N/A - 内部监控数据，仅用于系统调整',
      notifyTiming: '不推送',
      valueThreshold: 0.0
    },

    // ═══════════════════════════════════════════════════════
    // 子目标4-7: 能力提升
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '听力能力提升',
      name: '每日听力练习推送',
      type: 'recurring',
      cycle: '每天',
      expectedResult: '当日听力练习题目+音频',
      resultFormat: '练习卡片',
      requiresUserInput: false,
      userRole: '完成练习后可选择查看答案',
      shouldNotify: true,
      notifyReason: '提供当日练习内容',
      notifyTiming: '与每日提醒一起推送',
      valueThreshold: 0.6
    },
    {
      subGoal: '听力能力提升',
      name: '记录用户听力练习完成情况',
      type: 'monitoring',
      cycle: '持续记录',
      expectedResult: '听力练习完成日志',
      resultFormat: '内部数据库记录',
      requiresUserInput: false,
      userRole: '无需感知',
      shouldNotify: false,  // ← 不推送
      notifyReason: 'N/A - 仅用于生成周报和进度评估',
      notifyTiming: '不推送',
      valueThreshold: 0.0
    },
    {
      subGoal: '口语能力提升',
      name: '每日口语话题推送',
      type: 'recurring',
      cycle: '每天',
      expectedResult: '当季口语话题+参考答案思路',
      resultFormat: '话题卡片',
      requiresUserInput: false,
      userRole: '查看话题，自行练习',
      shouldNotify: true,
      notifyReason: '提供练习素材',
      notifyTiming: '每天推送',
      valueThreshold: 0.6
    },
    {
      subGoal: '写作能力提升',
      name: '每周写作任务',
      type: 'recurring',
      cycle: '每周二、五',
      expectedResult: '写作题目+范文+评分标准',
      resultFormat: '写作任务卡',
      requiresUserInput: true,
      userRole: '完成写作后可选择提交批改',
      shouldNotify: true,
      notifyReason: '提醒完成写作练习',
      notifyTiming: '周二、五推送',
      valueThreshold: 0.7
    },
    {
      subGoal: '阅读能力提升',
      name: '每周阅读练习推送',
      type: 'recurring',
      cycle: '每周一、三、五',
      expectedResult: '阅读文章+题目+解析',
      resultFormat: '阅读练习卡',
      requiresUserInput: false,
      userRole: '完成阅读练习',
      shouldNotify: true,
      notifyReason: '提供阅读练习',
      notifyTiming: '一三五推送',
      valueThreshold: 0.6
    },

    // ═══════════════════════════════════════════════════════
    // 子目标8: 完成考试
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '完成报名并参加考试',
      name: '监控考试报名开放',
      type: 'monitoring',
      cycle: '持续监控',
      expectedResult: '报名开放状态变更通知',
      resultFormat: '通知消息',
      requiresUserInput: false,
      userRole: '无需参与，系统自动监控',
      shouldNotify: true,
      notifyReason: '报名开放是重要时间节点，必须通知',
      notifyTiming: '报名开放时立即推送',
      valueThreshold: 1.0
    },
    {
      subGoal: '完成报名并参加考试',
      name: '提醒报名',
      type: 'event_triggered',
      cycle: '报名开放后3天内',
      expectedResult: '报名提醒通知（含截止日期）',
      resultFormat: '紧急通知',
      requiresUserInput: true,
      userRole: '确认是否已完成报名',
      shouldNotify: true,
      notifyReason: '避免错过报名截止时间',
      notifyTiming: '立即推送（紧急）',
      valueThreshold: 1.0
    },
    {
      subGoal: '完成报名并参加考试',
      name: '考前一周提醒',
      type: 'event_triggered',
      cycle: '考前7天',
      expectedResult: '考前准备清单+注意事项',
      resultFormat: '准备清单',
      requiresUserInput: false,
      userRole: '查看清单，确认准备情况',
      shouldNotify: true,
      notifyReason: '考前准备重要',
      notifyTiming: '考前7天推送',
      valueThreshold: 0.8
    },

    // ═══════════════════════════════════════════════════════
    // 定期 Review 任务（新增）
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '目标整体管理',
      name: '每周目标 Review',
      type: 'recurring',
      cycle: '每周一',
      expectedResult: '目标进度报告+任务调整建议',
      resultFormat: 'Review 报告',
      requiresUserInput: true,
      userRole: '查看进度，确认或调整后续计划',
      shouldNotify: true,
      notifyReason: '用户需要了解整体进度，可能需要调整计划',
      notifyTiming: '每周一推送',
      valueThreshold: 0.8
    }
  ];

  console.log(`✅ 共生成 ${tasks.length} 个任务\n`);

  // 按子目标分组展示
  const subGoalNames = [...new Set(tasks.map(t => t.subGoal))];
  subGoalNames.forEach(sgName => {
    const sgTasks = tasks.filter(t => t.subGoal === sgName);
    console.log(`📦 ${sgName}`);
    sgTasks.forEach(task => {
      const typeIcon = { exploration: '🔍', one_time: '📝', recurring: '⏰', monitoring: '👀', event_triggered: '⚡' }[task.type];
      const notifyIcon = task.shouldNotify ? '🔔' : '🔕';
      const userIcon = task.requiresUserInput ? '👤' : '🤖';
      console.log(`   ${typeIcon} ${task.name}`);
      console.log(`      ${userIcon} 用户参与: ${task.requiresUserInput ? '是 - ' + task.userRole : '否 - ' + task.userRole}`);
      console.log(`      📤 预期结果: ${task.expectedResult.slice(0, 40)}...`);
      console.log(`      ${notifyIcon} 推送: ${task.shouldNotify ? '是 - ' + task.notifyReason.slice(0, 30) + '...' : '否 - 内部任务'}`);
      console.log('');
    });
  });

  // 推送统计
  const notifyTasks = tasks.filter(t => t.shouldNotify);
  const noNotifyTasks = tasks.filter(t => !t.shouldNotify);
  console.log('📊 推送策略统计:');
  console.log(`   需要推送: ${notifyTasks.length} 个任务`);
  console.log(`   无需推送: ${noNotifyTasks.length} 个任务（内部监控/记录）`);
  console.log(`   需用户参与: ${tasks.filter(t => t.requiresUserInput).length} 个任务`);
}

// ═══════════════════════════════════════════════════════════
// 步骤6: Review 任务
// ═══════════════════════════════════════════════════════════
async function step6_reviewTasks() {
  printStep(6, 'Review 任务 - 判断是否围绕终极目标');

  console.log('\n🤖 [系统] 评估每个任务的相关性...\n');
  await sleep(1200);

  const reviews = [
    { task: '搜索雅思考试官方介绍', contribution: 'critical', reason: '所有后续准备的基础', aligned: true },
    { task: '整理各模块评分细则', contribution: 'high', reason: '明确得分目标', aligned: true },
    { task: '搜索备考书籍', contribution: 'high', reason: '学习资源支撑', aligned: true },
    { task: '询问用户偏好确认书单', contribution: 'high', reason: '决策需要用户参与', aligned: true },
    { task: '制定每日学习计划', contribution: 'critical', reason: '学习框架核心', aligned: true },
    { task: '每日学习提醒', contribution: 'high', reason: '维持学习节奏', aligned: true },
    { task: '每周学习总结', contribution: 'high', reason: '进度追踪', aligned: true },
    { task: '检测用户学习状态', contribution: 'medium', reason: '内部监控，非直接贡献', aligned: true },
    { task: '每日听力练习推送', contribution: 'high', reason: '直接提升听力能力', aligned: true },
    { task: '每周目标 Review', contribution: 'critical', reason: '确保方向正确', aligned: true }
  ];

  reviews.forEach(r => {
    const icon = r.contribution === 'critical' ? '🔴' : r.contribution === 'high' ? '🟢' : '🟡';
    console.log(`   ✅ ${r.task}`);
    console.log(`      ${icon} 贡献度: ${r.contribution} | ${r.reason}`);
  });

  console.log('\n✅ Review 结论: 所有任务均与达成7分目标对齐');
}

// ═══════════════════════════════════════════════════════════
// 步骤7: 确认计划
// ═══════════════════════════════════════════════════════════
async function step7_confirmPlan() {
  printStep(7, '向用户汇报计划，等待确认');

  const plan = `
╔════════════════════════════════════════════════════════════╗
║                   📋 您的雅思备考计划                      ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🎯 目标: 3个月内雅思7分                                  ║
║                                                            ║
║  📊 计划包含:                                              ║
║     • 8个子目标                                            ║
║     • 18个具体任务（13个推送 + 5个内部）                  ║
║     • 9个需要您参与的任务                                 ║
║     • 每周定期 Review                                     ║
║                                                            ║
║  🔔 推送策略:                                              ║
║     • 重要信息: 立即推送（考试介绍、书单等）              ║
║     • 提醒类: 定时推送（每日提醒、每周总结）              ║
║     • 监控类: 内部处理（学习状态记录）                    ║
║     • 紧急类: 立即推送（报名提醒）                        ║
║                                                            ║
║  🔄 定期 Review: 每周一进行目标进度评估                   ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `;
  console.log(plan);

  console.log('👤 用户确认: ✅ 确认计划');
  console.log('🚀 系统开始后台执行任务');
}

// ═══════════════════════════════════════════════════════════
// 步骤8: 执行任务
// ═══════════════════════════════════════════════════════════
async function step8_executeTasks() {
  printStep(8, '后台执行任务（第1-2周）');

  console.log('\n💡 用户继续与 Agent 进行其他对话，后台任务静默执行\n');

  const executions = [
    {
      task: '搜索雅思考试官方介绍',
      result: '考试结构文档',
      shouldNotify: true,
      userIdle: true,
      pushed: true
    },
    {
      task: '搜索备考书籍',
      result: '推荐书单（含价格）',
      shouldNotify: true,
      userIdle: true,
      pushed: true
    },
    {
      task: '检测用户学习状态',
      result: '学习完成率: 85%',
      shouldNotify: false,  // 不推送
      pushed: false
    },
    {
      task: '每日学习提醒',
      result: '今日任务: 听力Section 1练习',
      shouldNotify: true,
      pushed: true
    }
  ];

  for (const exec of executions) {
    console.log(`⏳ ${exec.task}`);
    await sleep(600);
    console.log(`   ✅ 完成: ${exec.result}`);
    if (exec.shouldNotify) {
      if (exec.userIdle) {
        console.log(`   📬 用户空闲，已推送`);
      } else {
        console.log(`   ⏳ 等待用户空闲...`);
      }
    } else {
      console.log(`   🔕 内部任务，不推送（仅记录）`);
    }
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════
// 步骤9: 第一次目标 Review（第2周）
// ═══════════════════════════════════════════════════════════
async function step9_firstGoalReview() {
  printStep(9, '【新增】第2周目标 Review');

  printSubStep('Review 触发：每周一自动执行');
  await sleep(800);

  printSubStep('评估最终目标进度');
  console.log('\n   📊 最终目标: 3个月内雅思7分');
  console.log('   ├─ 已过时间: 2周 / 12周 (17%)');
  console.log('   ├─ 当前进度: 15%');
  console.log('   ├─ 预期进度: 20%');
  console.log('   └─ 状态: ⚠️  略微落后');

  printSubStep('检查子目标完成情况');
  const subGoalStatus = [
    { name: '了解雅思考试结构', status: '✅ 已完成', progress: '100%' },
    { name: '准备学习资料', status: '✅ 已完成', progress: '100%' },
    { name: '建立每日学习习惯', status: '🔄 进行中', progress: '60%' },
    { name: '听力能力提升', status: '⏳ 待开始', progress: '0%' },
    { name: '阅读能力提升', status: '⏳ 待开始', progress: '0%' },
    { name: '写作能力', status: '⏳ 待开始', progress: '0%' },
    { name: '口语能力', status: '⏳ 待开始', progress: '0%' },
    { name: '完成报名', status: '⏳ 待开始', progress: '0%' }
  ];

  subGoalStatus.forEach(sg => {
    console.log(`   ${sg.status} ${sg.name} (${sg.progress})`);
  });

  printSubStep('评估当前任务执行情况');
  const taskReviews = [
    { task: '每日学习提醒', status: '正常', completion: '85%', issue: '无' },
    { task: '每周学习总结', status: '正常', completion: '100%', issue: '无' },
    { task: '检测学习状态', status: '⚠️ 需关注', completion: '70%', issue: '有2天未完成学习' }
  ];

  taskReviews.forEach(tr => {
    console.log(`   ${tr.task}: ${tr.status} (完成率${tr.completion})`);
    if (tr.issue !== '无') {
      console.log(`      ⚠️  问题: ${tr.issue}`);
    }
  });

  printSubStep('生成 Review 报告');
  console.log('\n   📄 Review 报告摘要:');
  console.log('   • 已完成子目标: 2/8');
  console.log('   • 整体进度: 略微落后预期 (15% vs 20%)');
  console.log('   • 发现问题: 学习习惯建立期有2天未完成');
  console.log('   • 建议: 加强学习提醒，考虑调整后续计划');

  printSubStep('推送给用户');
  console.log('\n   📬 推送给用户:');
  console.log('   "第2周学习报告: 已完成考试了解和资料准备，');
  console.log('    但本周有2天未完成学习任务。建议调整学习时间，');
  console.log('    确保每日完成计划。"');
}

// ═══════════════════════════════════════════════════════════
// 步骤10: 根据 Review 调整计划
// ═══════════════════════════════════════════════════════════
async function step10_adjustPlan() {
  printStep(10, '【新增】根据 Review 调整任务');

  printSubStep('识别需要调整的任务');
  console.log('\n   ⚠️  问题: 用户有2天未完成学习任务');
  console.log('   🔍 原因分析: 可能是每日提醒时间不合适\n');

  printSubStep('生成调整方案');
  const adjustments = [
    {
      task: '每日学习提醒',
      change: '调整提醒时间',
      from: '每天9:00',
      to: '每天8:00和20:00各一次',
      reason: '用户可能早起或晚上有时间'
    },
    {
      task: '增加学习任务检测频率',
      change: '新增任务',
      newTask: '检测当日学习完成情况',
      cycle: '每天22:00',
      action: '如未完成，发送二次提醒',
      reason: '及时补救，避免连续未完成'
    },
    {
      task: '缩短首次Review周期',
      change: '调整Review频率',
      from: '每周一次',
      to: '前4周每3天一次，之后每周一次',
      reason: '建立习惯期需要更密集监控'
    }
  ];

  adjustments.forEach((adj, i) => {
    console.log(`   ${i + 1}. ${adj.task}`);
    console.log(`      调整: ${adj.change}`);
    if (adj.from) console.log(`      从: ${adj.from} → 到: ${adj.to}`);
    if (adj.newTask) {
      console.log(`      新增: ${adj.newTask} (${adj.cycle})`);
      console.log(`      触发: ${adj.action}`);
    }
    console.log(`      原因: ${adj.reason}`);
    console.log('');
  });

  printSubStep('用户确认调整');
  console.log('\n   👤 用户确认: ✅ 同意调整计划');
  console.log('   ✅ 已更新任务列表');
  console.log('   ⏰ 新设置生效: 提醒时间改为8:00和20:00');
  console.log('   🔔 新增任务: 每日22:00检测完成情况');
}

// ═══════════════════════════════════════════════════════════
// 步骤11: 继续执行
// ═══════════════════════════════════════════════════════════
async function step11_continueExecution() {
  printStep(11, '继续执行（第3-4周）');

  console.log('\n   📅 第3-4周执行摘要:');
  console.log('   • 每日提醒按新时间（8:00和20:00）执行');
  console.log('   • 新增22:00检测任务，触发3次二次提醒');
  console.log('   • 用户学习完成率从70%提升至90%');
  console.log('   • 所有推送按策略执行');
  console.log('   • 内部监控任务静默记录数据');
}

// ═══════════════════════════════════════════════════════════
// 步骤12: 第二次目标 Review（第4周）
// ═══════════════════════════════════════════════════════════
async function step12_secondGoalReview() {
  printStep(12, '【新增】第4周目标 Review');

  printSubStep('Review 触发：每周一自动执行');
  await sleep(800);

  printSubStep('评估最终目标进度');
  console.log('\n   📊 最终目标: 3个月内雅思7分');
  console.log('   ├─ 已过时间: 4周 / 12周 (33%)');
  console.log('   ├─ 当前进度: 35%');
  console.log('   ├─ 预期进度: 35%');
  console.log('   └─ 状态: ✅ 符合预期');

  printSubStep('检查子目标完成情况');
  const subGoalStatus = [
    { name: '了解雅思考试结构', status: '✅ 已完成', progress: '100%' },
    { name: '准备学习资料', status: '✅ 已完成', progress: '100%' },
    { name: '建立每日学习习惯', status: '✅ 已完成', progress: '100%' },
    { name: '听力能力提升', status: '🔄 进行中', progress: '30%' },
    { name: '阅读能力提升', status: '🔄 进行中', progress: '25%' },
    { name: '写作能力', status: '🔄 进行中', progress: '20%' },
    { name: '口语能力', status: '🔄 进行中', progress: '20%' },
    { name: '完成报名', status: '⏳ 待开始', progress: '0%' }
  ];

  subGoalStatus.forEach(sg => {
    console.log(`   ${sg.status} ${sg.name} (${sg.progress})`);
  });

  printSubStep('评估调整后任务效果');
  console.log('\n   📈 调整效果:');
  console.log('   • 每日学习完成率: 70% → 90% (+20%)');
  console.log('   • 二次提醒触发: 3次，全部完成补学');
  console.log('   • 用户反馈: "提醒时间调整很合理"');

  printSubStep('评估当前任务');
  console.log('\n   📝 任务重新评估:');
  console.log('   • 每日22:00检测任务 → 效果良好，继续保留');
  console.log('   • 每周Review频率 → 可恢复为每周一次（习惯已建立）');
  console.log('   • 每日两次提醒 → 保持，用户适应良好');

  printSubStep('生成 Review 报告');
  console.log('\n   📄 Review 报告摘要:');
  console.log('   • 已完成子目标: 3/8');
  console.log('   • 整体进度: 符合预期 (35%)');
  console.log('   • 习惯建立: ✅ 成功，学习完成率90%');
  console.log('   • 建议: 继续保持当前节奏，关注听力/阅读重点突破');
  console.log('   • 下次Review调整: 恢复每周一次（习惯已稳定）');

  printSubStep('推送给用户');
  console.log('\n   📬 推送给用户:');
  console.log('   "第4周学习报告: 🎉 学习习惯已成功建立！');
  console.log('    本周学习完成率90%，进度符合预期。');
  console.log('    下周开始重点关注听力能力提升，加油！"');

  printSubStep('调整后续 Review 策略');
  console.log('\n   🔄 策略调整:');
  console.log('   • 前4周密集Review期结束');
  console.log('   • 后续Review频率: 每周一（常规模式）');
  console.log('   • 每日22:00检测任务: 继续保留');
  console.log('   • 新增: 每月一次深度Review（评估是否需要调整子目标）');
}

// 运行演示
runDemo().catch(console.error);
