# 托福每日高难度词汇复习与语境应用系统

> 基于艾宾浩斯遗忘曲线的科学词汇记忆方案
>
> 目标：每日复习并背诵托福 Subject 3000 / TPO 高频核心词汇
> 重点：词汇在句子中的理解和同义替换

---

## 📁 文件结构

```
toefl_vocabulary_system/
├── toefl_vocabulary_daily_review.md    # 完整词汇复习指南（主文档）
├── data/
│   ├── toefl_vocabulary_anki.csv       # Anki导入格式词汇表（53个核心词）
│   └── vocabulary_review_schedule.json # 自动生成的90天复习计划
├── templates/
│   └── daily_vocabulary_checklist.md   # 每日打卡模板
├── scripts/
│   └── generate_daily_vocabulary.py   # Python脚本：生成每日计划
└── output/
    └── daily_checklist_2026-03-19.md  # 今日打卡清单（自动生成）
```

---

## 🚀 快速开始

### 方法1：使用Python脚本（推荐）

```bash
# 进入项目目录
cd /Users/bytedance/Documents/claude_code/goal_driven_agent/coding-agent

# 生成今日打卡清单
python3 scripts/generate_daily_vocabulary.py

# 查看生成的文件
cat output/daily_checklist_2026-03-19.md
```

**输出示例：**
```
🚀 托福每日词汇复习生成器
✅ 成功加载 53 个词汇
📅 生成90天复习计划...
✅ 复习计划已导出到: data/vocabulary_review_schedule.json
📝 生成今日打卡清单...
✅ 每日打卡清单已导出到: output/daily_checklist_2026-03-19.md
📊 获取本周复习统计...
第1周复习统计：
  - 新学词汇：53词
  - 复习词汇：159词
  - 复习日期：2026-03-19 至 2026-03-25
```

---

### 方法2：使用Anki（强烈推荐）

#### 步骤1：导入词汇表到Anki

1. 下载并安装 [Anki](https://apps.ankiweb.net/)
2. 打开Anki，点击"文件" → "导入"
3. 选择 `data/toefl_vocabulary_anki.csv`
4. 配置导入选项：
   - 字段映射：word（问题），chinese_definition+english_definition+synonyms（答案）
   - 卡片类型：基本
   - 牌组：新建"托福3000词"

#### 步骤2：自定义卡片模板

在Anki中编辑卡片模板，使用以下格式：

**正面：**
```
单词：{{word}}
词性：{{pos}}
```

**背面：**
```
中文释义：{{chinese_definition}}
英文释义：{{english_definition}}

同义词：{{synonyms}}
反义词：{{antonyms}}

语境例句：
{{context_sentence}}

TPO出现频率：{{tpo_frequency}}
```

#### 步骤3：设置复习间隔

在Anki中设置符合艾宾浩斯遗忘曲线的复习间隔：
- 首次：10分钟
- 第2次：30分钟
- 第3次：12小时
- 第4次：1天
- 第5次：2天
- 第6次：4天
- 第7次：7天
- 第8次：15天
- 第9次：30天

---

### 方法3：手动使用打卡模板

1. 打开 `templates/daily_vocabulary_checklist.md`
2. 复制内容到你的笔记软件（Notion、Obsidian、Markdown编辑器等）
3. 每天填写打卡内容
4. 按照艾宾浩斯曲线进行复习

---

## 📚 核心词汇分类

### A级词汇（必须掌握）- 16个核心词
- abundant, accommodate, acknowledge, acquire, adapt, advocate
- aesthetic, aggregate, ambiguous, anticipate, articulate, assess
- assimilate, attribute, diverse, eligible, enhance, explicit

**学习重点：**
- 每日必学，优先级最高
- 掌握英文释义和同义词
- 能够在听说读写中熟练运用

### B级词汇（重点掌握）- 11个高级词
- arbitrary, articulate, assess, assimilate, attribute, benevolent
- burdensome, contemplate, converge, deplete, derive

**学习重点：**
- 同义替换训练
- 语境应用练习
- 学科场景识别

### C级词汇（拓展掌握）- 26个场景词
- eccentric, ecosystem, elaborate, eliminate, empirical, endemic
- epidemic, erroneous, evolve, exaggerate, hypothesis, innovative
- phenomenon, simulate, civilization, colonial, democracy
- revolution, sovereign, perspective, composition, authentic
- symbolic, incentive, competitive, monopoly, revenue, prosperity

**学习重点：**
- 按学科分类记忆（科学、历史、艺术、商业）
- TPO场景应用
- 阅读听力词汇识别

---

## 🔄 艾宾浩斯遗忘曲线复习计划

### 复习时间表

| 轮次 | 间隔 | 内容 | 记忆保持率 |
|------|------|------|------------|
| 第1轮 | 30分钟后 | 刚学习的25个单词 | 85% |
| 第2轮 | 12小时后 | 当日所有新词 | 75% |
| 第3轮 | 1天后 | 前日学习单词 | 60% |
| 第4轮 | 2天后 | 第1-3天单词 | 50% |
| 第5轮 | 4天后 | 第1-5天单词 | 40% |
| 第6轮 | 7天后 | 第1周单词 | 30% |
| 第7轮 | 15天后 | 第1-2周单词 | 25% |
| 第8轮 | 30天后 | 第1月单词 | 20% |

### 每日复习安排

#### 🌅 早晨复习（07:00-07:30，30分钟）
```
✅ 复习第2轮（昨日新词）- 10分钟
✅ 复习第3轮（前日新词）- 10分钟
✅ 复习第4轮（3-5天前单词）- 10分钟
```

#### ☀️ 上午学习（09:00-10:00，60分钟）
```
✅ 学习A级新词（10词）- 20分钟
✅ 学习B级新词（10词）- 20分钟
✅ 学习C级新词（5词）- 15分钟
✅ 第1轮即时复习 - 5分钟
```

#### 🌞 下午复习（15:00-15:30，30分钟）
```
✅ 复习第5轮（4-7天前单词）- 句子填空
✅ 复习第6轮（8-14天前单词）- 造句练习
✅ 复习第7轮（15-29天前单词）- 写作应用
```

#### 🌙 晚间复习（21:00-21:30，30分钟）
```
✅ 第2轮复习（当日新词，12小时后）- 15分钟
✅ 当日单词综合测试 - 15分钟
```

---

## 🎯 同义替换专项训练

### 训练方法

#### 1. 同义词配对练习
```markdown
原词：abundant
同义词：plentiful, ample, copious

例句：
The abundant rainfall... → The plentiful rainfall...
```

#### 2. 句子替换练习
**原句：**
> The abundant rainfall this year has led to a plentiful harvest.

**替换版本：**
> The **ample** / **copious** rainfall this year has led to a **bountiful** / **rich** harvest.

#### 3. TPO风格题型练习

**阅读理解词汇题：**
> The word "abundant" in the passage is closest in meaning to:
>
> A. scarce
> B. plentiful  ✓
> C. moderate
> D. insufficient

**句子简化题：**
> The company anticipated that the new technology would enhance productivity significantly.
>
> 简化后：The company **predicted** that the new technology would **improve** productivity **greatly**.

---

## 📊 进度追踪

### 每日记录
| 日期 | 新词 | 复习 | 同义替换 | 造句 | 完成率 |
|------|------|------|----------|------|--------|
| 3/19 | 25 | 100 | 10 | 5 | 100% |
| 3/20 | 25 | 125 | 10 | 5 |  |
| 3/21 | 25 | 150 | 10 | 5 |  |

### 每周评估
| 指标 | Week 1 | Week 2 | Week 3 | Week 4 |
|------|--------|--------|--------|--------|
| 新词掌握率 | ≥85% | ≥85% | ≥85% | ≥85% |
| 同义词准确率 | ≥80% | ≥85% | ≥90% | ≥95% |
| 语境应用准确率 | ≥75% | ≥80% | ≥85% | ≥90% |

### 阶段性目标

**第1个月：**
- ✅ 掌握A级词汇500个
- ✅ 熟悉B级词汇300个
- ✅ 完成同义替换训练100组
- ✅ 造句练习200句

**第2个月：**
- ✅ 累计掌握词汇1200个
- ✅ TPO阅读词汇题正确率≥80%
- ✅ 听力学科词汇识别率≥70%

**第3个月：**
- ✅ 累计掌握词汇2000个
- ✅ TPO词汇题正确率≥90%
- ✅ 学科分类词汇全面掌握

---

## 🛠️ 实用工具推荐

| 工具 | 用途 | 推荐指数 |
|------|------|----------|
| **Anki** | 艾宾浩斯记忆，完全自定义 | ⭐⭐⭐⭐⭐ |
| **Quizlet** | 游戏化学习，共享词库 | ⭐⭐⭐⭐ |
| **扇贝单词** | 艾宾浩斯曲线，打卡机制 | ⭐⭐⭐⭐ |
| **墨墨背单词** | 个性化复习计划 | ⭐⭐⭐⭐ |
| **欧路词典** | 生词本功能强大 | ⭐⭐⭐⭐⭐ |

---

## 💡 高级技巧

### 1. 词根词缀记忆法
```
bene- (好) + volent (意愿) = benevolent (仁慈的)
chron- (时间) + logical = chronological (按时间顺序的)
```

### 2. 学科分类记忆法
- 科学类：hypothesis, empirical, simulate
- 历史类：civilization, colonial, revolution
- 艺术类：aesthetic, composition, perspective
- 商业类：incentive, competitive, revenue

### 3. 主题式记忆网络
```
            abundant (丰富的)
                ↓
            acquire (获得)
                ↓
      ┌─────────┴─────────┐
      ↓                   ↓
adapt (适应)        assess (评估)
      ↓                   ↓
advocate (提倡)     enhance (提高)
      └─────────┬─────────┘
                ↓
      Environmental Conservation
```

---

## ❓ 常见问题

### Q1: 记了又忘怎么办？
**A:** 检查复习间隔是否符合艾宾浩斯曲线，增加语境理解，使用多种感官参与记忆。

### Q2: 同义词混淆怎么办？
**A:** 学习每个同义词的细微差别，通过大量例句理解使用场景，进行同义替换专项训练。

### Q3: 认识单词但不会用怎么办？
**A:** 大量朗读和背诵优质例句，进行造句练习，在写作中有意识地使用新词。

### Q4: 学习进度慢怎么办？
**A:** 调整每日学习量，确保可持续性；利用碎片时间复习；使用番茄工作法提高专注度。

---

## 📞 技术支持

### Python脚本使用
```bash
# 查看帮助信息
python3 scripts/generate_daily_vocabulary.py --help

# 生成特定日期的打卡清单
python3 scripts/generate_daily_vocabulary.py --date 2026-03-20

# 自定义每日新词数量
python3 scripts/generate_daily_vocabulary.py --daily-words 30

# 自定义复习周期
python3 scripts/generate_daily_vocabulary.py --duration 60
```

### 扩展词汇表
编辑 `data/toefl_vocabulary_anki.csv`，添加新词汇：

```csv
word,pos,chinese_definition,english_definition,synonyms,antonyms,context_sentence,tpo_frequency,category,level
your_word,adj.,你的释义,your definition,synonym1;synonym2,antonym1;antonym2,"Your example sentence.",frequency,Category,Level
```

---

## 🎉 开始使用

### 今日任务清单

- [ ] ✅ 阅读本文档，了解复习系统
- [ ] ✅ 运行Python脚本，生成今日打卡清单
- [ ] ✅ 导入词汇表到Anki（可选但推荐）
- [ ] ✅ 按照每日计划开始学习
- [ ] ✅ 完成第一次打卡

**记住：每天30分钟，坚持就是胜利！** 💪

---

## 📄 文档索引

| 文档 | 说明 |
|------|------|
| **toefl_vocabulary_daily_review.md** | 完整词汇复习指南（详细版） |
| **README_TOEFL_VOCABULARY.md** | 本文档（快速开始指南） |
| **templates/daily_vocabulary_checklist.md** | 每日打卡模板 |
| **data/toefl_vocabulary_anki.csv** | Anki导入格式词汇表 |
| **data/vocabulary_review_schedule.json** | 90天复习计划（自动生成） |

---

**祝您词汇学习顺利，托福考试成功！** 🚀

*创建日期：2026年3月19日*
*版本：v1.0*
