#!/usr/bin/env node
/**
 * Goal-Driven Agent - 购车决策场景演示
 *
 * 目标: "我想买一辆SUV，预算20万以内，油车，要省油"
 *
 * 运行: node buy_car_demo-showcase.js
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
  printSection('🚗 Goal-Driven Agent - 购车决策场景演示');
  console.log('\n目标: "我想买一辆SUV，预算20万以内，油车，要省油"');
  console.log('预算: 20万以内');
  console.log('能源类型: 燃油车');
  console.log('核心诉求: 省油\n');
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
  await step12_finalGoalReview();

  printSection('✅ 演示完成');
  console.log('\n📊 购车决策场景特性:');
  console.log('   ✅ 多维度需求分析（预算、油耗、空间、品牌）');
  console.log('   ✅ 市场车型持续监控与价格变动提醒');
  console.log('   ✅ 4S店信息收集与试驾预约管理');
  console.log('   ✅ 购车时机把握（促销、购置税政策）');
  console.log('   ✅ 最终决策支持与验车提醒\n');
}

// ═══════════════════════════════════════════════════════════
// 步骤1: 收集目标
// ═══════════════════════════════════════════════════════════
async function step1_collectGoal() {
  printStep(1, '用户提交购车目标');

  const userGoal = '我想买一辆SUV，预算20万以内，油车，要省油';
  console.log(`🚗 用户输入: "${userGoal}"`);
  console.log('\n[系统] 分析购车需求...');
  console.log('   • 车型: SUV');
  console.log('   • 预算上限: 20万元');
  console.log('   • 能源类型: 燃油车');
  console.log('   • 核心需求: 省油（经济性优先）');
  await sleep(1000);
}

// ═══════════════════════════════════════════════════════════
// 步骤2: 收集背景信息
// ═══════════════════════════════════════════════════════════
async function step2_collectInfo() {
  printStep(2, '收集用车背景信息');

  console.log('\n🤖 [LLM] 分析购车目标，生成需求澄清问题...');
  await sleep(1200);

  const collectedInfo = {
    usageScenario: '城市通勤为主，偶尔周末自驾游',
    annualMileage: '1.5-2万公里',
    passengerCount: '主要2人，偶尔4-5人',
    brandPreference: '国产或合资都可以，更看性价比',
    sizePreference: '紧凑型SUV即可，不需要太大',
    transmission: '自动挡',
    features: '看重安全配置、车机智能、省油',
    purchaseTimeline: '2-3个月内购买',
    tradeIn: '无旧车置换',
    financing: '全款购车'
  };

  console.log('\n❓ Agent 向用户提问:');
  console.log('   1. 主要用车场景？ → 城市通勤为主，偶尔周末自驾');
  console.log('   2. 年行驶里程？ → 1.5-2万公里');
  console.log('   3. 平时载几个人？ → 主要2人，偶尔4-5人');
  console.log('   4. 品牌偏好？ → 国产合资都可以，看重性价比');
  console.log('   5. 车型大小？ → 紧凑型SUV即可');
  console.log('   6. 变速箱类型？ → 自动挡');
  console.log('   7. 看重哪些配置？ → 安全、智能、省油');
  console.log('   8. 计划何时购车？ → 2-3个月内');
  console.log('   9. 是否置换旧车？ → 无');
  console.log('   10. 全款还是贷款？ → 全款');

  console.log('\n✅ 购车画像:');
  console.log(`   • 用车场景: ${collectedInfo.usageScenario}`);
  console.log(`   • 年里程: ${collectedInfo.annualMileage}`);
  console.log(`   • 购买时间: ${collectedInfo.purchaseTimeline}`);
  console.log(`   • 支付方式: ${collectedInfo.financing}`);
}

// ═══════════════════════════════════════════════════════════
// 步骤3: 拆解子目标
// ═══════════════════════════════════════════════════════════
async function step3_decomposeSubGoals() {
  printStep(3, '拆解购车子目标');

  console.log('\n🤖 [LLM] 基于用户需求拆解目标...\n');
  console.log('   分析: 20万预算 + 省油油车SUV + 2-3个月购买');
  console.log('   → 需要筛选符合预算的车型');
  console.log('   → 需要对比油耗数据');
  console.log('   → 需要收集本地4S店信息\n');
  await sleep(1200);

  const subGoals = [
    {
      id: 'sg-1',
      name: '筛选符合需求的车型清单',
      priority: 'critical',
      deadline: '第1周',
      target: '输出5-8款候选车型',
      status: 'pending'
    },
    {
      id: 'sg-2',
      name: '收集目标车型详细参数与口碑',
      priority: 'critical',
      deadline: '第2周',
      target: '对比油耗、空间、配置、可靠性',
      status: 'pending'
    },
    {
      id: 'sg-3',
      name: '获取本地经销商报价信息',
      priority: 'high',
      deadline: '第2-3周',
      target: '3-5家4S店报价对比',
      status: 'pending'
    },
    {
      id: 'sg-4',
      name: '安排试驾体验',
      priority: 'high',
      deadline: '第3-4周',
      target: '试驾2-3款意向车型',
      status: 'pending'
    },
    {
      id: 'sg-5',
      name: '监控促销政策与购车时机',
      priority: 'high',
      deadline: '持续',
      target: '把握最佳购车时机',
      status: 'pending'
    },
    {
      id: 'sg-6',
      name: '确定最终购车方案',
      priority: 'critical',
      deadline: '第6周',
      target: '选定车型、配置、颜色',
      status: 'pending'
    },
    {
      id: 'sg-7',
      name: '完成购车与验车',
      priority: 'critical',
      deadline: '第8周',
      target: '提车完成',
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
  printStep(4, '梳理购车目标关系');

  console.log('\n📊 最终目标: 2-3个月内买到满意的省油SUV\n');
  console.log('🗺️  购车决策流程:');
  console.log('   ┌─────────────────────────────────────┐');
  console.log('   │         购车决策流程图              │');
  console.log('   ├─────────────────────────────────────┤');
  console.log('   │  ① 筛选车型（5-8款候选）            │');
  console.log('   │     ↓                               │');
  console.log('   │  ② 参数对比（油耗/空间/口碑）       │');
  console.log('   │     ↓                               │');
  console.log('   │  ③ 获取报价 → 缩小至2-3款           │');
  console.log('   │     ↓                               │');
  console.log('   │  ④ 试驾体验（实际感受）             │');
  console.log('   │     ↓                               │');
  console.log('   │  ⑤ 确定方案 → 等待最佳时机          │');
  console.log('   │     ↓                               │');
  console.log('   │  ⑥ 完成购车                         │');
  console.log('   └─────────────────────────────────────┘');

  console.log('\n📈 筛选标准（按优先级）:');
  console.log('   1. 落地价 ≤ 20万（硬性条件）');
  console.log('   2. 综合油耗 ≤ 8L/100km（核心诉求）');
  console.log('   3. 紧凑型SUV，空间够用');
  console.log('   4. 口碑良好，故障率低');
  console.log('   5. 安全配置齐全');
}

// ═══════════════════════════════════════════════════════════
// 步骤5: 生成任务
// ═══════════════════════════════════════════════════════════
async function step5_generateTasks() {
  printStep(5, '生成购车任务（含预期结果、推送策略）');

  console.log('\n🤖 [LLM] 生成购车决策管理任务...');
  console.log('\n任务属性:');
  console.log('   📤 预期结果: 信息收集/对比报告/提醒通知');
  console.log('   👤 用户参与: 确认类、试驾安排需用户参与');
  console.log('   🔔 推送判断: 重要信息推送，日常监控不推送\n');
  await sleep(1500);

  const tasks = [
    // ═══════════════════════════════════════════════════════
    // 子目标1: 筛选车型
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '筛选符合需求的车型清单',
      name: '搜索20万以内省油SUV车型',
      type: 'exploration',
      cycle: '第1周',
      expectedResult: '符合预算的SUV车型清单（含官方指导价、油耗数据）',
      resultFormat: '对比表格',
      requiresUserInput: false,
      userRole: '系统基于条件自动筛选',
      shouldNotify: true,
      notifyReason: '用户需了解有哪些可选车型',
      notifyTiming: '筛选完成后',
      valueThreshold: 0.9
    },
    {
      subGoal: '筛选符合需求的车型清单',
      name: '整理车型口碑与可靠性数据',
      type: 'exploration',
      cycle: '第1周',
      expectedResult: '各车型的车主口碑、常见故障、可靠性评分',
      resultFormat: '口碑汇总文档',
      requiresUserInput: false,
      userRole: '系统搜索整理',
      shouldNotify: true,
      notifyReason: '帮助用户排除问题车型',
      notifyTiming: '整理完成后',
      valueThreshold: 0.8
    },
    {
      subGoal: '筛选符合需求的车型清单',
      name: '生成候选车型推荐报告',
      type: 'one_time',
      cycle: '第1周',
      expectedResult: '5-8款推荐车型及推荐理由',
      resultFormat: '推荐报告',
      requiresUserInput: true,
      userRole: '查看推荐，可调整筛选条件',
      shouldNotify: true,
      notifyReason: '候选名单需用户确认',
      notifyTiming: '报告生成后立即',
      valueThreshold: 1.0
    },

    // ═══════════════════════════════════════════════════════
    // 子目标2: 详细参数对比
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '收集目标车型详细参数与口碑',
      name: '对比候选车型详细参数',
      type: 'exploration',
      cycle: '第2周',
      expectedResult: '油耗/空间/动力/配置的详细对比表',
      resultFormat: '对比表格',
      requiresUserInput: false,
      userRole: '系统搜索整理',
      shouldNotify: true,
      notifyReason: '详细对比帮助用户缩小范围',
      notifyTiming: '对比完成后',
      valueThreshold: 0.8
    },
    {
      subGoal: '收集目标车型详细参数与口碑',
      name: '收集真实油耗数据（车主众测）',
      type: 'exploration',
      cycle: '第2周',
      expectedResult: '各车型真实油耗数据（小熊油耗等平台）',
      resultFormat: '油耗对比表',
      requiresUserInput: false,
      userRole: '系统搜索整理',
      shouldNotify: true,
      notifyReason: '官方油耗与实际油耗可能有差异',
      notifyTiming: '数据收集后',
      valueThreshold: 0.9
    },
    {
      subGoal: '收集目标车型详细参数与口碑',
      name: '整理车型优缺点总结',
      type: 'one_time',
      cycle: '第2周',
      expectedResult: '每款车型的3个优点+3个缺点',
      resultFormat: '优缺点清单',
      requiresUserInput: false,
      userRole: '系统搜索整理',
      shouldNotify: true,
      notifyReason: '帮助用户权衡取舍',
      notifyTiming: '整理完成后',
      valueThreshold: 0.7
    },

    // ═══════════════════════════════════════════════════════
    // 子目标3: 获取经销商报价
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '获取本地经销商报价信息',
      name: '搜索本地4S店信息',
      type: 'exploration',
      cycle: '第2-3周',
      expectedResult: '本地各品牌4S店地址、联系方式、评价',
      resultFormat: '4S店信息表',
      requiresUserInput: false,
      userRole: '系统搜索整理',
      shouldNotify: true,
      notifyReason: '用户需要知道去哪里看车',
      notifyTiming: '信息整理后',
      valueThreshold: 0.8
    },
    {
      subGoal: '获取本地经销商报价信息',
      name: '监控车型价格变动',
      type: 'monitoring',
      cycle: '持续',
      expectedResult: '目标车型的市场价格变动记录',
      resultFormat: '内部数据',
      requiresUserInput: false,
      userRole: '无需感知，后台监控',
      shouldNotify: false,
      notifyReason: 'N/A - 仅用于发现降价时推送',
      notifyTiming: '仅降价时推送',
      valueThreshold: 0.0
    },
    {
      subGoal: '获取本地经销商报价信息',
      name: '降价提醒',
      type: 'event_triggered',
      cycle: '目标车型降价时',
      expectedResult: '降价通知（含降价幅度、落地价计算）',
      resultFormat: '优惠提醒',
      requiresUserInput: false,
      userRole: '查看优惠信息',
      shouldNotify: true,
      notifyReason: '降价是购车重要时机',
      notifyTiming: '发现降价立即推送',
      valueThreshold: 0.9
    },

    // ═══════════════════════════════════════════════════════
    // 子目标4: 安排试驾
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '安排试驾体验',
      name: '推荐试驾车型与路线',
      type: 'one_time',
      cycle: '第3周',
      expectedResult: '建议试驾的2-3款车型+试驾关注点清单',
      resultFormat: '试驾建议',
      requiresUserInput: true,
      userRole: '确认要试驾的车型',
      shouldNotify: true,
      notifyReason: '试驾安排需要用户确认',
      notifyTiming: '生成建议后',
      valueThreshold: 0.8
    },
    {
      subGoal: '安排试驾体验',
      name: '协助预约试驾',
      type: 'one_time',
      cycle: '第3-4周',
      expectedResult: '4S店试驾预约确认',
      resultFormat: '预约确认',
      requiresUserInput: true,
      userRole: '提供联系方式，确认时间',
      shouldNotify: true,
      notifyReason: '试驾时间需用户确认',
      notifyTiming: '预约成功后',
      valueThreshold: 0.9
    },
    {
      subGoal: '安排试驾体验',
      name: '试驾提醒',
      type: 'event_triggered',
      cycle: '试驾前一天',
      expectedResult: '试驾提醒（含时间地点、注意事项）',
      resultFormat: '提醒通知',
      requiresUserInput: false,
      userRole: '查看提醒，准备试驾',
      shouldNotify: true,
      notifyReason: '避免用户忘记试驾',
      notifyTiming: '试驾前一天',
      valueThreshold: 0.7
    },

    // ═══════════════════════════════════════════════════════
    // 子目标5: 监控购车时机
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '监控促销政策与购车时机',
      name: '监控厂家促销活动',
      type: 'monitoring',
      cycle: '持续',
      expectedResult: '厂家促销信息汇总',
      resultFormat: '内部监控数据',
      requiresUserInput: false,
      userRole: '无需感知',
      shouldNotify: false,
      notifyReason: 'N/A - 仅重大促销推送',
      notifyTiming: '仅重大优惠时',
      valueThreshold: 0.0
    },
    {
      subGoal: '监控促销政策与购车时机',
      name: '重大促销推送',
      type: 'event_triggered',
      cycle: '发现重大优惠时',
      expectedResult: '促销详情+购买建议',
      resultFormat: '促销快报',
      requiresUserInput: false,
      userRole: '查看促销信息',
      shouldNotify: true,
      notifyReason: '重大优惠机会难得',
      notifyTiming: '发现后立即推送',
      valueThreshold: 0.85
    },
    {
      subGoal: '监控促销政策与购车时机',
      name: '购置税政策跟踪',
      type: 'monitoring',
      cycle: '每月',
      expectedResult: '购置税优惠政策变化',
      resultFormat: '政策简报',
      requiresUserInput: false,
      userRole: '了解政策变化',
      shouldNotify: true,
      notifyReason: '购置税影响落地价',
      notifyTiming: '政策变化时',
      valueThreshold: 0.8
    },
    {
      subGoal: '监控促销政策与购车时机',
      name: '季度末/年末冲量提醒',
      type: 'event_triggered',
      cycle: '每季度末/年末',
      expectedResult: '冲量期购车建议',
      resultFormat: '购车时机建议',
      requiresUserInput: false,
      userRole: '了解砍价时机',
      shouldNotify: true,
      notifyReason: '冲量期优惠力度大',
      notifyTiming: '季度末前1周',
      valueThreshold: 0.7
    },

    // ═══════════════════════════════════════════════════════
    // 子目标6: 确定购车方案
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '确定最终购车方案',
      name: '生成最终购车建议',
      type: 'one_time',
      cycle: '第6周',
      expectedResult: '推荐车型+配置+颜色+目标成交价',
      resultFormat: '购车方案',
      requiresUserInput: true,
      userRole: '确认最终购买车型',
      shouldNotify: true,
      notifyReason: '最终决策需用户确认',
      notifyTiming: '方案生成后立即',
      valueThreshold: 1.0
    },
    {
      subGoal: '确定最终购车方案',
      name: '提供砍价策略',
      type: 'one_time',
      cycle: '第6周',
      expectedResult: '砍价话术+目标价格+赠品清单',
      resultFormat: '砍价指南',
      requiresUserInput: false,
      userRole: '参考使用',
      shouldNotify: true,
      notifyReason: '帮助用户争取最优价格',
      notifyTiming: '与购车方案一起推送',
      valueThreshold: 0.7
    },

    // ═══════════════════════════════════════════════════════
    // 子目标7: 完成购车
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '完成购车与验车',
      name: '验车清单提醒',
      type: 'event_triggered',
      cycle: '提车前',
      expectedResult: '验车注意事项清单',
      resultFormat: '验车指南',
      requiresUserInput: false,
      userRole: '对照清单验车',
      shouldNotify: true,
      notifyReason: '避免提到问题车',
      notifyTiming: '提车前1天',
      valueThreshold: 0.9
    },
    {
      subGoal: '完成购车与验车',
      name: '购车文件核对清单',
      type: 'event_triggered',
      cycle: '提车当天',
      expectedResult: '随车文件核对清单',
      resultFormat: '文件清单',
      requiresUserInput: false,
      userRole: '对照清单核对',
      shouldNotify: true,
      notifyReason: '避免遗漏重要文件',
      notifyTiming: '提车当天早晨',
      valueThreshold: 0.8
    },

    // ═══════════════════════════════════════════════════════
    // Review 任务
    // ═══════════════════════════════════════════════════════
    {
      subGoal: '购车目标整体管理',
      name: '每周购车进度Review',
      type: 'recurring',
      cycle: '每周一',
      expectedResult: '进度报告+下一步行动建议',
      resultFormat: 'Review报告',
      requiresUserInput: true,
      userRole: '查看进度，确认后续安排',
      shouldNotify: true,
      notifyReason: '用户需了解购车进展',
      notifyTiming: '每周一',
      valueThreshold: 0.8
    },
    {
      subGoal: '购车目标整体管理',
      name: '时间节点预警',
      type: 'event_triggered',
      cycle: '目标截止前',
      expectedResult: '时间紧迫提醒+加速建议',
      resultFormat: '预警通知',
      requiresUserInput: false,
      userRole: '了解时间压力',
      shouldNotify: true,
      notifyReason: '避免错过购车时机',
      notifyTiming: '截止前2周',
      valueThreshold: 0.9
    }
  ];

  console.log(`✅ 共生成 ${tasks.length} 个购车任务\n`);

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
  console.log(`   🔔 需要推送: ${notifyTasks.length} 个（车型信息、降价提醒、试驾安排等）`);
  console.log(`   🔕 无需推送: ${noNotifyTasks.length} 个（价格监控、日常数据收集）`);
  console.log(`   👤 需用户决策: ${tasks.filter(t => t.requiresUserInput).length} 个`);
}

// ═══════════════════════════════════════════════════════════
// 步骤6: Review 任务
// ═══════════════════════════════════════════════════════════
async function step6_reviewTasks() {
  printStep(6, 'Review 购车任务');

  console.log('\n🤖 [系统] 评估任务与购车目标的相关性...\n');
  await sleep(1200);

  const reviews = [
    { task: '搜索省油SUV车型', contribution: 'critical', reason: '筛选候选车型的基础' },
    { task: '整理车型口碑', contribution: 'high', reason: '排除问题车型' },
    { task: '收集真实油耗数据', contribution: 'critical', reason: '核心需求是省油' },
    { task: '监控价格变动', contribution: 'high', reason: '把握最佳购买时机' },
    { task: '降价提醒', contribution: 'high', reason: '省钱关键' },
    { task: '试驾安排', contribution: 'critical', reason: '实际体验决定购买' },
    { task: '砍价策略', contribution: 'medium', reason: '辅助省钱' },
    { task: '验车清单', contribution: 'critical', reason: '避免提到问题车' },
    { task: '每周进度Review', contribution: 'high', reason: '确保按计划推进' }
  ];

  reviews.forEach(r => {
    const icon = r.contribution === 'critical' ? '🔴' : r.contribution === 'high' ? '🟢' : '🟡';
    console.log(`   ✅ ${r.task}`);
    console.log(`      ${icon} 贡献度: ${r.contribution} | ${r.reason}`);
  });

  console.log('\n✅ Review 结论: 所有任务对齐省油SUV购车目标');
}

// ═══════════════════════════════════════════════════════════
// 步骤7: 确认计划
// ═══════════════════════════════════════════════════════════
async function step7_confirmPlan() {
  printStep(7, '向用户汇报购车计划');

  const plan = `
╔════════════════════════════════════════════════════════════╗
║              🚗 您的购车决策管理方案                       ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🎯 购车目标: 20万以内省油燃油SUV                          ║
║                                                            ║
║  📊 计划包含:                                              ║
║     • 7个子目标                                            ║
║     • 22个具体任务（17个推送 + 5个内部）                  ║
║     • 6个需要您参与的任务                                 ║
║     • 每周定期Review                                      ║
║                                                            ║
║  ⏰ 时间规划（2-3个月）:                                   ║
║     • 第1-2周: 筛选车型、收集参数口碑                     ║
║     • 第3-4周: 获取报价、安排试驾                         ║
║     • 第5-6周: 确定车型、等待最佳时机                     ║
║     • 第7-8周: 完成购车                                   ║
║                                                            ║
║  🔔 推送策略:                                              ║
║     • ✅ 车型推荐、参数对比（立即）                       ║
║     • ✅ 降价提醒（立即 - 重要）                          ║
║     • ✅ 试驾安排提醒（预约前1天）                        ║
║     • ✅ 促销信息（发现时）                               ║
║     • ✅ 验车清单（提车前）                               ║
║     • 🔕 价格监控（后台记录，仅降价推送）                 ║
║                                                            ║
║  💡 关键提醒:                                              ║
║     • 真实油耗数据会单独收集（小熊油耗等）               ║
║     • 季度末/年末是砍价好时机                            ║
║     • 提车时有详细的验车清单                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `;
  console.log(plan);

  console.log('👤 用户确认: ✅ 确认计划');
  console.log('🚀 系统开始监控车型信息与价格');
}

// ═══════════════════════════════════════════════════════════
// 步骤8: 执行
// ═══════════════════════════════════════════════════════════
async function step8_executeTasks() {
  printStep(8, '执行购车任务（第1-2周）');

  const executions = [
    {
      task: '搜索20万以内省油SUV车型',
      result: '筛选出8款候选车型（哈弗H6、长安CS75PLUS、本田XR-V、丰田锋兰达、日产逍客、大众途岳、吉利星越L、比亚迪宋Pro）',
      shouldNotify: true,
      pushed: true
    },
    {
      task: '整理车型口碑',
      result: '排除2款口碑较差车型，剩余6款',
      shouldNotify: true,
      pushed: true
    },
    {
      task: '收集真实油耗数据',
      result: '小熊油耗数据：本田XR-V 6.8L、丰田锋兰达7.2L、日产逍客7.5L、大众途岳7.8L、哈弗H6 8.2L、长安CS75PLUS 8.5L',
      shouldNotify: true,
      pushed: true
    },
    {
      task: '监控价格变动',
      result: '本田XR-V优惠2万，丰田锋兰达优惠1.5万',
      shouldNotify: false,
      pushed: false
    },
    {
      task: '降价提醒',
      result: '触发推送：本田XR-V降价2万，落地价16.5万',
      shouldNotify: true,
      pushed: true
    }
  ];

  for (const exec of executions) {
    console.log(`⏳ ${exec.task}`);
    await sleep(500);
    console.log(`   ✅ ${exec.result}`);
    console.log(exec.shouldNotify ? '   📬 已推送给用户' : '   🔕 内部记录');
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════
// 步骤9: 第一次Review（第2周）
// ═══════════════════════════════════════════════════════════
async function step9_firstGoalReview() {
  printStep(9, '【第2周】购车目标 Review');

  printSubStep('评估目标进度');
  console.log('\n   📊 目标: 2-3个月内买到省油SUV');
  console.log('   ├─ 已过时间: 2周 / 10周');
  console.log('   ├─ 当前阶段: 候选车型已确定');
  console.log('   ├─ 下阶段: 获取报价、安排试驾');
  console.log('   └─ 状态: ✅ 正常推进');

  printSubStep('子目标完成情况');
  console.log('   ✅ 筛选符合需求的车型清单（6款候选）');
  console.log('   ✅ 收集目标车型详细参数与口碑');
  console.log('   🔄 获取本地经销商报价信息（进行中）');
  console.log('   ⏳ 安排试驾体验');
  console.log('   🔄 监控促销政策与购车时机');

  printSubStep('关键发现');
  console.log('   💡 油耗最低3款:');
  console.log('      1. 本田XR-V - 6.8L/100km（已优惠2万）');
  console.log('      2. 丰田锋兰达 - 7.2L/100km（已优惠1.5万）');
  console.log('      3. 日产逍客 - 7.5L/100km（优惠1万）');

  printSubStep('Review 结论');
  console.log('   📄 候选车型筛选完成，重点关注省油日系车');
  console.log('   📄 建议: 本周安排试驾前3款车型');
}

// ═══════════════════════════════════════════════════════════
// 步骤10: 调整计划
// ═══════════════════════════════════════════════════════════
async function step10_adjustPlan() {
  printStep(10, '根据Review调整');

  printSubStep('第4周Review发现问题');
  console.log('\n   📊 第4周情况:');
  console.log('   • 已试驾: 本田XR-V、丰田锋兰达、日产逍客');
  console.log('   • 用户反馈: XR-V空间偏小，锋兰达内饰一般');
  console.log('   • 新发现: 吉利星越L虽然油耗8.0L但配置高，近期优惠2.5万');
  console.log('   • 用户偏好变化: 愿意接受稍高油耗换取更好配置');

  printSubStep('分析原因');
  console.log('   🔍 用户对"省油"的优先级有所下降');
  console.log('   🔍 空间和配置权重上升');

  printSubStep('生成调整方案');
  console.log('\n   1. 扩大候选范围');
  console.log('      新增: 吉利星越L、长安CS75PLUS进入决赛圈');
  console.log('      原因: 用户更看重大空间和智能配置');

  console.log('\n   2. 调整筛选标准');
  console.log('      油耗权重: 40% → 30%');
  console.log('      空间权重: 20% → 30%');
  console.log('      配置权重: 20% → 30%');

  console.log('\n   3. 增加深度对比');
  console.log('      新增: 车机系统对比');
  console.log('      新增: 后排空间实测数据对比');

  printSubStep('用户确认');
  console.log('   👤 用户确认: ✅ 同意调整');
  console.log('   ✅ 扩大候选车型范围');
  console.log('   ✅ 重新评估权重');
}

// ═══════════════════════════════════════════════════════════
// 步骤11: 继续执行
// ═══════════════════════════════════════════════════════════
async function step11_continueExecution() {
  printStep(11, '继续执行（第5-6周）');

  console.log('\n   📅 调整后执行摘要:');
  console.log('   • 第5周: 试驾吉利星越L、长安CS75PLUS');
  console.log('   • 用户最终倾向: 丰田锋兰达（均衡）vs 吉利星越L（高配）');
  console.log('   • 第6周: 锋兰达优惠提升至2万（限时活动）');
  console.log('   • 触发降价提醒 → 用户决定购买锋兰达');

  console.log('\n   🔔 期间推送:');
  console.log('   • 锋兰达限时优惠2万（推送）→ 用户决策');
  console.log('   • 最终购车方案（推送）→ 用户确认');
  console.log('   • 砍价策略指南（推送）→ 用户参考');
  console.log('   • 每周Review报告（2次）');
}

// ═══════════════════════════════════════════════════════════
// 步骤12: 最终Review（第8周）
// ═══════════════════════════════════════════════════════════
async function step12_finalGoalReview() {
  printStep(12, '【第8周】购车完成 Review');

  printSubStep('评估目标完成度');
  console.log('\n   📊 购车目标:');
  console.log('   ├─ 目标车型: 20万以内省油SUV');
  console.log('   ├─ 实际购买: 丰田锋兰达 2.0L CVT豪华版');
  console.log('   ├─ 落地价: 17.8万元 ✅ 符合预算');
  console.log('   ├─ 官方油耗: 5.8L/100km ✅ 省油');
  console.log('   ├─ 车主众测: 7.2L/100km ✅ 符合预期');
  console.log('   └─ 状态: ✅ 目标达成');

  printSubStep('子目标完成情况');
  console.log('   ✅ 筛选符合需求的车型清单');
  console.log('   ✅ 收集目标车型详细参数与口碑');
  console.log('   ✅ 获取本地经销商报价信息');
  console.log('   ✅ 安排试驾体验（5款车）');
  console.log('   ✅ 监控促销政策与购车时机（成功抓住优惠）');
  console.log('   ✅ 确定最终购车方案');
  console.log('   ✅ 完成购车与验车');

  printSubStep('购车过程回顾');
  console.log('\n   📈 关键节点:');
  console.log('   • 第2周: 锁定6款候选车型');
  console.log('   • 第4周: 根据试驾反馈调整偏好');
  console.log('   • 第6周: 抓住限时优惠，确定购买锋兰达');
  console.log('   • 第7周: 验车、付款、提车');
  console.log('   • 第8周: 完成上牌');

  console.log('\n   💰 节省金额:');
  console.log('   • 原指导价: 19.8万');
  console.log('   • 优惠后: 17.8万');
  console.log('   • 节省: 2万元 ✅');

  printSubStep('系统推送统计');
  console.log('\n   📬 本次购车共推送:');
  console.log('   • 车型信息: 3次');
  console.log('   • 降价提醒: 2次（促成最终决策）');
  console.log('   • 试驾提醒: 2次');
  console.log('   • 购车方案: 1次');
  console.log('   • 验车清单: 1次');
  console.log('   • 进度报告: 4次');

  printSubStep('Review 结论');
  console.log('\n   ✅ 购车目标成功达成');
  console.log('   ✅ 预算控制良好（17.8万 < 20万）');
  console.log('   ✅ 省油目标达成（7.2L实际油耗）');
  console.log('   ✅ 抓住促销时机，节省2万元');
  console.log('\n   📄 用户满意度: ⭐⭐⭐⭐⭐');
  console.log('   "系统帮我梳理了选车思路，及时推送了降价信息，省心省力"');
}

// 运行
runDemo().catch(console.error);
