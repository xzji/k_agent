# Goal-Driven Agent

目标驱动的智能代理系统，集成于 Coding Agent CLI 中，提供统一的任务调度、目标管理和知识复用能力。

## 核心特性

- **目标管理**: 创建、追踪和管理复杂目标
- **统一任务调度**: 支持 6 种任务类型（探索、周期、交互、监控、事件触发、一次性）
- **层级规划**: Goal → SubGoal → Task → SubTask → Action
- **智能通知**: 基于价值和空闲状态的通知系统
- **知识复用**: 目标范围内的知识存储和检索

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行测试

```bash
npm test
```

### 在 Coding Agent 中使用

```bash
cd coding-agent
npm run dev

# 在 CLI 中使用 /goal 命令
/goal add 准备雅思考试
/goal list
/goal status
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `/goal add <描述>` | 创建新目标并收集信息 |
| `/goal list` | 列出所有目标 |
| `/goal status` | 查看调度器状态 |
| `/goal info <ID>` | 查看目标详情 |
| `/goal complete <ID>` | 完成目标 |
| `/goal abandon <ID>` | 暂停目标 |
| `/goal stop` | 停止调度器 |
| `/goal resume` | 恢复调度器 |

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    GoalOrchestrator                             │
│                   (10阶段工作流编排)                             │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Context   │  SubGoal    │    Task     │  SuccessCriteria      │
│  Gatherer   │  Planner    │   Planner   │     Checker           │
├─────────────┴─────────────┴─────────────┴───────────────────────┤
│              UnifiedTaskScheduler                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   TaskStore     │  KnowledgeStore │   NotificationQueue         │
├─────────────────┴─────────────────┴─────────────────────────────┤
│              ExecutionPipeline                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 项目结构

```
.
├── src/core/goal-driven/          # 核心实现
│   ├── extension.ts               # Coding Agent 扩展入口
│   ├── index.ts                   # 模块导出
│   ├── scheduler/                 # 统一任务调度器
│   ├── planning/                  # 规划组件
│   ├── task/                      # 任务管理
│   ├── goal-manager/              # 目标管理
│   ├── knowledge/                 # 知识存储
│   ├── orchestrator/              # 工作流编排
│   └── runtime/                   # 运行时适配器
├── coding-agent/                   # Coding Agent 集成
│   └── src/core/goal-driven/      # 集成代码
└── dist/                          # 编译输出
```

## 技术文档

- [CLAUDE.md](.claude/CLAUDE.md) - 详细使用指南
- [coding-agent/GOAL_DRIVEN_README.md](coding-agent/GOAL_DRIVEN_README.md) - Coding Agent 集成文档

## 存储位置

数据存储在 `~/.pi/agent/goal-driven/`:
- `goals/` - 目标定义
- `tasks/` - 任务数据
- `knowledge/` - 知识条目

## 版本

- Version: 0.3.0
- Architecture: Unified Task Scheduler with Hierarchical Planning

## License

MIT
