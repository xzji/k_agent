#!/usr/bin/env python3
"""
托福每日词汇复习生成器
基于艾宾浩斯遗忘曲线生成每日复习计划
"""

import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
import random


class VocabularyReviewPlanner:
    """词汇复习计划生成器"""

    # 艾宾浩斯遗忘曲线复习间隔（天）
    EBBINGHAUS_INTERVALS = [0, 1, 2, 4, 7, 15, 30]

    def __init__(self, vocabulary_file=None):
        """初始化复习计划生成器

        Args:
            vocabulary_file: 词汇表文件路径（CSV格式）
        """
        if vocabulary_file is None:
            vocabulary_file = Path(__file__).parent.parent / "data" / "toefl_vocabulary_anki.csv"

        self.vocabulary_file = Path(vocabulary_file)
        self.vocabulary = []
        self.review_schedule = {}

        # 加载词汇表
        self._load_vocabulary()

    def _load_vocabulary(self):
        """加载词汇表"""
        try:
            with open(self.vocabulary_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                self.vocabulary = [row for row in reader]
            print(f"✅ 成功加载 {len(self.vocabulary)} 个词汇")
        except FileNotFoundError:
            print(f"❌ 词汇表文件未找到: {self.vocabulary_file}")
            raise
        except Exception as e:
            print(f"❌ 加载词汇表失败: {e}")
            raise

    def generate_daily_schedule(self, start_date=None, daily_new_words=25, duration_days=90):
        """生成每日复习计划

        Args:
            start_date: 开始日期（默认为今天）
            daily_new_words: 每日新词数量（默认25个）
            duration_days: 复习周期天数（默认90天）

        Returns:
            每日复习计划字典
        """
        if start_date is None:
            start_date = datetime.now()

        schedule = {}
        word_index = 0  # 当前学习到的词汇索引

        for day in range(duration_days):
            current_date = start_date + timedelta(days=day)
            date_str = current_date.strftime('%Y-%m-%d')

            # 计算当天需要复习的词汇
            review_words = []

            # 添加新词
            new_words_end = min(word_index + daily_new_words, len(self.vocabulary))
            new_words = self.vocabulary[word_index:new_words_end]

            # 为新词添加复习轮次信息
            for word in new_words:
                word['first_learned'] = date_str
                word['review_rounds'] = {0: date_str}  # 第0轮（初次学习）
                review_words.append({
                    'word': word,
                    'round': 0,
                    'action': 'new'
                })

            word_index = new_words_end

            # 计算之前需要复习的词汇
            for interval in self.EBBINGHAUS_INTERVALS:
                if interval == 0:
                    continue  # 跳过初次学习

                review_date = current_date - timedelta(days=interval)
                review_date_str = review_date.strftime('%Y-%m-%d')

                # 查找在review_date首次学习的词汇
                for i in range(word_index):
                    word = self.vocabulary[i]
                    if 'first_learned' in word and word['first_learned'] == review_date_str:
                        # 检查是否已经复习过这个轮次
                        if interval not in word.get('review_rounds', {}):
                            word['review_rounds'][interval] = date_str
                            review_words.append({
                                'word': word,
                                'round': interval,
                                'action': 'review'
                            })

            # 按复习轮次分类
            schedule[date_str] = {
                'new_words': [w for w in review_words if w['action'] == 'new'],
                'review_words': [w for w in review_words if w['action'] == 'review'],
                'by_round': {}
            }

            # 按复习轮次分类统计
            for word_info in review_words:
                round_num = word_info['round']
                if round_num not in schedule[date_str]['by_round']:
                    schedule[date_str]['by_round'][round_num] = []
                schedule[date_str]['by_round'][round_num].append(word_info['word'])

            # 统计当天数据
            schedule[date_str]['summary'] = {
                'total_new_words': len([w for w in review_words if w['action'] == 'new']),
                'total_review_words': len([w for w in review_words if w['action'] == 'review']),
                'total_words': len(review_words)
            }

        self.review_schedule = schedule
        return schedule

    def generate_daily_checklist(self, date_str=None):
        """生成每日打卡清单

        Args:
            date_str: 日期字符串（YYYY-MM-DD格式）

        Returns:
            每日打卡清单文本
        """
        if date_str is None:
            date_str = datetime.now().strftime('%Y-%m-%d')

        if date_str not in self.review_schedule:
            # 如果没有生成计划，先生成计划
            self.generate_daily_schedule()

        day_schedule = self.review_schedule[date_str]

        checklist = f"""# 【托福词汇每日打卡】

---

## 📅 日期：{date_str}
## 学习第 {self._calculate_day_number(date_str)} 天

---

## 📊 今日学习数据

| 项目 | 目标 | 实际 | 完成率 |
|------|------|------|--------|
| 📚 新学词汇 | 25词 | ___词 | ___% |
| 🔄 复习词汇 | 100+词 | ___词 | ___% |
| 📝 同义替换 | 10组 | ___组 | ___% |
| ✍️ 造句练习 | 5句 | ___句 | ___% |
| 🎯 综合测试 | 5题 | ___题 | ___% |

---

## 🌅 早晨复习（07:00-07:30，30分钟）

### 第2轮复习（昨日新词，12小时后）
- [ ] 快速浏览词卡，回忆词义
- [ ] 正确率：___/25

### 第3轮复习（前日新词，24小时后）
- [ ] 朗读语境例句
- [ ] 理解准确率：___/25

### 第4轮复习（3-5天前单词）
- [ ] 同义替换练习
- [ ] 准确率：___/___

---

## ☀️ 上午学习（09:00-10:00，60分钟）

### A级新词学习（10词）
"""

        # 添加新词
        new_words = day_schedule.get('new_words', [])[:25]  # 限制25个
        for i, word_info in enumerate(new_words[:10], 1):
            word = word_info['word']
            checklist += f"""| {i}. {word['word']} | {word['pos']} | {word['chinese_definition']} | {word['english_definition']} | {word['synonyms']} | ⭐⭐⭐⭐⭐ |
"""

        checklist += """

### B级新词学习（10词）
"""

        for i, word_info in enumerate(new_words[10:20], 1):
            word = word_info['word']
            checklist += f"""| {i}. {word['word']} | {word['pos']} | {word['chinese_definition']} | {word['context_sentence']} | {word.get('category', 'N/A')} | ⭐⭐⭐⭐⭐ |
"""

        checklist += """

### C级新词学习（5词）
"""

        for i, word_info in enumerate(new_words[20:25], 1):
            word = word_info['word']
            checklist += f"""| {i}. {word['word']} | {word['pos']} | {word['chinese_definition']} | {word.get('category', 'N/A')} | {word.get('level', 'N/A')} | ⭐⭐⭐⭐⭐ |
"""

        checklist += f"""

### 第1轮即时复习（学习后30分钟）
- [ ] 快速回忆所有新词
- [ ] 正确率：___/{len(new_words)}

---

## 🌞 下午复习（15:00-15:30，30分钟）

### 复习词汇统计
- [ ] 第4轮（3-5天前）：{len(day_schedule.get('by_round', {}).get(4, []))}词
- [ ] 第5轮（7天前）：{len(day_schedule.get('by_round', {}).get(7, []))}词
- [ ] 第6轮（15天前）：{len(day_schedule.get('by_round', {}).get(15, []))}词

### 句子填空练习
"""

        # 添加句子填空练习（从复习词汇中随机选择）
        review_words = day_schedule.get('review_words', [])
        fill_words = random.sample(review_words, min(5, len(review_words))) if review_words else []

        for i, word_info in enumerate(fill_words, 1):
            word = word_info['word']
            checklist += f"{i}. The sentence with '___' should use the word '{word['word']}'.\n"

        checklist += """

---

## 🌙 晚间复习（21:00-21:30，30分钟）

### 第2轮复习（当日新词）
- [ ] 词义+同义词回忆
- [ ] 正确率：___/25

### 当日单词综合测试
1. 听写测试：___/25 正确
2. 英译中：___/25 正确
3. 中译英：___/25 正确
4. 综合得分：___/100

---

## 📝 同义替换练习（10组）

| 序号 | 原词 | 同义词1 | 同义词2 | 同义词3 | 掌握度 |
|------|------|---------|---------|---------|--------|
"""

        # 添加同义词练习
        synonym_words = random.sample(new_words, min(10, len(new_words)))
        for i, word_info in enumerate(synonym_words, 1):
            word = word_info['word']
            synonyms = word['synonyms'].split(';')[:3]
            checklist += f"| {i}. | {word['word']} | {synonyms[0] if len(synonyms) > 0 else ''} | {synonyms[1] if len(synonyms) > 1 else ''} | {synonyms[2] if len(synonyms) > 2 else ''} | ⭐⭐⭐⭐⭐ |\n"

        checklist += """

---

## ✍️ 造句练习（5句）

使用今日新学的5个词汇各造一个句子：

1. **[词汇]**: __________________________________________________

2. **[词汇]**: __________________________________________________

3. **[词汇]**: __________________________________________________

4. **[词汇]**: __________________________________________________

5. **[词汇]**: __________________________________________________

---

## 🎯 语境应用练习

### 句子改写（将原句中的词汇替换为同义词）

**原句1：**
"""

        # 添加语境改写练习
        if len(new_words) >= 2:
            word1 = new_words[0]['word']
            word2 = new_words[1]['word']
            checklist += f"> The {word1['word']} rainfall this year has led to a {word2['word']} harvest.\n\n**改写：**\n> The __________ rainfall this year has led to a __________ harvest.\n\n"

        checklist += """
---

## 📈 今日学习总结

### ⭐ 今日收获
- [ ] 掌握了___个新词汇
- [ ] 熟悉了___组同义词
- [ ] 完成___句造句练习
- [ ] 最有成就感的单词：________________

### 🤔 遇到的困难
- [ ] 记忆最困难的单词：________________
- [ ] 最容易混淆的同义词：________________
- [ ] 需要改进的地方：________________

### 💡 学习心得
（记录今天的学习感悟、技巧发现等）





---

## 🎯 明日计划

### 学习目标
- [ ] A级新词：___词
- [ ] B级新词：___词
- [ ] C级新词：___词
- [ ] 重点复习：________________

---

## 💪 鼓励语

- 词汇积累，滴水成海！
- 每天进步一点点，成功就在眼前！
- 坚持就是胜利，你一定能做到！
- 今日的积累，是明日成功的基石！

---

**今日打卡完成！明天继续加油！** 🎉
"""

        return checklist

    def _calculate_day_number(self, date_str):
        """计算第几天"""
        if not self.review_schedule:
            self.generate_daily_schedule()

        sorted_dates = sorted(self.review_schedule.keys())
        try:
            return sorted_dates.index(date_str) + 1
        except ValueError:
            return 1

    def export_schedule_to_json(self, output_file=None):
        """导出复习计划到JSON文件

        Args:
            output_file: 输出文件路径
        """
        if not self.review_schedule:
            self.generate_daily_schedule()

        if output_file is None:
            output_file = Path(__file__).parent.parent / "data" / "vocabulary_review_schedule.json"

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.review_schedule, f, ensure_ascii=False, indent=2)

        print(f"✅ 复习计划已导出到: {output_path}")

    def export_daily_checklist(self, date_str=None, output_file=None):
        """导出每日打卡清单

        Args:
            date_str: 日期字符串（YYYY-MM-DD格式）
            output_file: 输出文件路径
        """
        checklist = self.generate_daily_checklist(date_str)

        if output_file is None:
            if date_str is None:
                date_str = datetime.now().strftime('%Y-%m-%d')
            output_file = Path(__file__).parent.parent / "output" / f"daily_checklist_{date_str}.md"

        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(checklist)

        print(f"✅ 每日打卡清单已导出到: {output_path}")

    def get_weekly_summary(self, week_number):
        """获取周复习总结

        Args:
            week_number: 周数（从1开始）

        Returns:
            周总结字典
        """
        if not self.review_schedule:
            self.generate_daily_schedule()

        start_day = (week_number - 1) * 7
        end_day = week_number * 7
        sorted_dates = sorted(self.review_schedule.keys())

        if start_day >= len(sorted_dates):
            return None

        week_dates = sorted_dates[start_day:end_day]
        summary = {
            'week': week_number,
            'dates': week_dates,
            'total_new_words': 0,
            'total_review_words': 0,
            'daily_stats': {}
        }

        for date_str in week_dates:
            day_summary = self.review_schedule[date_str]['summary']
            summary['total_new_words'] += day_summary['total_new_words']
            summary['total_review_words'] += day_summary['total_review_words']
            summary['daily_stats'][date_str] = day_summary

        return summary


def main():
    """主函数 - 演示使用方法"""
    print("🚀 托福每日词汇复习生成器\n")

    # 创建复习计划生成器
    planner = VocabularyReviewPlanner()

    # 生成90天复习计划
    print("📅 生成90天复习计划...")
    schedule = planner.generate_daily_schedule(
        start_date=None,  # 从今天开始
        daily_new_words=25,  # 每天学习25个新词
        duration_days=90  # 90天周期
    )

    # 导出复习计划到JSON
    planner.export_schedule_to_json()

    # 生成今天的打卡清单
    print("\n📝 生成今日打卡清单...")
    planner.export_daily_checklist()

    # 获取本周总结
    print("\n📊 获取本周复习总结...")
    week_summary = planner.get_weekly_summary(1)
    if week_summary:
        print(f"第{week_summary['week']}周复习统计：")
        print(f"  - 新学词汇：{week_summary['total_new_words']}词")
        print(f"  - 复习词汇：{week_summary['total_review_words']}词")
        print(f"  - 复习日期：{week_summary['dates'][0]} 至 {week_summary['dates'][-1]}")

    print("\n✅ 完成！")


if __name__ == "__main__":
    main()
