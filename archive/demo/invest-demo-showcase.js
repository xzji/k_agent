#!/usr/bin/env node
/**
 * Goal-Driven Agent - 投资者版本交互演示
 *
 * 目标: "我是一个投资者，我有100万，年收益率希望达到10%"
 *
 * 运行: node invest-demo-showcase.js
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
  printSection('💰 Goal-Driven Agent - 投资目标管理演示');
  console.log('\n目标: "我是一个投资者，我有100万，年收益率希望达到10%"');
  console.log('时间周期: 1年');
  console.log('预期收益: 10万元\n');
  await sleep(800);

  await step1_collectGoal();
  await step2_collectInfo();
  await step3_decomposeSubGoals();
  await step4_defineRelationships();
  await step5_generateTasks();
  await step6_reviewTasks();
  await step7_confirmPlan();
  await step8_executeTasks();
  await step9_firstGoalReview();
  await step10_adjustPlan();
  await step11_continueExecution();
  await step12_secondGoalReview();

  printSection('✅ 演示完成');
  console.log('\n📊 投资目标管理特性:');
  console.log('   ✅ 风险评估与资产配置');
  console.log('   ✅ 实时市场监控与调仓建议');
  console.log('   ✅ 定期投资组合Review');
  console.log('   ✅ 关键市场事件推送');
  console.log('   ✅ 收益追踪与再平衡\n');
}

// ═══════════════════════════════════════════════════════════
// 步骤1: 收集目标
// ═══════════════════════════════════════════════════════════
async function step1_collectGoal() {
  printStep(1, '用户提交投资目标');

  const userGoal = '我是一个投资者，我有100万，年收益率希望达到10%';
  console.log(`💰 用户输入: "${userGoal}"`);
  console.log('\n[系统] 分析投资目标...');
  console.log('   • 本金: 100万元');
  console.log('   • 目标收益: 10万元/年');
  console.log('   • 目标收益率: 10%');
  await sleep(1000);
}

// ═══════════════════════════════════════════════════════════
// 步骤2: 收集背景信息
// ═══════════════════════════════════════════════════════════
async function step2_collectInfo() {
  printStep(2, '收集投资者背景信息');

  console.log('\n🤖 [LLM] 分析投资目标，生成风险评估问题...');
  await sleep(1200);

  const collectedInfo = {
    riskTolerance: '稳健型',
    investmentExperience: '3年',
    age: '35岁',
    investmentPeriod: '1-3年',
    liquidityNeeds: '中等（可能需要应急资金）',
    otherAssets: '房产自住，无其他大额投资',
    monthlyIncome: '2-3万元',
    marketKnowledge: '了解基础，关注市场动态'
  };

  console.log('\n❓ Agent 向用户提问:');
  console.log('   1. 您的风险偏好是？ → 稳健型（可承受5-15%波动）');
  console.log('   2. 投资经验多久？ → 3年');
  console.log('   3. 您的年龄？ → 35岁');
  console.log('   4. 投资期限？ → 1-3年');
  console.log('   5. 流动性需求？ → 中等（保留20%应急资金）');
  console.log('   6. 是否有其他资产？ → 房产自住');
  console.log('   7. 月收入水平？ → 2-3万元');

  console.log('\n✅ 投资者画像:');
  console.log(`   • 风险偏好: ${collectedInfo.riskTolerance}`);
  console.log(`   • 投资经验: ${collectedInfo.investmentExperience}`);
  console.log(`   • 投资期限: ${collectedInfo.investmentPeriod}`);
  console.log(`   • 流动性需求: ${collectedInfo.liquidityNeeds}`);
}

// ═══════════════════════════════════════════════════════════
// 步骤3: 拆解子目标
// ═══════════════════════════════════════════════════════════
async function step3_decomposeSubGoals() {
  printStep(3, '拆解投资子目标');

  console.log('\n🤖 [LLM] 基于投资者画像拆解目标...\n');
  console.log('   分析: 10%年化收益 + 稳健型风险偏好');
  console.log('   → 需要平衡收益与风险');
  console.log('   → 建议股债混合配置\n');
  await sleep(1200);

  const subGoals = [
    {
      id: 'sg-1',
      name: '完成风险评估与资产配置方案',
      priority: 'critical',
      deadline: '第1周',
      target: '确定投资组合比例',
      status: 'pending'
    },
    {
      id: 'sg-2',
      name: '建立投资账户与资金配置',
      priority: 'critical',
      deadline: '第2周',
      target: '100万资金按计划配置',
      status: 'pending'
    },
    {
      id: 'sg-3',
      name: '权益类投资组合管理',
      priority: 'high',
      deadline: '持续',
      target: '股票/基金组合收益率8%',
      status: 'pending'
    },
    {
      id: 'sg-4',
      name: '固收类投资组合管理',
      priority: 'high',
      deadline: '持续',
      target: '债券/理财组合收益率4%',
      status: 'pending'
    },
    {
      id: 'sg-5',
      name: '现金管理与流动性保障',
      priority: 'medium',
      deadline: '持续',
      target: '保持20万流动性，收益率2%',
      status: 'pending'
    },
    {
      id: 'sg-6',
      name: '定期再平衡与调仓',
      priority: 'high',
      deadline: '每季度',
      target: '维持目标配置比例',
      status: 'pending'
    },
    {
      id: 'sg-7',
      name: '市场机会捕捉与风险管理',
      priority: 'high',
      deadline: '持续',
      target: '及时调整应对市场变化',
      status: 'pending'
    },
    {
      id: 'sg-8',
      name: '年度收益目标达成',
      priority: 'critical',
      deadline: '第12个月',
      target: '实现10万元收益',
      status: 'pending'
    }
  ];

  subGoals.forEach((sg, i) => {
    const icon = sg.priority === 'critical' ? '🔴' : sg.priority === 'high' ? '🟡' : '🟢';
    console.log(`   ${icon} 子目标 ${i + 1}: ${sg.name}`);
    console.log(`      目标: ${sg.target} | 截止: ${sg.deadline}`);
  });
}

// ═══════════════════════════════════════════════════════════
// 步骤4: 梳理关系
// ═══════════════════════════════════════════════════════════
async function step4_defineRelationships() {
  printStep(4, '梳理投资目标关系');

  console.log('\n📊 最终目标: 年化收益10%（10万元）\n');
  console.log('🗺️  资产配置策略:');
  console.log('   ┌─────────────────────────────────────┐');
  console.log('   │         100万资金配置方案           │');
  console.log('   ├─────────────────────────────────────┤');
  console.log('   │  权益类 50万 (50%) → 目标收益 8%   │');
  console.log('   │    • 股票型基金 30万                │');
  console.log('   │    • 指数基金 15万                  │');
  console.log('   │    • 个股 5万                       │');
  console.log('   │                                     │');
  console.log('   │  固收类 30万 (30%) → 目标收益 4%   │');
  console.log('   │    • 债券基金 20万                  │');
  console.log('   │    • 银行理财 10万                  │');
  console.log('   │                                     │');
  console.log('   │  现金类 20万 (20%) → 目标收益 2%   │');
  console.log('   │    • 货币基金 15万（应急）          │');
  console.log('   │    • 活期理财 5万                   │');
  console.log('   └─────────────────────────────────────┘');

  console.log('\n📈 预期收益测算:');
  console.log('   权益类 50万 × 8% = 4万元');
  console.log('   固收类 30万 × 4% = 1.2万元');
  console.log('   现金类 20万 × 2% = 0.4万元');
  console.log('   ──────────────────────────────');
  console.log('   合计: 5.6万元（5.6%）❌ 未达目标');

  console.log('\n⚠️  差距分析: 需要提升权益类收益至12%或调整配置');
}

// ═══════════════════════════════════════════════════════════
// 步骤5: 生成任务
// ═══════════════════════════════════════════════════════════
async function step5_generateTasks() {
  printStep(5, '生成投资任务（含预期结果、推送策略）');

  console.log('\n🤖 [LLM] 生成投资管理任务...');
  console.log('\n任务属性:');
  console.log('   📤 预期结果: 投资分析/建议/报告');
  console.log('   👤 用户参与: 决策确认类需用户参与');
  console.log('   🔔 推送判断: 重要调仓建议推送，日常监控不推送\n');
  await sleep(1500);

  const tasks = [
    // ═══════════════════════════════════════════════════════
    // 子目标1: 风险评估与配置
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '完成风险评估与资产配置方案',
      name: '分析投资者风险偏好',
      type: 'one_time',
      cycle: '第1周',
      expectedResult: '投资者风险画像报告（含承受波动范围）',
      resultFormat: '评估报告',
      requiresUserInput: false,
      userRole: '系统基于收集信息自动评估',
      shouldNotify: true,
      notifyReason: '用户需了解自己的风险偏好等级',
      notifyTiming: '评估完成后',
      valueThreshold: 0.9
    },
    {
      subGoal: '完成风险评估与资产配置方案',
      name: '生成资产配置方案',
      type: 'one_time',
      cycle: '第1周',
      expectedResult: '基于100万的详细资产配置方案（含产品推荐）',
      resultFormat: '配置方案文档',
      requiresUserInput: true,
      userRole: '确认或调整配置比例，选择具体产品',
      shouldNotify: true,
      notifyReason: '投资方案需用户确认后方可执行',
      notifyTiming: '方案生成后立即',
      valueThreshold: 1.0
    },
    {
      subGoal: '完成风险评估与资产配置方案',
      name: '压力测试与情景分析',
      type: 'one_time',
      cycle: '第1周',
      expectedResult: '不同市场情景下的收益/回撤预估',
      resultFormat: '情景分析表',
      requiresUserInput: false,
      userRole: '查看了解可能的风险',
      shouldNotify: true,
      notifyReason: '用户需了解最坏情况（如回撤20%）',
      notifyTiming: '与配置方案一起推送',
      valueThreshold: 0.8
    },

    // ═══════════════════════════════════════════════════════
    // 子目标2: 建立账户与配置
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '建立投资账户与资金配置',
      name: '推荐开户平台与产品',
      type: 'exploration',
      cycle: '第2周',
      expectedResult: '对比3-5家平台费率、产品丰富度、便利性',
      resultFormat: '平台对比表',
      requiresUserInput: true,
      userRole: '选择开户平台',
      shouldNotify: true,
      notifyReason: '用户需决策在哪里开户投资',
      notifyTiming: '完成对比后',
      valueThreshold: 0.8
    },
    {
      subGoal: '建立投资账户与资金配置',
      name: '监控资金配置进度',
      type: 'monitoring',
      cycle: '第2周',
      expectedResult: '100万资金配置完成进度追踪',
      resultFormat: '内部进度记录',
      requiresUserInput: false,
      userRole: '无需感知，后台监控',
      shouldNotify: false,
      notifyReason: 'N/A - 仅用于确保配置按计划执行',
      notifyTiming: '不推送',
      valueThreshold: 0.0
    },

    // ═══════════════════════════════════════════════════════
    // 子目标3-5: 投资组合管理
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '权益类投资组合管理',
      name: '每日市场监控与估值分析',
      type: 'monitoring',
      cycle: '每日',
      expectedResult: '市场估值数据、情绪指标、行业轮动信号',
      resultFormat: '内部数据',
      requiresUserInput: false,
      userRole: '无需感知，后台持续监控',
      shouldNotify: false,
      notifyReason: 'N/A - 内部监控数据，用于发现机会/风险',
      notifyTiming: '仅异常时推送',
      valueThreshold: 0.0
    },
    {
      subGoal: '权益类投资组合管理',
      name: '每周权益类组合Review',
      type: 'recurring',
      cycle: '每周五',
      expectedResult: '权益类持仓表现分析、调仓建议（如有）',
      resultFormat: '周报',
      requiresUserInput: false,
      userRole: '查看报告，调仓建议需确认',
      shouldNotify: true,
      notifyReason: '用户需了解股票/基金投资表现',
      notifyTiming: '每周五收盘后',
      valueThreshold: 0.6
    },
    {
      subGoal: '固收类投资组合管理',
      name: '债券市场环境监控',
      type: 'monitoring',
      cycle: '持续',
      expectedResult: '利率走势、信用风险变化、债基表现',
      resultFormat: '内部监控',
      requiresUserInput: false,
      userRole: '无需感知',
      shouldNotify: false,
      notifyReason: 'N/A - 固收相对稳定，重大变化才推送',
      notifyTiming: '仅重大变化时',
      valueThreshold: 0.0
    },
    {
      subGoal: '现金管理与流动性保障',
      name: '现金类收益优化建议',
      type: 'recurring',
      cycle: '每月',
      expectedResult: '货币基金/理财收益率对比，调仓建议',
      resultFormat: '优化建议',
      requiresUserInput: false,
      userRole: '可选择是否调整',
      shouldNotify: false,
      notifyReason: '现金类收益差异较小，非关键',
      notifyTiming: '仅发现显著提升机会时',
      valueThreshold: 0.3
    },

    // ═══════════════════════════════════════════════════════
    // 子目标6: 再平衡
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '定期再平衡与调仓',
      name: '季度资产配置再平衡检查',
      type: 'recurring',
      cycle: '每季度末',
      expectedResult: '当前配置 vs 目标配置偏差分析，再平衡建议',
      resultFormat: '再平衡报告',
      requiresUserInput: true,
      userRole: '确认是否执行再平衡（买卖调整）',
      shouldNotify: true,
      notifyReason: '再平衡是维持风险收益特征的关键',
      notifyTiming: '每季度末',
      valueThreshold: 0.8
    },
    {
      subGoal: '定期再平衡与调仓',
      name: '重大偏离提醒',
      type: 'event_triggered',
      cycle: '偏离度>5%时',
      expectedResult: '资产配置偏离预警+调仓建议',
      resultFormat: '预警通知',
      requiresUserInput: true,
      userRole: '决策是否提前再平衡',
      shouldNotify: true,
      notifyReason: '重大偏离需及时处理以控制风险',
      notifyTiming: '偏离超过阈值时立即',
      valueThreshold: 0.9
    },

    // ═══════════════════════════════════════════════════════
    // 子目标7: 机会与风险管理
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '市场机会捕捉与风险管理',
      name: '市场异常机会发现',
      type: 'monitoring',
      cycle: '持续',
      expectedResult: '低估标的、恐慌性下跌抄底机会、行业轮动信号',
      resultFormat: '机会简报',
      requiresUserInput: false,
      userRole: '系统监控，发现机会推送',
      shouldNotify: true,
      notifyReason: '显著投资机会需及时告知用户',
      notifyTiming: '发现机会时（限高价值机会）',
      valueThreshold: 0.85
    },
    {
      subGoal: '市场机会捕捉与风险管理',
      name: '风险预警监控',
      type: 'monitoring',
      cycle: '持续',
      expectedResult: '组合回撤、单一标的暴雷、系统性风险信号',
      resultFormat: '风险警报',
      requiresUserInput: true,
      userRole: '收到预警后决策是否减仓/止损',
      shouldNotify: true,
      notifyReason: '风险控制是投资首要任务',
      notifyTiming: '风险出现时立即（紧急）',
      valueThreshold: 1.0
    },
    {
      subGoal: '市场机会捕捉与风险管理',
      name: '宏观经济指标跟踪',
      type: 'monitoring',
      cycle: '每月',
      expectedResult: 'PMI、CPI、利率、汇率等关键指标变化',
      resultFormat: '宏观简报',
      requiresUserInput: false,
      userRole: '了解市场环境',
      shouldNotify: false,
      notifyReason: 'N/A - 宏观变化较缓，重大变化才推送',
      notifyTiming: '仅重大政策/数据发布时',
      valueThreshold: 0.2
    },

    // ═══════════════════════════════════════════════════════
    // 子目标8: 年度目标达成
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '年度收益目标达成',
      name: '月度收益核算',
      type: 'recurring',
      cycle: '每月初',
      expectedResult: '上月收益计算、年度进度、差距分析',
      resultFormat: '月度账单',
      requiresUserInput: false,
      userRole: '查看收益情况',
      shouldNotify: true,
      notifyReason: '用户需定期了解收益进展',
      notifyTiming: '每月初',
      valueThreshold: 0.7
    },
    {
      subGoal: '年度收益目标达成',
      name: '年度投资组合深度Review',
      type: 'recurring',
      cycle: '每半年',
      expectedResult: '半年度投资表现归因、策略调整建议',
      resultFormat: '深度报告',
      requiresUserInput: true,
      userRole: '审阅表现，决策是否调整策略',
      shouldNotify: true,
      notifyReason: '中期Review确保年度目标可达',
      notifyTiming: '6月底、12月底',
      valueThreshold: 0.9
    },

    // ═══════════════════════════════════════════════════════
    // Review 任务
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '投资目标整体管理',
      name: '每周投资目标Review',
      type: 'recurring',
      cycle: '每周一',
      expectedResult: '整体进度、子目标状态、需关注事项',
      resultFormat: 'Review报告',
      requiresUserInput: true,
      userRole: '查看整体投资进展，确认后续策略',
      shouldNotify: true,
      notifyReason: '投资者需掌握整体投资健康状况',
      notifyTiming: '每周一开盘前',
      valueThreshold: 0.8
    },
    {
      subGoal: '投资目标整体管理',
      name: '年度目标差距分析与策略调整',
      type: 'recurring',
      cycle: '每季度',
      expectedResult: '年度10%收益目标达成概率、调整建议',
      resultFormat: '策略调整建议',
      requiresUserInput: true,
      userRole: '如进度落后，决策是否提高风险敞口',
      shouldNotify: true,
      notifyReason: '确保年度目标可实现，及时调整',
      notifyTiming: '季度末Review时',
      valueThreshold: 0.9
    }
  ];

  console.log(`✅ 共生成 ${tasks.length} 个投资任务\n`);

  // 按子目标分组
  const subGoalNames = [...new Set(tasks.map(t => t.subGoal))];
  subGoalNames.forEach(sgName => {
    const sgTasks = tasks.filter(t => t.subGoal === sgName);
    console.log(`📦 ${sgName}`);
    sgTasks.forEach(task => {
      const typeIcon = { exploration: '🔍', one_time: '📝', recurring: '⏰', monitoring: '👀', event_triggered: '⚡' }[task.type];
      const notifyIcon = task.shouldNotify ? '🔔' : '🔕';
      const userIcon = task.requiresUserInput ? '👤' : '🤖';
      console.log(`   ${typeIcon} ${task.name}`);
      console.log(`      ${userIcon} 用户参与: ${task.requiresUserInput ? '是' : '否'}`);
      console.log(`      📤 预期: ${task.expectedResult.slice(0, 35)}...`);
      console.log(`      ${notifyIcon} 推送: ${task.shouldNotify ? `是 - ${task.notifyReason.slice(0, 25)}...` : '否 - 内部任务'}`);
    });
    console.log('');
  });

  // 统计
  const notifyTasks = tasks.filter(t => t.shouldNotify);
  const noNotifyTasks = tasks.filter(t => !t.shouldNotify);
  console.log('📊 推送策略统计:');
  console.log(`   🔔 需要推送: ${notifyTasks.length} 个（市场机会、风险预警、定期报告）`);
  console.log(`   🔕 无需推送: ${noNotifyTasks.length} 个（日常监控、数据记录）`);
  console.log(`   👤 需用户决策: ${tasks.filter(t => t.requiresUserInput).length} 个`);
}

// ═══════════════════════════════════════════════════════════
// 步骤6: Review 任务
// ═══════════════════════════════════════════════════════════
async function step6_reviewTasks() {
  printStep(6, 'Review 投资任务');

  console.log('\n🤖 [系统] 评估任务与10%收益目标的相关性...\n');
  await sleep(1200);

  const reviews = [
    { task: '生成资产配置方案', contribution: 'critical', reason: '决定能否达成10%收益的基础' },
    { task: '压力测试与情景分析', contribution: 'high', reason: '让用户了解风险，避免恐慌抛售' },
    { task: '每日市场监控', contribution: 'medium', reason: '支持决策，但非直接收益来源' },
    { task: '每周权益类Review', contribution: 'high', reason: '及时调整，优化收益' },
    { task: '季度再平衡', contribution: 'critical', reason: '维持风险收益特征，防止漂移' },
    { task: '风险预警监控', contribution: 'critical', reason: '避免大幅回撤，保住收益' },
    { task: '市场机会发现', contribution: 'high', reason: '超额收益来源' },
    { task: '每周目标Review', contribution: 'high', reason: '确保方向正确，及时调整' }
  ];

  reviews.forEach(r => {
    const icon = r.contribution === 'critical' ? '🔴' : r.contribution === 'high' ? '🟢' : '🟡';
    console.log(`   ✅ ${r.task}`);
    console.log(`      ${icon} 贡献度: ${r.contribution} | ${r.reason}`);
  });

  console.log('\n✅ Review 结论: 所有任务对齐10%年化收益目标');
}

// ═══════════════════════════════════════════════════════════
// 步骤7: 确认计划
// ═══════════════════════════════════════════════════════════
async function step7_confirmPlan() {
  printStep(7, '向投资者汇报计划');

  const plan = `
╔════════════════════════════════════════════════════════════╗
║              💰 您的投资目标管理方案                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🎯 投资目标: 100万本金，年化收益10%（10万元）            ║
║                                                            ║
║  📊 资产配置:                                              ║
║     • 权益类 50% (50万) → 目标8-12%收益                 ║
║     • 固收类 30% (30万) → 目标4%收益                    ║
║     • 现金类 20% (20万) → 目标2%收益 + 流动性           ║
║                                                            ║
║  ⏰ 管理频率:                                              ║
║     • 每日: 市场监控（后台，不打扰）                      ║
║     • 每周: 组合Review + 目标进度检查（周一推送）         ║
║     • 每月: 收益核算（月初推送账单）                      ║
║     • 每季: 再平衡检查 + 年度目标差距分析                 ║
║                                                            ║
║  🔔 推送策略:                                              ║
║     • ✅ 市场机会（发现时）                               ║
║     • ✅ 风险预警（立即）                                 ║
║     • ✅ 定期报告（周一/月初）                            ║
║     • ✅ 再平衡建议（季度末）                             ║
║     • 🔕 日常监控数据（仅后台记录）                       ║
║                                                            ║
║  📈 预期收益:                                              ║
║     • 乐观情景: 12% → 12万元                              ║
║     • 基准情景: 10% → 10万元 ✅                           ║
║     • 保守情景: 8% → 8万元                                ║
║     • 最大回撤: 控制在15%以内                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `;
  console.log(plan);

  console.log('👤 投资者确认: ✅ 确认计划');
  console.log('🚀 系统开始监控投资组合');
}

// ═══════════════════════════════════════════════════════════
// 步骤8: 执行
// ═══════════════════════════════════════════════════════════
async function step8_executeTasks() {
  printStep(8, '执行投资任务（第1-2周）');

  const executions = [
    {
      task: '分析投资者风险偏好',
      result: '稳健型（可承受15%最大回撤）',
      shouldNotify: true,
      pushed: true
    },
    {
      task: '生成资产配置方案',
      result: '50%权益+30%固收+20%现金方案',
      shouldNotify: true,
      pushed: true
    },
    {
      task: '每日市场监控',
      result: '市场估值处于中等水平',
      shouldNotify: false,
      pushed: false
    },
    {
      task: '推荐开户平台',
      result: '费率最低平台对比表',
      shouldNotify: true,
      pushed: true
    }
  ];

  for (const exec of executions) {
    console.log(`⏳ ${exec.task}`);
    await sleep(500);
    console.log(`   ✅ ${exec.result}`);
    console.log(exec.shouldNotify ? '   📬 已推送给投资者' : '   🔕 内部记录');
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════
// 步骤9: 第一次Review（第1个月）
// ═══════════════════════════════════════════════════════════
async function step9_firstGoalReview() {
  printStep(9, '【第1个月】投资目标 Review');

  printSubStep('评估目标进度');
  console.log('\n   📊 目标: 年化10%收益（月均0.83%）');
  console.log('   ├─ 已过时间: 1个月 / 12个月');
  console.log('   ├─ 当月收益: +0.5%（5000元）');
  console.log('   ├─ 预期收益: +0.83%（8300元）');
  console.log('   └─ 状态: ⚠️  略低于预期');

  printSubStep('子目标完成情况');
  console.log('   ✅ 风险评估与资产配置');
  console.log('   ✅ 投资账户建立');
  console.log('   🔄 权益类组合管理（收益+0.8%）');
  console.log('   🔄 固收类组合管理（收益+0.3%）');

  printSubStep('问题识别');
  console.log('   ⚠️  第1周市场下跌，权益类回撤2%');
  console.log('   ⚠️  投资者收到回撤提醒后咨询，但未恐慌抛售');
  console.log('   ✅ 后续市场反弹，收复失地');

  printSubStep('Review 结论');
  console.log('   📄 首月波动正常，投资者心态稳定');
  console.log('   📄 建议: 继续按计划执行，无需调整');
}

// ═══════════════════════════════════════════════════════════
// 步骤10: 调整计划
// ═══════════════════════════════════════════════════════════
async function step10_adjustPlan() {
  printStep(10, '根据Review调整');

  printSubStep('第3个月Review发现问题');
  console.log('\n   📊 第3个月数据:');
  console.log('   • 累计收益: +1.5%（目标2.5%）');
  console.log('   • 权益类表现不佳，仅+1%');
  console.log('   • 固收类稳定，+1.2%');
  console.log('   • 差距: 落后目标1个百分点');

  printSubStep('分析原因');
  console.log('   🔍 权益类配置过于保守');
  console.log('   🔍 错失科技板块上涨机会');

  printSubStep('生成调整方案');
  console.log('\n   1. 调整权益类配置');
  console.log('      从: 50%权益（30万基金+20万保守）');
  console.log('      到: 55%权益（增加10万成长型基金）');
  console.log('      原因: 提高收益潜力，同时保持风险可控');

  console.log('\n   2. 增加行业轮动策略');
  console.log('      新增: 每月行业趋势分析');
  console.log('      新增: 适时增配表现强势行业ETF');

  console.log('\n   3. 缩短Review周期');
  console.log('      从: 每月一次');
  console.log('      到: 每两周一次（直至赶上目标）');

  printSubStep('用户确认');
  console.log('   👤 投资者确认: ✅ 同意调整');
  console.log('   ✅ 权益类比例提升至55%');
  console.log('   ✅ 新增行业轮动监控');
}

// ═══════════════════════════════════════════════════════════
// 步骤11: 继续执行
// ═══════════════════════════════════════════════════════════
async function step11_continueExecution() {
  printStep(11, '继续执行（第4-6个月）');

  console.log('\n   📅 调整后执行摘要:');
  console.log('   • 第4月: 科技板块配置带来+2%收益');
  console.log('   • 累计收益: +3.5%（追平目标）✅');
  console.log('   • 第5月: 市场回调，回撤-0.5%');
  console.log('   • 第6月: 反弹+1.5%，累计+4.5%');
  console.log('   • 状态: 领先目标0.5% 🎉');

  console.log('\n   🔔 期间推送:');
  console.log('   • 科技板块机会发现（推送）→ 用户增配');
  console.log('   • 市场回调风险预警（推送）→ 用户保持定力');
  console.log('   • 每周Review报告（6次）');
  console.log('   • 月度收益账单（3次）');
}

// ═══════════════════════════════════════════════════════════
// 步骤12: 第二次Review（第6个月）
// ═══════════════════════════════════════════════════════════
async function step12_secondGoalReview() {
  printStep(12, '【第6个月】中期深度Review');

  printSubStep('评估目标进度');
  console.log('\n   📊 目标: 年化10%收益');
  console.log('   ├─ 已过时间: 6个月 / 12个月（50%）');
  console.log('   ├─ 当前收益: +4.5%（4.5万元）');
  console.log('   ├─ 预期收益: +5.0%（5万元）');
  console.log('   └─ 状态: ⚠️  略微落后，但在可接受范围');

  printSubStep('子目标完成情况');
  console.log('   ✅ 风险评估与资产配置（已优化）');
  console.log('   ✅ 投资账户建立');
  console.log('   🔄 权益类组合管理（累计+5%）');
  console.log('   ✅ 固收类组合管理（累计+2.5%）');
  console.log('   ✅ 现金管理');
  console.log('   ✅ 再平衡（1次，已执行）');

  printSubStep('投资组合表现归因');
  console.log('\n   📈 收益来源:');
  console.log('   • 科技成长基金: +8%（贡献主要收益）');
  console.log('   • 宽基指数基金: +3%');
  console.log('   • 债券基金: +2.5%');
  console.log('   • 货币基金: +1%');

  console.log('\n   ⚠️  问题:');
  console.log('   • 某个股持仓下跌10%（已触发止损线）');
  console.log('   • 第5月未及时减仓，回撤略大');

  printSubStep('生成调整建议');
  console.log('\n   📋 下半年策略:');
  console.log('   1. 保持55%权益配置（表现良好）');
  console.log('   2. 替换表现不佳个股为ETF（分散风险）');
  console.log('   3. 增加红利策略配置（防守性）');
  console.log('   4. 设置动态止盈（保护已有收益）');

  printSubStep('年度目标达成概率');
  console.log('\n   📊 情景分析:');
  console.log('   • 乐观（下半年+7%）: 达成率95% → 总收益11.5%');
  console.log('   • 基准（下半年+5.5%）: 达成率70% → 总收益10% ✅');
  console.log('   • 保守（下半年+4%）: 达成率40% → 总收益8.5%');

  printSubStep('推送给投资者');
  console.log('\n   📬 第6个月投资报告:');
  console.log('   "半年度投资回顾: 累计收益4.5%，略微落后目标');
  console.log('    但调整策略后已追上。下半年建议增加防守性');
  console.log('    配置，预计达成10%目标概率70%。"');

  printSubStep('Review策略调整');
  console.log('\n   🔄 后续安排:');
  console.log('   • 下半年Review频率: 恢复每月一次（表现稳定）');
  console.log('   • 新增: 动态止盈触发监控');
  console.log('   • 下次深度Review: 第9个月');
}

// 运行
runDemo().catch(console.error);
