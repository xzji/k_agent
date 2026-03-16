#!/usr/bin/env node
/**
 * 演示：AI 如何自动生成维度和成功标准
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     AI 自动生成维度和成功标准演示                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 模拟 AI 分析用户目标并生成维度
function analyzeGoalAndGenerateDimensions(userGoal) {
  console.log('📌 用户目标:', userGoal);
  console.log('\n🤖 AI 正在分析...\n');

  // 模拟 AI 分析过程
  const analysis = {
    // AI 识别出这个目标涉及哪些方面
    aspects: [
      '需要找到合适的学习资料',
      '需要制定学习计划',
      '需要了解考试报名信息',
      '需要练习和模拟考试',
    ],

    // 生成的维度（基于分析）
    dimensions: [
      {
        name: '学习资源',
        why: '备考需要书籍、APP、课程',
        infoNeeds: [
          '适合四级水平到雅思7分的书籍',
          '口碑好的在线课程',
          '有用的学习APP',
          '免费练习资源',
        ],
      },
      {
        name: '备考策略',
        why: '需要了解考试结构和技巧',
        infoNeeds: [
          '雅思4个模块的考试形式',
          '各模块的备考重点',
          '时间管理技巧',
          '常见失分点',
        ],
      },
      {
        name: '考试时间',
        why: '需要知道什么时候报名、考试',
        infoNeeds: [
          '未来3个月的考试日期',
          '报名截止时间',
          '报名费用和流程',
          '考场位置',
        ],
      },
      {
        name: '练习计划',
        why: '需要持续练习才能提高',
        infoNeeds: [
          '每日练习安排',
          '每周模拟考试',
          '弱项强化计划',
        ],
      },
    ],

    // 生成的成功标准
    successCriteria: [
      {
        description: '完成所有4个模块的系统学习',
        type: 'milestone',
        why: '必须学完才能考好',
      },
      {
        description: '模拟考试成绩稳定在7.0以上',
        type: 'condition',
        why: '确保真实考试能达标',
      },
      {
        description: '成功报名并完成正式考试',
        type: 'deliverable',
        why: '最终目标就是去考试',
      },
      {
        description: '词汇量达到8000+',
        type: 'condition',
        why: '7分需要这个词汇量',
      },
    ],
  };

  return analysis;
}

// 运行分析
const userGoal = '我想在3个月内通过雅思考试，目标7分，目前四级500分';
const result = analyzeGoalAndGenerateDimensions(userGoal);

// 显示分析结果
console.log('═══════════════════════════════════════════════════════════');
console.log('                    AI 分析结果');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('💭 AI 识别出的关键方面:');
result.aspects.forEach((aspect, i) => {
  console.log(`   ${i + 1}. ${aspect}`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`                    探索维度 (${result.dimensions.length}个)`);
console.log('═══════════════════════════════════════════════════════════\n');

result.dimensions.forEach((dim, i) => {
  console.log(`📐 维度 ${i + 1}: ${dim.name}`);
  console.log(`   为什么需要: ${dim.why}`);
  console.log('   需要收集的信息:');
  dim.infoNeeds.forEach((info, j) => {
    console.log(`      ${j + 1}. ${info}`);
  });
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log(`                    成功标准 (${result.successCriteria.length}个)`);
console.log('═══════════════════════════════════════════════════════════\n');

result.successCriteria.forEach((criteria, i) => {
  const typeIcons = {
    milestone: '🏁',
    condition: '✅',
    deliverable: '📦',
  };
  console.log(`${typeIcons[criteria.type]} 标准 ${i + 1}: ${criteria.description}`);
  console.log(`   类型: ${criteria.type}`);
  console.log(`   原因: ${criteria.why}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('                    生成的任务计划');
console.log('═══════════════════════════════════════════════════════════\n');

const tasks = [
  { title: '询问用户详细信息', type: 'interactive', reason: '需要了解每天能学多久、预算多少' },
  { title: '搜索雅思备考资料', type: 'exploration', reason: '维度"学习资源"需要' },
  { title: '制定3个月学习计划', type: 'one_time', reason: '维度"练习计划"需要' },
  { title: '查询 upcoming 考试日期', type: 'exploration', reason: '维度"考试时间"需要' },
  { title: '每日学习提醒', type: 'recurring', reason: '持续执行到考试' },
  { title: '每周进度检查', type: 'recurring', reason: '监控进度' },
  { title: '监控报名开放时间', type: 'monitoring', reason: '不要错过报名' },
];

tasks.forEach((task, i) => {
  const typeIcons = {
    interactive: '💬',
    exploration: '🔍',
    one_time: '📝',
    recurring: '⏰',
    monitoring: '👀',
  };
  console.log(`${typeIcons[task.type]} 任务 ${i + 1}: ${task.title}`);
  console.log(`   类型: ${task.type} | 原因: ${task.reason}`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('                    依赖关系');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('任务执行顺序:');
console.log('');
console.log('  1️⃣  询问用户详细信息 (interactive)');
console.log('       ↓');
console.log('  2️⃣  搜索雅思备考资料 (exploration) - 需要知道预算');
console.log('       ↓');
console.log('  3️⃣  制定3个月学习计划 (one_time) - 需要知道可用时间');
console.log('       ↓');
console.log('  4️⃣  查询考试日期 (exploration)');
console.log('       ↓');
console.log('  5️⃣  启动每日提醒 (recurring) - 计划制定后开始');
console.log('       ↓');
console.log('  6️⃣  启动每周检查 (recurring)');
console.log('       ↓');
console.log('  7️⃣  监控报名开放 (monitoring) - 持续关注');

console.log('\n═══════════════════════════════════════════════════════════\n');

console.log('💡 对比：硬编码 vs AI 生成');
console.log('');
console.log('硬编码版本 (demo.js):');
console.log('   • 维度: 2个 (考试资源、学习计划)');
console.log('   • 标准: 3个 (完成学习、模拟7分、参加考试)');
console.log('   • 问题: 不够全面，缺少报名、策略等');
console.log('');
console.log('AI 生成版本:');
console.log('   • 维度: 4个 (资源、策略、时间、练习)');
console.log('   • 标准: 4个 (增加词汇量标准)');
console.log('   • 优势: 更全面，根据用户具体情况定制');
console.log('');
console.log('在真实系统中，应该用 AI 分析目标，自动生成这些内容。');
