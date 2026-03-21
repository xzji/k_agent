"""
TOEFL模考成绩监控与弱项触发机制系统
功能：
1. 监控每次模考成绩
2. 单科弱项检测：连续两次低于28分触发"单科强化计划"
3. 总分达标检测：连续两次108+触发"考前保温计划"
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from enum import Enum


class AlertType(Enum):
    """预警类型"""
    WEAK_SUBJECT = "单科强化计划"
    SCORE_STABLE = "考前保温计划"


@dataclass
class ExamScore:
    """单次模考成绩"""
    date: str  # 考试日期
    reading: int  # 阅读（0-30）
    listening: int  # 听力（0-30）
    speaking: int  # 口语（0-30）
    writing: int  # 写作（0-30）
    notes: str = ""  # 备注

    @property
    def total(self) -> int:
        """总分"""
        return self.reading + self.listening + self.speaking + self.writing

    @property
    def subjects(self) -> Dict[str, int]:
        """各科成绩字典"""
        return {
            "reading": self.reading,
            "listening": self.listening,
            "speaking": self.speaking,
            "writing": self.writing
        }

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "date": self.date,
            "reading": self.reading,
            "listening": self.listening,
            "speaking": self.speaking,
            "writing": self.writing,
            "total": self.total,
            "notes": self.notes
        }


@dataclass
class Alert:
    """预警信息"""
    alert_type: AlertType
    subject: Optional[str]  # 弱项科目（仅单科强化时）
    trigger_date: str
    description: str
    action_plan: List[str]

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "type": self.alert_type.value,
            "subject": self.subject,
            "trigger_date": self.trigger_date,
            "description": self.description,
            "action_plan": self.action_plan
        }


class ScoreMonitor:
    """成绩监控器"""

    # 单科弱项阈值
    WEAK_SUBJECT_THRESHOLD = 28

    # 总分稳定阈值
    STABLE_SCORE_THRESHOLD = 108

    # 连续达标次数要求
    CONSECUTIVE_COUNT = 2

    def __init__(self):
        self.exams: List[ExamScore] = []
        self.alerts: List[Alert] = []

    def add_exam(self, exam: ExamScore) -> None:
        """添加一次模考成绩并检测触发条件"""
        self.exams.append(exam)
        self._check_triggers(exam)

    def _check_triggers(self, latest_exam: ExamScore) -> None:
        """检查是否触发预警"""
        if len(self.exams) < self.CONSECUTIVE_COUNT:
            return

        # 获取最近两次考试
        recent_exams = self.exams[-self.CONSECUTIVE_COUNT:]

        # 检查单科弱项
        self._check_weak_subject(recent_exams)

        # 检查总分稳定
        self._check_stable_score(recent_exams)

    def _check_weak_subject(self, recent_exams: List[ExamScore]) -> None:
        """检查单科弱项：连续两次低于28分"""
        subjects = ["reading", "listening", "speaking", "writing"]
        subject_names = {
            "reading": "阅读",
            "listening": "听力",
            "speaking": "口语",
            "writing": "写作"
        }

        for subject in subjects:
            scores = [getattr(exam, subject) for exam in recent_exams]
            # 检查是否连续低于阈值
            if all(score < self.WEAK_SUBJECT_THRESHOLD for score in scores):
                alert = Alert(
                    alert_type=AlertType.WEAK_SUBJECT,
                    subject=subject_names[subject],
                    trigger_date=recent_exams[-1].date,
                    description=f"{subject_names[subject]}连续两次低于{self.WEAK_SUBJECT_THRESHOLD}分（{scores[0]}、{scores[1]}分）",
                    action_plan=self._get_weak_subject_plan(subject_names[subject], scores)
                )
                self.alerts.append(alert)

    def _check_stable_score(self, recent_exams: List[ExamScore]) -> None:
        """检查总分稳定：连续两次108+"""
        totals = [exam.total for exam in recent_exams]

        if all(total >= self.STABLE_SCORE_THRESHOLD for total in totals):
            alert = Alert(
                alert_type=AlertType.SCORE_STABLE,
                subject=None,
                trigger_date=recent_exams[-1].date,
                description=f"总分连续两次稳定在{self.STABLE_SCORE_THRESHOLD}+（{totals[0]}、{totals[1]}分）",
                action_plan=self._get_stable_score_plan(totals)
            )
            self.alerts.append(alert)

    def _get_weak_subject_plan(self, subject: str, scores: List[int]) -> List[str]:
        """生成单科强化计划"""
        return [
            f"【{subject}单科强化计划】",
            f"⚠️  当前状况：{subject}连续两次得分分别为{scores[0]}、{scores[1]}分",
            f"📊 强化目标：短期内突破{self.WEAK_SUBJECT_THRESHOLD}分，稳定在28+",
            f"📅 时间安排：每天投入2-3小时专项训练",
            "",
            "🔧 具体措施：",
            f"1. {subject}专项练习：每天完成3-4套真题/模拟题",
            f"2. 错题分析：建立错题本，归类错误类型",
            f"3. 薄弱点突破：针对最低分题型进行集中训练",
            f"4. 模考频率：每周保持2-3次{subject}专项测试",
            f"5. 复盘总结：每次测试后详细分析失分原因",
            "",
            "📈 进度跟踪：",
            f"- 目标：下次模考{subject}达到28分",
            f"- 复盘周期：每3天一次小测，每周一次大测"
        ]

    def _get_stable_score_plan(self, scores: List[int]) -> List[str]:
        """生成考前保温计划"""
        return [
            "【考前保温计划】",
            f"✅ 当前状况：总分连续两次稳定在{self.STABLE_SCORE_THRESHOLD}+（{scores[0]}、{scores[1]}分）",
            f"🎯 考前目标：保持状态，力争突破110+",
            "",
            "🔥 保温策略：",
            "1. 保持手感：每日适量练习，避免长时间停考",
            "2. 重点维护：针对当前优势科目保持训练强度",
            "3. 查漏补缺：关注偶尔失分的题型",
            "4. 模考节奏：考前每周1-2次完整模考",
            "5. 心态调整：保持适度紧张感，避免过度放松",
            "",
            "⏰ 时间分配（考前2周）：",
            "- 第1周：每周2次完整模考 + 各科穿插练习",
            "- 考前3天：轻量练习为主，回顾错题",
            "- 考前1天：放松为主，可做半套题保持手感",
            "",
            "💪 稳定优势：",
            "- 阅读/听力保持高分策略：控制时间，避免粗心",
            "- 口语/写作保持稳定输出：关注模板熟练度"
        ]

    def get_summary(self) -> dict:
        """获取成绩摘要"""
        if not self.exams:
            return {"message": "暂无考试记录"}

        latest = self.exams[-1]
        return {
            "exam_count": len(self.exams),
            "latest_date": latest.date,
            "latest_scores": {
                "reading": latest.reading,
                "listening": latest.listening,
                "speaking": latest.speaking,
                "writing": latest.writing,
                "total": latest.total
            },
            "average_total": sum(e.total for e in self.exams) / len(self.exams),
            "alert_count": len(self.alerts),
            "latest_alert": self.alerts[-1].to_dict() if self.alerts else None
        }

    def get_trend(self) -> dict:
        """获取成绩趋势"""
        if len(self.exams) < 2:
            return {"message": "需要至少2次考试记录才能分析趋势"}

        subjects = ["reading", "listening", "speaking", "writing"]

        trend = {
            "total_trend": self._calc_trend([e.total for e in self.exams]),
            "subject_trends": {}
        }

        for subject in subjects:
            scores = [getattr(e, subject) for e in self.exams]
            trend["subject_trends"][subject] = self._calc_trend(scores)

        return trend

    def _calc_trend(self, scores: List[int]) -> str:
        """计算趋势"""
        if len(scores) < 2:
            return "数据不足"

        diff = scores[-1] - scores[0]
        if diff > 0:
            return f"↑ 上升 {diff}分"
        elif diff < 0:
            return f"↓ 下降 {abs(diff)}分"
        else:
            return "→ 持平"

    def print_alerts(self) -> None:
        """打印所有预警"""
        if not self.alerts:
            print("✨ 暂无预警信息")
            return

        print("\n" + "="*60)
        print("⚠️  预警信息汇总")
        print("="*60)

        for i, alert in enumerate(self.alerts, 1):
            print(f"\n【预警 {i}】{alert.alert_type.value}")
            print(f"📅 触发日期：{alert.trigger_date}")
            if alert.subject:
                print(f"📚 弱项科目：{alert.subject}")
            print(f"📝 说明：{alert.description}")
            print("\n💡 行动计划：")
            for line in alert.action_plan:
                print(f"   {line}")

    def print_summary(self) -> None:
        """打印成绩摘要"""
        summary = self.get_summary()
        print("\n" + "="*60)
        print("📊 成绩监控摘要")
        print("="*60)
        print(f"📈 考试次数：{summary['exam_count']}")
        print(f"📅 最近考试：{summary['latest_date']}")
        print(f"📊 最近成绩：阅读{summary['latest_scores']['reading']}, "
              f"听力{summary['latest_scores']['listening']}, "
              f"口语{summary['latest_scores']['speaking']}, "
              f"写作{summary['latest_scores']['writing']}, "
              f"总分{summary['latest_scores']['total']}")
        print(f"📈 平均总分：{summary['average_total']:.1f}")
        print(f"⚠️  预警数量：{summary['alert_count']}")

        if summary['latest_alert']:
            print(f"\n最新预警：{summary['latest_alert']['type']}")

    def print_trend(self) -> None:
        """打印成绩趋势"""
        trend = self.get_trend()
        print("\n" + "="*60)
        print("📈 成绩趋势分析")
        print("="*60)

        if "message" in trend:
            print(trend["message"])
            return

        print(f"总分趋势：{trend['total_trend']}")
        print("\n各科趋势：")
        for subject, t in trend['subject_trends'].items():
            print(f"  - {subject:10s}: {t}")


def demo():
    """演示示例"""
    print("="*60)
    print("TOEFL模考成绩监控系统")
    print("="*60)

    monitor = ScoreMonitor()

    # 模拟考试记录
    exam_records = [
        ExamScore("2026-01-05", 26, 25, 24, 25, "首次模考"),
        ExamScore("2026-01-12", 27, 26, 23, 26, "阅读进步"),
        ExamScore("2026-01-19", 28, 27, 25, 27, "听力仍需加强"),
        ExamScore("2026-01-26", 29, 27, 24, 27, "口语连续两次低于28"),
        ExamScore("2026-02-02", 30, 29, 24, 28, "口语触发单科强化"),
        ExamScore("2026-02-09", 29, 29, 27, 27, "总分稳定108+"),
        ExamScore("2026-02-16", 30, 29, 28, 28, "总分稳定触发保温计划"),
    ]

    print("\n📝 添加考试记录...")
    for exam in exam_records:
        monitor.add_exam(exam)
        print(f"  {exam.date}: R{exam.reading} L{exam.listening} S{exam.speaking} W{exam.writing} = {exam.total}")

    # 打印摘要
    monitor.print_summary()

    # 打印趋势
    monitor.print_trend()

    # 打印预警
    monitor.print_alerts()

    return monitor


if __name__ == "__main__":
    monitor = demo()
