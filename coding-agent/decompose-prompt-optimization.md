# 目标拆解 Prompt 优化

## Context

优化 `sub-goal-planner.ts` 中的 `DECOMPOSE_PROMPT`，使用更专业、结构化的prompt，采用 MECE 原则和逆向推演法进行目标拆解。

## 新 Prompt 结构

新prompt包含：
- **Role**: 资深目标规划与战略拆解专家
- **Context**: MECE原则 + 逆向推演法
- **Instructions**: 拆解前思考、拆解原则、边界处理
- **Output Format**: 更丰富的JSON结构

## JSON 输出结构（取长补短）

### 合并原则
- 保持驼峰命名风格（与代码库一致）
- 保留原有有价值的字段（如 `weight`、`successCriteria.type`）
- 引入新prompt中有价值的字段（如 `why`、`goalAnalysis`、`risks`）

### 合并后的类型定义

```typescript
let decomposition: {
  // 新增：目标分析
  goalAnalysis?: {
    coreIntent: string;        // 核心意图
    successState: string;      // 成功状态
    assumptions: string[];     // 假设
  };

  subGoals: Array<{
    id: number;                // 新增：用于依赖引用
    name: string;              // 保留原名
    description: string;
    why: string;               // 新增：必要性说明
    priority: 'critical' | 'high' | 'medium' | 'low';  // 保持原有格式
    weight?: number;           // 保留：权重
    dependencies: number[];    // 简化：使用id数字引用
    estimatedDuration?: number; // 保留：小时数
    estimatedEffort?: string;  // 新增：描述性工作量
    successCriteria: Array<{
      description: string;
      type: 'milestone' | 'deliverable' | 'condition';  // 保留类型
    }>;
  }>;

  executionOrder?: string;     // 新增：执行顺序建议
  risks?: string[];            // 新增：风险点
  reasoning: string;           // 保留：拆解理由
};
```

### 字段对比

| 字段 | 旧 | 新 | 合并后 | 说明 |
|------|----|----|--------|------|
| 子目标列表 | `subGoals` | `sub_goals` | `subGoals` | 保持驼峰 |
| 子目标名称 | `name` | `title` | `name` | 保留原名 |
| 必要性说明 | ❌ | `why` | `why` | **新增** |
| 完成标准 | `successCriteria[].type` | 无type | 保留type | 保留原有结构 |
| 优先级 | `high/medium/low` | `P0/P1/P2` | 保持原有 | 保持原有格式 |
| 权重 | `weight` | ❌ | `weight` | **保留** |
| 工作量 | `estimatedDuration`(小时) | `estimated_effort`(描述) | **两者都保留** | 不同用途 |
| 目标分析 | ❌ | `goal_analysis` | `goalAnalysis` | **新增** |
| 执行顺序 | ❌ | `execution_order` | `executionOrder` | **新增** |
| 风险点 | ❌ | `risks` | `risks` | **新增** |
| 拆解理由 | `reasoning` | ❌ | `reasoning` | **保留** |

---

## 修改计划

### Step 1: 更新 DECOMPOSE_PROMPT

**文件**: `coding-agent/src/core/goal-driven/planning/sub-goal-planner.ts`

替换整个 `DECOMPOSE_PROMPT` 常量为用户提供的新prompt。

### Step 2: 更新类型定义

更新 `decomposeSubGoals` 方法中的类型定义（取长补短）：

```typescript
let decomposition: {
  // 新增：目标分析
  goalAnalysis?: {
    coreIntent: string;
    successState: string;
    assumptions: string[];
  };

  subGoals: Array<{
    id: number;
    name: string;
    description: string;
    why?: string;
    priority: string;
    weight?: number;
    dependencies: Array<string | number>;
    estimatedDuration?: number;
    estimatedEffort?: string;
    successCriteria: Array<{ description: string; type: string }>;
  }>;

  executionOrder?: string;
  risks?: string[];
  reasoning?: string;
};
```

### Step 3: 更新子目标创建逻辑

适配合并后的JSON结构：

```typescript
const subGoalData: SubGoalCreateData = {
  goalId: goal.id,
  name: sgData.name,
  description: sgData.description,
  priority: this.validatePriority(sgData.priority),
  status: i === 0 ? 'active' : 'pending',
  weight: sgData.weight ?? (1 / decomposition.subGoals.length),
  dependencies: [],
  estimatedDuration: sgData.estimatedDuration,
  taskIds: [],
  successCriteria: sgData.successCriteria.map((sc) => ({
    id: `sc-${generateId().slice(0, 8)}`,
    description: sc.description,
    type: sc.type as 'milestone' | 'deliverable' | 'condition',
    completed: false,
  })),
};
```

### Step 4: 更新依赖解析逻辑

新格式使用数字 `id` 作为依赖引用，简化解析：

```typescript
const realDeps = sgData.dependencies
  .map((depId) => {
    // depId 可能是数字(新格式)或字符串(旧格式)
    let index: number;

    if (typeof depId === 'number') {
      index = depId - 1;  // 新格式: id从1开始
    } else if (typeof depId === 'string') {
      if (depId.startsWith('temp-')) {
        index = parseInt(depId.replace('temp-', ''));
      } else {
        index = parseInt(depId);
        if (isNaN(index)) return tempIdMap.get(depId);
      }
    } else {
      return undefined;
    }

    if (!isNaN(index) && index >= 0 && index < createdSubGoals.length) {
      return createdSubGoals[index].id;
    }
    return undefined;
  })
  .filter((id): id is string => !!id);
```

---

## 关键文件

| 文件 | 修改内容 |
|------|----------|
| `sub-goal-planner.ts` | 更新prompt、类型定义、解析逻辑 |

---

## 验证

1. 运行测试: `npm test`
2. 手动测试: 创建目标并触发子目标拆解，检查输出结构
