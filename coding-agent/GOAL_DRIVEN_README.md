# Goal-Driven Agent 集成指南

**检查日期**: 2026-03-16
**检查状态**: ✅ 集成完整，所有测试通过

---

## 快速开始

```bash
# 1. 进入目录
cd /Users/bytedance/Documents/claude_code/goal_driven_agent/coding-agent

# 2. 安装依赖
npm install

# 3. 运行测试验证
npx tsx test/goal-driven-integration.test.ts
npx tsx test/goal-driven-e2e.test.ts

# 4. 启动应用
npm run dev
```

---

## 修复记录

### Bug 1: ✅ 已修复
- **问题**: `extension.ts:457` 调用 `knowledgeStore.clear()` 但方法名为 `clearAll()`
- **修复**: 改为 `knowledgeStore.clearAll()`

### Bug 2: ✅ 已修复
- **问题**: `NotificationQueue` 缺少 `pendingCount` getter
- **修复**: 在 `output-layer/notification-queue.ts` 添加 `get pendingCount(): number`

### Bug 3: ✅ 已修复（重大变更）
- **问题**: `coding-agent-adapter.ts` 使用 `pi-ai` 库的 `complete()` 函数调用 LLM，但某些模型（如 glm-4.7）返回空响应
- **修复**: **完全重写 `CodingAgentLLMChannel` 类**，改用与 legacy 项目相同的**直接 fetch 调用 OpenAI-compatible API**方式
- **关键变更**:
  - 不再使用 `pi-ai` 库的 `complete()` 函数
  - 直接使用 `fetch()` 调用 `/chat/completions` 端点
  - 使用 `modelRegistry.getApiKey()` 获取 API key
  - 支持多种 provider 的默认 base URL
  - 更好的错误处理和调试日志
- **文件**: `coding-agent/src/core/goal-driven/runtime/coding-agent-adapter.ts`

### 功能: 结构化日志系统
- **日志文件**: 按天保存到 `~/.pi/agent/logs/goal-driven-YYYY-MM-DD.log`
- **日志级别**: debug, info, warn, error
- **日志分类**:
  - 👤 `user_input` - 用户输入
  - ⚙️ `system_action` - 系统操作
  - 📤 `llm_request` - LLM 请求
  - 📥 `llm_response` - LLM 响应
  - 📋 `task_event` - 任务事件
  - 🎯 `goal_event` - 目标事件
  - ⏰ `scheduler_event` - 调度器事件
  - 🔔 `notification` - 通知
  - ❌ `error` - 错误
- **查看日志**:
  ```
  /goal logs              # 查看日志文件列表
  /goal logs 2026-03-16   # 查看指定日期的日志
  ```

---

## 功能特性

- **目标管理**: 创建、列出、完成、暂停目标
- **任务调度**: 统一任务调度器，支持6种任务类型
- **子目标规划**: 层级规划 (Goal → SubGoal → Task → SubTask → Action)
- **智能通知**: 基于价值评估的空闲时推送
- **知识复用**: 目标范围内的知识存储和复用
- **交互式收集**: 渐进式信息收集
- **LLM集成**: 通过 `@mariozechner/pi-ai` 调用模型

---

## 使用方法

### 1. 选择模型（必须）
```
/model
```

### 2. 创建目标
```
/goal add 我想买一辆SUV，预算20万以内，油车，要省油
```

### 3. 系统交互式收集信息
系统会自动询问：
- 主要用车场景？
- 预算范围？
- 品牌偏好？
- ...

### 4. 查看计划
```
/goal status
```

### 5. 列出所有目标
```
/goal list
```

### 其他命令
```
/goal info <目标ID>      # 查看详情
/goal complete <目标ID>  # 完成目标
/goal abandon <目标ID>   # 暂停目标
/goal stop               # 停止调度器
/goal resume             # 恢复调度器
/goal logs               # 查看日志文件列表
/goal logs 2026-03-16    # 查看指定日期的日志
/goal clear --confirm    # 清空所有数据
```

---

## 完整10阶段工作流

```
┌─────────────────────────────────────────────────────────────────┐
│                        GoalOrchestrator                         │
│                      (10阶段工作流编排)                          │
├─────────┬─────────┬─────────┬─────────┬─────────────────────────┤
│ Phase 1 │ Phase   │ Phase   │ Phase   │ Phase 6                 │
│ Collect │ 2-3     │ 4-5     │ 6       │ Present                 │
│ Info    │ Decomp- │ Generate│ Confirm │ Plan                    │
│         │ ose     │ Tasks   │         │                         │
│         │ SubGoals│         │         │                         │
├─────────┴─────────┴─────────┴─────────┴─────────────────────────┤
│              UnifiedTaskScheduler                               │
│              (Phase 7: Execute)                                 │
├─────────────────────────────────────────────────────────────────┤
│              ValueAssessor                                      │
│              (Phase 8-9: Monitor & Smart Notify)                │
├─────────────────────────────────────────────────────────────────┤
│              SuccessCriteriaChecker                             │
│              (Phase 10: Periodic Review)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心组件状态

| 组件 | 状态 | 功能 |
|------|------|------|
| GoalOrchestrator | ✅ 正常 | 10阶段工作流编排 |
| UnifiedTaskScheduler | ✅ 正常 | 统一任务调度器 |
| ContextGatherer | ✅ 正常 | 交互式信息收集 |
| SubGoalPlanner | ✅ 正常 | 子目标规划 |
| TaskPlanner | ✅ 正常 | 任务规划 |
| PlanPresenter | ✅ 正常 | 计划展示 |
| SuccessCriteriaChecker | ✅ 正常 | 成功标准检查 |
| ValueAssessor | ✅ 正常 | 价值评估 |
| GoalStore | ✅ 正常 | 目标存储 |
| TaskStore | ✅ 正常 | 任务存储 |
| KnowledgeStore | ✅ 正常 | 知识存储 |
| SubGoalStore | ✅ 正常 | 子目标存储 |
| NotificationQueue | ✅ 正常 | 通知队列 |
| TaskDependencyGraph | ✅ 正常 | 依赖图管理 |
| ExecutionPipeline | ✅ 正常 | 执行管道 |
| CodingAgentLLMChannel | ✅ 正常 | LLM适配器 |

---

## 任务类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `exploration` | 信息收集 | 搜索车型资料 |
| `one_time` | 一次性执行 | 生成报告 |
| `recurring` | 周期性执行 | 每周回顾 |
| `interactive` | 需要用户输入 | 询问偏好 |
| `monitoring` | 持续监控 | 价格监控 |
| `event_triggered` | 事件触发 | 降价提醒 |

---

## 与 buy_car_demo_showcase.js 对照

| Demo 步骤 | 实现组件 | 用户命令 |
|-----------|----------|----------|
| 1. 用户提交目标 | extension.ts handler | `/goal add` |
| 2. 收集背景信息 | ContextGatherer | 自动交互 |
| 3. 拆解子目标 | SubGoalPlanner | 自动执行 |
| 4. 梳理关系 | PlanPresenter | 自动执行 |
| 5. 生成任务 | TaskPlanner | 自动执行 |
| 6. Review任务 | TaskPlanner.review | 自动执行 |
| 7. 确认计划 | PlanPresenter | 自动展示 |
| 8. 执行 | UnifiedTaskScheduler | 自动执行 |
| 9. 第一次Review | SuccessCriteriaChecker | `/goal status` |
| 10. 调整计划 | TaskPlanner.replan | 自动/手动 |
| 11. 继续执行 | UnifiedTaskScheduler | 自动执行 |
| 12. 最终Review | SuccessCriteriaChecker | `/goal status` |

---

## 预期交互示例

```
用户: /goal add 我想买一辆SUV，预算20万以内，油车，要省油

系统: ⏳ 正在创建目标并收集信息...

Agent: 为了帮您找到合适的SUV，我需要了解一些信息：

       1. 您主要用车场景是什么？
          → 城市通勤/长途自驾/商务/其他

用户: 城市通勤为主，偶尔周末自驾

Agent: 2. 您的购车预算具体是多少？

用户: 15-20万

Agent: 3. 平时一般载几个人？

用户: 主要2人，偶尔带父母共4人

[收集足够信息...]

Agent: ✅ 已为您创建购车计划：

       📋 5个子目标：
       1. 筛选符合需求的车型清单
       2. 收集目标车型详细参数与口碑
       3. 获取本地经销商报价信息
       4. 安排试驾体验
       5. 确定最终购车方案

       📊 22个任务（17个推送 + 5个内部监控）

       计划已确认，开始执行...

[用户空闲时]

Agent: 📬 【车型推荐】已筛选出6款符合您需求的省油SUV：

       1. 本田XR-V - 官方油耗6.8L，车主众测7.2L
       2. 丰田锋兰达 - 官方油耗5.8L，车主众测7.2L
       3. 日产逍客 - 官方油耗6.2L，车主众测7.5L
       ...

用户: /goal status

系统: 📊 Goal-Driven Agent 状态

       调度器: 🟢 运行中
         - 完成周期: 12
         - 执行任务: 8
         - 失败任务: 0

       活跃目标:
         - [b15e3b71] 我想买一辆SUV...
           状态: active | 阶段: executing
           子目标: 5 | 任务: 22

       知识积累: 15 条
       待推送通知: 2 条
```

---

## 存储结构

```
~/.pi/agent/goal-driven/
├── goals/
│   └── goals.json              # 目标定义
├── tasks/
│   └── {goalId}/
│       └── tasks.json          # 任务列表
├── sub-goals/
│   └── sub-goals.json          # 子目标
└── knowledge/
    └── global.jsonl            # 知识条目
```

---

## 测试覆盖

### 单元测试 (13项全部通过 ✅)
- GoalStore 初始化与操作
- TaskStore 初始化与操作
- KnowledgeStore 初始化与操作
- SubGoalStore 初始化与操作
- NotificationQueue 操作
- TaskDependencyGraph 初始化
- 目标与任务创建
- 知识保存与检索
- 子目标创建与检索
- 清空操作
- 所有组件导出验证

### E2E测试 (8项全部通过 ✅)
- Phase 1: 目标创建与信息收集
- Phase 1b: 用户响应处理
- Phase 2-3: 子目标拆解
- Phase 4-5: 任务生成与Review
- Phase 6: 计划确认
- Phase 7: 启动执行
- 完整流程验证
- 知识存储

---

## 依赖关系

```
extension.ts
├── GoalOrchestrator (10阶段编排)
│   ├── ContextGatherer → LLM (chatJSON)
│   ├── SubGoalPlanner → LLM (complete)
│   ├── TaskPlanner → LLM (complete)
│   ├── PlanPresenter → LLM (complete)
│   ├── SuccessCriteriaChecker → LLM (complete)
│   └── UnifiedTaskScheduler
│       ├── TaskStore
│       ├── GoalStore
│       ├── KnowledgeStore
│       ├── NotificationQueue
│       ├── TaskDependencyGraph
│       ├── ExecutionPipeline → LLM (chat/chatJSON)
│       ├── ValueAssessor → LLM (complete)
│       └── IdleDetector
```

---

## 注意事项

1. **必须先选择模型**: 使用 `/goal add` 前先用 `/model` 选择模型
2. **调度器自动启动**: 创建目标后调度器自动启动
3. **空闲检测**: 低优先级通知只在用户空闲时推送
4. **紧急通知**: critical/high 优先级通知会立即推送
5. **数据持久化**: 所有数据保存在 `~/.pi/agent/goal-driven/`

---

## 文件结构

```
coding-agent/src/core/goal-driven/
├── index.ts                    # 主入口
├── extension.ts                # Extension API集成
├── types/                      # 类型定义
├── goal-manager/goal-store.ts
├── task/task-store.ts
├── task/task-dependency.ts
├── sub-goal/sub-goal-store.ts
├── knowledge/knowledge-store.ts
├── scheduler/unified-task-scheduler.ts
├── orchestrator/goal-orchestrator.ts
├── planning/
│   ├── context-gatherer.ts
│   ├── sub-goal-planner.ts
│   ├── task-planner.ts
│   ├── plan-presenter.ts
│   └── success-criteria-checker.ts
├── output-layer/
│   ├── notification-queue.ts
│   ├── value-assessor.ts
│   └── idle-detector.ts
├── execution/execution-pipeline.ts
├── runtime/
│   ├── claude-llm-adapter.ts
│   └── coding-agent-adapter.ts
└── utils/index.ts
```

---

## 总结

✅ **Goal-Driven Agent 已完整集成到 coding-agent**

- 所有13个单元测试通过
- 所有8个E2E测试通过
- 10阶段工作流完整实现
- LLM集成通过 `@mariozechner/pi-ai` 正常工作
- 用户可以正常使用 `/goal add` 创建目标
- 预期交互与 `buy_car_demo_showcase.js` 一致
- 完整的结构化日志系统（按天保存）
