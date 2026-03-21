"""
TOEFL成绩监控系统 - 测试脚本
验证各项功能是否正常工作
"""

from toefl_score_monitor import ScoreMonitor, ExamScore, AlertType


def test_weak_subject_trigger():
    """测试单科弱项触发"""
    print("\n【测试1】单科弱项触发测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    # 测试口语连续两次低于28分
    monitor.add_exam(ExamScore("2026-03-01", 29, 28, 26, 28))
    monitor.add_exam(ExamScore("2026-03-08", 30, 29, 25, 28))

    # 验证是否触发
    weak_subject_alerts = [a for a in monitor.alerts if a.alert_type == AlertType.WEAK_SUBJECT]

    assert len(weak_subject_alerts) > 0, "应该触发单科弱项预警"
    assert weak_subject_alerts[-1].subject == "口语", "应该是口语弱项"

    print("✅ 口语连续两次低于28分，成功触发单科强化计划")
    print(f"   触发科目：{weak_subject_alerts[-1].subject}")
    print(f"   触发日期：{weak_subject_alerts[-1].trigger_date}")


def test_stable_score_trigger():
    """测试总分稳定触发"""
    print("\n【测试2】总分稳定触发测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    # 测试总分连续两次108+
    monitor.add_exam(ExamScore("2026-03-01", 29, 29, 27, 27))  # 112
    monitor.add_exam(ExamScore("2026-03-08", 28, 28, 27, 28))  # 111

    # 验证是否触发
    stable_alerts = [a for a in monitor.alerts if a.alert_type == AlertType.SCORE_STABLE]

    assert len(stable_alerts) > 0, "应该触发总分稳定预警"

    print("✅ 总分连续两次108+，成功触发考前保温计划")
    print(f"   触发日期：{stable_alerts[-1].trigger_date}")


def test_no_trigger():
    """测试不触发条件"""
    print("\n【测试3】不触发条件测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    # 测试：只有一次低于28分，不触发
    monitor.add_exam(ExamScore("2026-03-01", 29, 29, 27, 28))

    weak_alerts = [a for a in monitor.alerts if a.alert_type == AlertType.WEAK_SUBJECT]
    assert len(weak_alerts) == 0, "只有一次低于28分，不应该触发"

    # 测试：总分第一次低于108，不触发
    monitor.add_exam(ExamScore("2026-03-08", 27, 27, 26, 27))  # 107

    stable_alerts = [a for a in monitor.alerts if a.alert_type == AlertType.SCORE_STABLE]
    assert len(stable_alerts) == 0, "总分未达到108+，不应该触发"

    print("✅ 单次低于28分不触发单科强化")
    print("✅ 总分未达108+不触发考前保温")


def test_multiple_weak_subjects():
    """测试多科弱项触发"""
    print("\n【测试4】多科弱项触发测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    # 测试多科同时弱项
    monitor.add_exam(ExamScore("2026-03-01", 26, 25, 24, 25))
    monitor.add_exam(ExamScore("2026-03-08", 27, 26, 23, 26))

    weak_subjects = set(
        a.subject for a in monitor.alerts if a.alert_type == AlertType.WEAK_SUBJECT
    )

    # 四科都应该触发
    expected_subjects = {"阅读", "听力", "口语", "写作"}
    assert weak_subjects == expected_subjects, f"应该是四科都触发，实际：{weak_subjects}"

    print(f"✅ 四科同时弱项，全部触发单科强化计划")
    for subject in expected_subjects:
        print(f"   - {subject}")


def test_score_calculation():
    """测试成绩计算"""
    print("\n【测试5】成绩计算测试")
    print("-" * 50)

    exam = ExamScore("2026-03-19", 28, 27, 26, 27)

    assert exam.reading == 28
    assert exam.listening == 27
    assert exam.speaking == 26
    assert exam.writing == 27
    assert exam.total == 108  # 28+27+26+27=108

    print(f"✅ 成绩计算正确")
    print(f"   各科：R{exam.reading} L{exam.listening} S{exam.speaking} W{exam.writing}")
    print(f"   总分：{exam.total}")


def test_trend_analysis():
    """测试趋势分析"""
    print("\n【测试6】趋势分析测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    monitor.add_exam(ExamScore("2026-03-01", 26, 25, 24, 25))  # 100
    monitor.add_exam(ExamScore("2026-03-08", 28, 27, 26, 27))  # 108

    trend = monitor.get_trend()

    assert trend["total_trend"] == "↑ 上升 8分", "总分应该上升8分"
    assert trend["subject_trends"]["reading"] == "↑ 上升 2分"
    assert trend["subject_trends"]["listening"] == "↑ 上升 2分"
    assert trend["subject_trends"]["speaking"] == "↑ 上升 2分"
    assert trend["subject_trends"]["writing"] == "↑ 上升 2分"

    print(f"✅ 趋势分析正确")
    print(f"   {trend['total_trend']}")
    for subject, t in trend["subject_trends"].items():
        print(f"   - {subject}: {t}")


def test_summary():
    """测试摘要生成"""
    print("\n【测试7】摘要生成测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    monitor.add_exam(ExamScore("2026-03-01", 28, 27, 26, 27))
    monitor.add_exam(ExamScore("2026-03-08", 29, 28, 27, 28))

    summary = monitor.get_summary()

    assert summary["exam_count"] == 2
    assert summary["latest_date"] == "2026-03-08"
    assert summary["latest_scores"]["total"] == 112
    assert summary["average_total"] == 110.0

    print(f"✅ 摘要生成正确")
    print(f"   考试次数：{summary['exam_count']}")
    print(f"   最近日期：{summary['latest_date']}")
    print(f"   最近总分：{summary['latest_scores']['total']}")
    print(f"   平均总分：{summary['average_total']}")


def test_action_plan_content():
    """测试行动计划内容"""
    print("\n【测试8】行动计划内容测试")
    print("-" * 50)

    monitor = ScoreMonitor()

    monitor.add_exam(ExamScore("2026-03-01", 29, 28, 26, 28))
    monitor.add_exam(ExamScore("2026-03-08", 30, 29, 25, 28))

    weak_alerts = [a for a in monitor.alerts if a.alert_type == AlertType.WEAK_SUBJECT]
    action_plan = weak_alerts[-1].action_plan

    # 验证行动计划包含关键内容
    plan_text = "\n".join(action_plan)
    assert "单科强化计划" in plan_text
    assert "专项练习" in plan_text
    assert "错题分析" in plan_text
    assert "28分" in plan_text

    print("✅ 行动计划内容完整")
    print("   包含：目标、措施、进度跟踪等关键信息")


def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("TOEFL成绩监控系统 - 功能测试")
    print("=" * 60)

    try:
        test_score_calculation()
        test_weak_subject_trigger()
        test_stable_score_trigger()
        test_no_trigger()
        test_multiple_weak_subjects()
        test_trend_analysis()
        test_summary()
        test_action_plan_content()

        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        return True

    except AssertionError as e:
        print(f"\n❌ 测试失败：{e}")
        return False
    except Exception as e:
        print(f"\n❌ 发生错误：{e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
