"""
TOEFL模考成绩监控系统 - 使用示例
展示如何在实际场景中使用监控系统
"""

from toefl_score_monitor import ScoreMonitor, ExamScore


def example_1_basic_usage():
    """示例1：基本使用"""
    print("\n" + "="*60)
    print("示例1：基本使用 - 记录考试成绩")
    print("="*60)

    monitor = ScoreMonitor()

    # 添加考试记录
    exam1 = ExamScore("2026-03-10", reading=28, listening=27, speaking=26, writing=27)
    monitor.add_exam(exam1)

    exam2 = ExamScore("2026-03-17", reading=29, listening=26, speaking=25, writing=28)
    monitor.add_exam(exam2)

    # 查看摘要
    monitor.print_summary()


def example_2_weak_subject_trigger():
    """示例2：单科弱项触发"""
    print("\n" + "="*60)
    print("示例2：单科弱项触发（连续两次<28分）")
    print("="*60)

    monitor = ScoreMonitor()

    # 口语连续两次低于28分
    monitor.add_exam(ExamScore("2026-03-01", 29, 28, 26, 28))
    monitor.add_exam(ExamScore("2026-03-08", 30, 29, 25, 28))

    # 查看预警
    monitor.print_alerts()


def example_3_stable_score_trigger():
    """示例3：总分稳定触发"""
    print("\n" + "="*60)
    print("示例3：总分稳定触发（连续两次108+）")
    print("="*60)

    monitor = ScoreMonitor()

    # 总分连续两次108+
    monitor.add_exam(ExamScore("2026-03-01", 29, 29, 27, 27))  # 112
    monitor.add_exam(ExamScore("2026-03-08", 28, 28, 27, 28))  # 111

    # 查看预警
    monitor.print_alerts()


def example_4_full_tracking():
    """示例4：完整的成绩跟踪"""
    print("\n" + "="*60)
    print("示例4：完整的备考周期跟踪")
    print("="*60)

    monitor = ScoreMonitor()

    # 备考周期模拟
    exams = [
        ("2026-01-05", 24, 23, 22, 23, "基础测试"),
        ("2026-01-12", 26, 24, 23, 25, "开始专项训练"),
        ("2026-01-19", 27, 26, 24, 26, "有所进步"),
        ("2026-01-26", 28, 27, 25, 27, "口语仍需加强"),
        ("2026-02-02", 29, 28, 25, 28, "口语连续两次低分"),
        ("2026-02-09", 28, 29, 27, 27, "口语突破，总分接近110"),
        ("2026-02-16", 29, 29, 27, 28, "总分稳定113"),
        ("2026-02-23", 30, 29, 28, 28, "触发保温计划"),
    ]

    for date, r, l, s, w, note in exams:
        exam = ExamScore(date, r, l, s, w, note)
        monitor.add_exam(exam)
        print(f"✓ {date}: R{r} L{l} S{s} W{w} = {exam.total} ({note})")

    # 打印趋势
    monitor.print_trend()

    # 打印最新预警
    if monitor.alerts:
        print("\n最新预警：")
        latest_alert = monitor.alerts[-1]
        print(f"【{latest_alert.alert_type.value}】")
        print(f"触发日期：{latest_alert.trigger_date}")
        print(f"说明：{latest_alert.description}")


def example_5_custom_thresholds():
    """示例5：自定义阈值"""
    print("\n" + "="*60)
    print("示例5：自定义监控阈值")
    print("="*60)

    # 创建监控器
    monitor = ScoreMonitor()

    # 可以修改阈值（需要直接修改类属性）
    print(f"默认单科弱项阈值：{monitor.WEAK_SUBJECT_THRESHOLD}")
    print(f"默认总分稳定阈值：{monitor.STABLE_SCORE_THRESHOLD}")
    print(f"默认连续达标次数：{monitor.CONSECUTIVE_COUNT}")

    # 临时修改阈值
    ScoreMonitor.WEAK_SUBJECT_THRESHOLD = 25  # 降低到25分
    ScoreMonitor.STABLE_SCORE_THRESHOLD = 100  # 降低到100分

    # 添加考试
    monitor.add_exam(ExamScore("2026-03-01", 26, 26, 24, 24))  # 100
    monitor.add_exam(ExamScore("2026-03-08", 25, 25, 25, 25))  # 100

    # 查看预警
    print("\n使用降低阈值后的预警：")
    monitor.print_alerts()

    # 恢复默认值
    ScoreMonitor.WEAK_SUBJECT_THRESHOLD = 28
    ScoreMonitor.STABLE_SCORE_THRESHOLD = 108


def example_6_export_data():
    """示例6：数据导出"""
    print("\n" + "="*60)
    print("示例6：数据导出")
    print("="*60)

    monitor = ScoreMonitor()

    monitor.add_exam(ExamScore("2026-03-01", 28, 27, 26, 27))
    monitor.add_exam(ExamScore("2026-03-08", 29, 28, 27, 28))

    # 导出摘要
    summary = monitor.get_summary()
    print("摘要数据：")
    print(f"  考试次数：{summary['exam_count']}")
    print(f"  平均总分：{summary['average_total']:.1f}")
    print(f"  预警数量：{summary['alert_count']}")

    # 导出趋势
    trend = monitor.get_trend()
    print("\n趋势数据：")
    print(f"  总分趋势：{trend['total_trend']}")


if __name__ == "__main__":
    # 运行所有示例
    example_1_basic_usage()
    example_2_weak_subject_trigger()
    example_3_stable_score_trigger()
    example_4_full_tracking()
    example_5_custom_thresholds()
    example_6_export_data()

    print("\n" + "="*60)
    print("✅ 所有示例运行完成！")
    print("="*60)
