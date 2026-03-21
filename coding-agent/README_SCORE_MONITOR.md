# TOEFL模考成绩监控系统

## 📋 系统概述

这是一个专门为TOEFL备考设计的智能成绩监控系统，能够自动检测学习弱项和成绩稳定性，并触发相应的学习计划。

### 核心功能

1. **成绩记录**：记录每次模考的四科成绩（阅读、听力、口语、写作）
2. **单科弱项检测**：当某单项连续两次低于28分时，自动触发"单科强化计划"
3. **总分稳定检测**：当总分连续两次达到108+时，自动触发"考前保温计划"
4. **趋势分析**：自动分析各科和总分的成绩变化趋势
5. **数据导出**：支持将成绩数据和预警信息导出为结构化数据

---

## 🚀 快速开始

### 基本使用

```python
from toefl_score_monitor import ScoreMonitor, ExamScore

# 创建监控器
monitor = ScoreMonitor()

# 添加考试记录
exam = ExamScore(
    date="2026-03-19",
    reading=29,
    listening=28,
    speaking=27,
    writing=28,
    notes="第5次模考"
)
monitor.add_exam(exam)

# 查看成绩摘要
monitor.print_summary()

# 查看预警信息
monitor.print_alerts()

# 查看成绩趋势
monitor.print_trend()
```

### 运行演示

```bash
# 运行完整演示
python3 toefl_score_monitor.py

# 运行使用示例
python3 usage_example.py
```

---

## 📊 触发机制详解

### 1. 单科强化计划触发条件

- **触发条件**：某单项（阅读/听力/口语/写作）连续两次低于28分
- **监测范围**：四科独立监测
- **行动内容**：
  - 每天投入2-3小时专项训练
  - 每天3-4套真题/模拟题
  - 建立错题本，归类错误类型
  - 针对最低分题型集中训练
  - 每周保持2-3次专项测试
  - 目标：短期内突破28分，稳定在28+

**示例**：
```
考试1：口语 25分
考试2：口语 26分
→ 触发【口语单科强化计划】
```

### 2. 考前保温计划触发条件

- **触发条件**：总分连续两次达到108分以上
- **监测范围**：总分
- **行动内容**：
  - 保持手感：每日适量练习
  - 重点维护优势科目
  - 查漏补缺：关注偶尔失分的题型
  - 模考节奏：考前每周1-2次完整模考
  - 心态调整：保持适度紧张感
  - 考前2周时间规划：
    - 第1周：每周2次完整模考 + 各科穿插练习
    - 考前3天：轻量练习为主，回顾错题
    - 考前1天：放松为主，可做半套题保持手感

**示例**：
```
考试1：总分 111分
考试2：总分 112分
→ 触发【考前保温计划】
```

---

## 🔧 配置说明

### 默认阈值

```python
# 单科弱项阈值
WEAK_SUBJECT_THRESHOLD = 28

# 总分稳定阈值
STABLE_SCORE_THRESHOLD = 108

# 连续达标次数要求
CONSECUTIVE_COUNT = 2
```

### 自定义阈值

```python
# 创建监控器后修改
monitor = ScoreMonitor()

# 临时修改阈值
ScoreMonitor.WEAK_SUBJECT_THRESHOLD = 25  # 降低到25分
ScoreMonitor.STABLE_SCORE_THRESHOLD = 100  # 降低到100分
ScoreMonitor.CONSECUTIVE_COUNT = 3  # 要求连续3次

# 恢复默认值
ScoreMonitor.WEAK_SUBJECT_THRESHOLD = 28
ScoreMonitor.STABLE_SCORE_THRESHOLD = 108
```

---

## 📈 数据结构

### ExamScore（单次考试）

```python
@dataclass
class ExamScore:
    date: str           # 考试日期 "2026-03-19"
    reading: int        # 阅读（0-30）
    listening: int      # 听力（0-30）
    speaking: int       # 口语（0-30）
    writing: int        # 写作（0-30）
    notes: str = ""     # 备注

    @property
    def total(self) -> int:  # 总分
        return self.reading + self.listening + self.speaking + self.writing
```

### Alert（预警信息）

```python
@dataclass
class Alert:
    alert_type: AlertType        # 预警类型（单科强化/考前保温）
    subject: Optional[str]       # 弱项科目
    trigger_date: str            # 触发日期
    description: str             # 描述
    action_plan: List[str]       # 行动计划
```

---

## 📤 API 参考

### ScoreMonitor 类

| 方法 | 说明 |
|------|------|
| `add_exam(exam: ExamScore)` | 添加一次模考成绩并检测触发条件 |
| `get_summary() -> dict` | 获取成绩摘要 |
| `get_trend() -> dict` | 获取成绩趋势 |
| `print_summary()` | 打印成绩摘要 |
| `print_trend()` | 打印成绩趋势 |
| `print_alerts()` | 打印所有预警信息 |

### ExamScore 类

| 属性 | 类型 | 说明 |
|------|------|------|
| `date` | str | 考试日期 |
| `reading` | int | 阅读成绩（0-30） |
| `listening` | int | 听力成绩（0-30） |
| `speaking` | int | 口语成绩（0-30） |
| `writing` | int | 写作成绩（0-30） |
| `notes` | str | 备注 |
| `total` | int | 总分（自动计算） |

---

## 💡 使用场景

### 场景1：备考初期监控

```python
monitor = ScoreMonitor()

# 记录初期成绩
monitor.add_exam(ExamScore("2026-01-05", 24, 23, 22, 23))
monitor.add_exam(ExamScore("2026-01-12", 26, 24, 23, 25))

# 查看哪些科目需要强化
monitor.print_alerts()
```

### 场景2：冲刺阶段监控

```python
monitor = ScoreMonitor()

# 记录冲刺阶段成绩
monitor.add_exam(ExamScore("2026-02-16", 29, 29, 27, 28))  # 113分
monitor.add_exam(ExamScore("2026-02-23", 30, 29, 28, 28))  # 115分

# 检查是否达到保温计划触发条件
monitor.print_alerts()
```

### 场景3：成绩数据分析

```python
monitor = ScoreMonitor()

# 添加多次考试记录
for exam_data in exam_list:
    monitor.add_exam(ExamScore(**exam_data))

# 导出数据进行进一步分析
summary = monitor.get_summary()
trend = monitor.get_trend()
```

---

## 📝 示例输出

### 成绩摘要

```
============================================================
📊 成绩监控摘要
============================================================
📈 考试次数：7
📅 最近考试：2026-02-16
📊 最近成绩：阅读30, 听力29, 口语28, 写作28, 总分115
📈 平均总分：107.7
⚠️  预警数量：14
最新预警：考前保温计划
```

### 成绩趋势

```
============================================================
📈 成绩趋势分析
============================================================
总分趋势：↑ 上升 15分

各科趋势：
  - reading   : ↑ 上升 4分
  - listening : ↑ 上升 4分
  - speaking  : ↑ 上升 4分
  - writing   : ↑ 上升 3分
```

### 预警信息

```
【预警 1】单科强化计划
📅 触发日期：2026-02-02
📚 弱项科目：口语
📝 说明：口语连续两次低于28分（24、24分）

💡 行动计划：
   【口语单科强化计划】
   ⚠️  当前状况：口语连续两次得分分别为24、24分
   📊 强化目标：短期内突破28分，稳定在28+
   ...
```

---

## 🎯 最佳实践

1. **定期记录**：每次模考后及时记录成绩，保持数据完整性
2. **关注预警**：及时查看预警信息，执行相应的行动方案
3. **趋势分析**：定期查看成绩趋势，调整学习策略
4. **阈值调整**：根据个人目标调整监控阈值
5. **数据备份**：定期导出数据进行备份

---

## 📚 文件结构

```
.
├── toefl_score_monitor.py   # 主程序
├── usage_example.py         # 使用示例
└── README_SCORE_MONITOR.md  # 本文档
```

---

## ⚠️ 注意事项

1. 分数范围：各科成绩必须在0-30之间
2. 日期格式：建议使用YYYY-MM-DD格式
3. 连续次数：默认要求连续2次满足条件才触发
4. 预警去重：系统会记录所有触发预警，建议定期查看最新预警

---

## 🔮 未来扩展

- [ ] 支持数据持久化（保存到文件/数据库）
- [ ] 支持可视化图表展示
- [ ] 支持邮件/短信预警通知
- [ ] 支持多用户管理
- [ ] 支持与其他学习工具集成

---

## 📄 许可证

MIT License
