#!/usr/bin/env node
/**
 * Goal-Driven Agent 演示脚本
 *
 * 运行方式: node demo.js
 */

const fs = require('fs');
const path = require('path');

// 模拟存储目录
const STORAGE_DIR = path.join(require('os').homedir(), '.pi/agent/goal-driven-demo');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 生成ID
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// 当前时间
function now() {
  return Date.now();
}

// 格式化时间
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// 简单的内存存储
class DemoTaskStore {
  constructor() {
    this.tasks = new Map();
  }

  async createTask(taskData) {
    const task = {
      ...taskData,
      id: generateId(),
      createdAt: now(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async getTasksByGoal(goalId) {
    return Array.from(this.tasks.values()).filter(t => t.goalId === goalId);
  }

  async updateStatus(taskId, status, metadata = {}) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      Object.assign(task, metadata);
      task.updatedAt = now();
    }
    return task;
  }
}

class DemoGoalStore {
  constructor() {
    this.goals = new Map();
  }

  async createGoal(goalData) {
    const goal = {
      ...goalData,
      id: generateId(),
      createdAt: now(),
    };
    this.goals.set(goal.id, goal);
    return goal;
  }

  async getGoal(goalId) {
    return this.goals.get(goalId);
  }

  async getActiveGoals() {
    return Array.from(this.goals.values()).filter(g =>
      ['active', 'gathering_info', 'planning'].includes(g.status)
    );
  }
}

// 演示场景
async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         🤖 Goal-Driven Agent 演示                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const taskStore = new DemoTaskStore();
  const goalStore = new DemoGoalStore();

  // 场景1: 用户创建目标
  console.log('📌 场景1: 用户创建目标');
  console.log('用户说: "我想在3个月内通过雅思考试，目标7分"\n');

  const goal = await goalStore.createGoal({
    title: '准备雅思考试',
    description: '3个月内通过雅思考试，目标分数7.0',
    status: 'active',
    priority: 'high',
    deadline: now() + 90 * 24 * 60 * 60 * 1000,
    dimensions: [
      {
        id: 'dim-1',
        goalId: '',
        name: '考试资源',
        priority: 'high',
        infoNeeds: [
          { id: 'in-1', description: '最佳备考书籍', priority: 'high' },
          { id: 'in-2', description: '在线课程推荐', priority: 'high' },
        ],
        sources: [],
        status: 'pending',
        createdAt: now(),
      },
      {
        id: 'dim-2',
        goalId: '',
        name: '学习计划',
        priority: 'high',
        infoNeeds: [
          { id: 'in-3', description: '每日学习安排', priority: 'high' },
        ],
        sources: [],
        status: 'pending',
        createdAt: now(),
      },
    ],
    successCriteria: [
      { id: 'sc-1', description: '完成所有4个模块备考', type: 'milestone', completed: false },
      { id: 'sc-2', description: '模拟考试成绩达到7.0', type: 'condition', completed: false },
      { id: 'sc-3', description: '成功报名并参加考试', type: 'deliverable', completed: false },
    ],
    progress: { completedCriteria: 0, totalCriteria: 3, percentage: 0 },
    userContext: { collectedInfo: {}, requiredInfo: ['当前英语水平', '每天学习时间', '预算'] },
  });

  console.log(`✅ 系统创建了目标: ${goal.title}`);
  console.log(`   目标ID: ${goal.id.slice(0, 8)}`);
  console.log(`   探索维度: ${goal.dimensions.length}个`);
  console.log(`   成功标准: ${goal.successCriteria.length}个\n`);

  // 场景2: 系统生成任务
  console.log('📌 场景2: 系统自动生成任务\n');

  const task1 = await taskStore.createTask({
    goalId: goal.id,
    title: '收集用户偏好信息',
    description: '了解用户的英语水平和时间安排',
    type: 'interactive',
    priority: 'critical',
    status: 'waiting_user',
    execution: { agentPrompt: '询问用户信息', requiredTools: [], requiredContext: [], capabilityMode: 'direct' },
    dependencies: [],
  });
  console.log(`📝 任务1创建: ${task1.title}`);
  console.log(`   类型: 交互式 | 状态: ${task1.status}`);
  console.log(`   说明: 系统会询问你的英语水平、学习时间等\n`);

  const task2 = await taskStore.createTask({
    goalId: goal.id,
    title: '搜索雅思备考资料',
    description: '搜索最佳的雅思备考书籍和APP',
    type: 'exploration',
    priority: 'high',
    status: 'blocked',
    execution: { agentPrompt: '搜索备考资源', requiredTools: ['web_search'], requiredContext: [], capabilityMode: 'composite' },
    dependencies: [task1.id],
  });
  console.log(`📝 任务2创建: ${task2.title}`);
  console.log(`   类型: 探索型 | 状态: ${task2.status}`);
  console.log(`   依赖: 任务1 (${task1.id.slice(0, 8)})\n`);

  const task3 = await taskStore.createTask({
    goalId: goal.id,
    title: '每日学习提醒',
    description: '每天早上9点提醒用户学习',
    type: 'recurring',
    priority: 'medium',
    status: 'blocked',
    schedule: { type: 'interval', intervalMs: 24 * 60 * 60 * 1000 },
    execution: { agentPrompt: '生成今日学习计划', requiredTools: [], requiredContext: [], capabilityMode: 'direct' },
    dependencies: [task2.id],
  });
  console.log(`📝 任务3创建: ${task3.title}`);
  console.log(`   类型: 周期性 | 状态: ${task3.status}`);
  console.log(`   执行频率: 每天 | 依赖: 任务2\n`);

  // 场景3: 交互式任务
  console.log('📌 场景3: 交互式任务 - 系统询问用户信息\n');
  console.log('💬 系统: "为了帮你制定合适的雅思备考计划，请告诉我："');
  console.log('        "你现在的英语水平怎么样？（比如四六级分数）"\n');

  console.log('💬 用户: "我四级500分，每天能学2小时，预算5000元"\n');

  // 模拟用户回复处理
  await taskStore.updateStatus(task1.id, 'completed', {
    collectedInfo: {
      englishLevel: '四级500分',
      dailyTime: '2小时',
      budget: '5000元',
    },
  });

  console.log('✅ 系统已记录用户信息');
  console.log('   - 英语水平: 四级500分');
  console.log('   - 每日学习时间: 2小时');
  console.log('   - 预算: 5000元\n');

  // 场景4: 依赖任务解锁
  console.log('📌 场景4: 依赖任务自动解锁\n');

  await taskStore.updateStatus(task2.id, 'ready');
  console.log(`🔓 任务2 "${task2.title}" 已解锁 (依赖已满足)`);
  console.log(`   新状态: ready → 可以开始执行\n`);

  // 场景5: 任务执行
  console.log('📌 场景5: 任务执行 - 搜索备考资料\n');

  await taskStore.updateStatus(task2.id, 'in_progress');
  console.log('🔍 系统正在搜索雅思备考资料...');

  // 模拟执行时间
  await new Promise(resolve => setTimeout(resolve, 1000));

  await taskStore.updateStatus(task2.id, 'completed', {
    result: {
      success: true,
      output: '找到5本推荐书籍: 1.剑桥雅思真题 2.雅思词汇真经...',
    },
  });

  console.log('✅ 任务2完成！');
  console.log('   结果: 找到5本推荐书籍');
  console.log('   📬 已发送通知给用户\n');

  // 场景6: 知识存储
  console.log('📌 场景6: 知识沉淀与复用\n');

  const knowledgeItems = [
    { content: '《剑桥雅思真题》是备考必备书籍，包含历年真题', category: '书籍', importance: 0.95 },
    { content: '雅思考试每月2-4场，需提前1-2个月报名', category: '考试信息', importance: 0.9 },
    { content: '听力部分建议每天练习1小时', category: '学习方法', importance: 0.8 },
  ];

  knowledgeItems.forEach((item, i) => {
    console.log(`💾 知识条目${i + 1}: ${item.content.slice(0, 40)}...`);
    console.log(`   分类: ${item.category} | 重要度: ${item.importance}`);
  });
  console.log('');

  // 场景7: 周期性任务启动
  console.log('📌 场景7: 周期性任务启动\n');

  await taskStore.updateStatus(task3.id, 'ready');
  console.log(`🔓 任务3 "${task3.title}" 已解锁`);

  await taskStore.updateStatus(task3.id, 'in_progress');
  console.log('⏰ 系统已设置每日学习提醒');
  console.log('   提醒时间: 每天早上 9:00');
  console.log('   执行次数: 90天（直到考试）\n');

  // 场景8: 进度更新
  console.log('📌 场景8: 进度评估\n');

  goal.progress = {
    completedCriteria: 1,
    totalCriteria: 3,
    percentage: 33,
    lastEvaluatedAt: now(),
  };

  console.log(`📊 目标进度更新: ${goal.progress.percentage}%`);
  console.log(`   成功标准: ${goal.progress.completedCriteria}/${goal.progress.totalCriteria}`);
  console.log('   ✅ 完成所有4个模块备考');
  console.log('   ⏳ 模拟考试成绩达到7.0');
  console.log('   ⏳ 成功报名并参加考试\n');

  // 场景9: 最终状态
  console.log('📌 场景9: 当前系统状态\n');

  const tasks = await taskStore.getTasksByGoal(goal.id);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const ready = tasks.filter(t => t.status === 'ready').length;

  console.log('📋 任务统计:');
  console.log(`   总任务: ${tasks.length}`);
  console.log(`   ✅ 已完成: ${completed}`);
  console.log(`   🔄 进行中: ${inProgress}`);
  console.log(`   ⏳ 就绪: ${ready}\n`);

  console.log('🎯 目标状态:');
  console.log(`   标题: ${goal.title}`);
  console.log(`   进度: ${goal.progress.percentage}%`);
  console.log(`   状态: ${goal.status}`);
  console.log(`   知识条目: 3条`);
  console.log(`   下次提醒: 明天 9:00\n`);

  // 场景10: 用户后续交互
  console.log('📌 场景10: 用户后续可以做什么？\n');

  console.log('用户可以:');
  console.log('   1. 回复系统的问题 (交互式任务)');
  console.log('   2. 查看进度: /goal status ' + goal.id.slice(0, 8));
  console.log('   3. 查看详情: /goal tree ' + goal.id.slice(0, 8));
  console.log('   4. 暂停目标: /goal pause ' + goal.id.slice(0, 8));
  console.log('   5. 标记完成: /goal complete ' + goal.id.slice(0, 8));
  console.log('   6. 等待系统自动推送每日提醒\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    演示结束！                              ');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('💡 提示:');
  console.log('   这是一个内存演示，数据不会持久化。');
  console.log('   实际系统使用文件存储在 ~/.pi/agent/goal-driven/');
  console.log('   查看完整代码: src/core/goal-driven/');
  console.log('   阅读用户指南: USER_GUIDE.md');
}

// 运行演示
runDemo().catch(console.error);
