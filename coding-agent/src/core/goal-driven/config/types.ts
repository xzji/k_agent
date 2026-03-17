/**
 * Goal-Driven Agent Configuration Types
 *
 * Defines configuration types, defaults, ranges, and labels for all configurable parameters.
 */

export interface GoalDrivenConfig {
  maxConcurrentTasks: number;
  maxInfoCollectionRounds: number;
  minInfoCollectionRounds: number;
  schedulerCycleIntervalMs: number;
  taskDefaultTimeoutMs: number;
  taskHeartbeatTimeoutMs: number;
  llmLogMode: 'minimal' | 'standard' | 'verbose';
}

export const DEFAULT_GOAL_DRIVEN_CONFIG: GoalDrivenConfig = {
  maxConcurrentTasks: 3,
  maxInfoCollectionRounds: 3,
  minInfoCollectionRounds: 1,
  schedulerCycleIntervalMs: 60000,
  taskDefaultTimeoutMs: 600000,
  taskHeartbeatTimeoutMs: 120000,
  llmLogMode: 'minimal',
};

export const CONFIG_RANGES: Record<keyof GoalDrivenConfig, { min: number; max: number }> = {
  maxConcurrentTasks: { min: 1, max: 10 },
  maxInfoCollectionRounds: { min: 1, max: 5 },
  minInfoCollectionRounds: { min: 1, max: 3 },
  schedulerCycleIntervalMs: { min: 10000, max: 300000 },
  taskDefaultTimeoutMs: { min: 60000, max: 1800000 },
  taskHeartbeatTimeoutMs: { min: 30000, max: 300000 },
};

export const CONFIG_LABELS: Record<keyof GoalDrivenConfig, string> = {
  maxConcurrentTasks: "最大并发任务数",
  maxInfoCollectionRounds: "最大信息收集轮数",
  minInfoCollectionRounds: "最小信息收集轮数",
  schedulerCycleIntervalMs: "调度周期（毫秒）",
  taskDefaultTimeoutMs: "任务默认超时（毫秒）",
  taskHeartbeatTimeoutMs: "心跳超时（毫秒）",
  llmLogMode: "LLM日志模式",
};

export const CONFIG_DESCRIPTIONS: Record<keyof GoalDrivenConfig, string> = {
  maxConcurrentTasks: "同时执行的最大后台任务数量",
  maxInfoCollectionRounds: "信息收集阶段最多询问用户的轮数",
  minInfoCollectionRounds: "信息收集阶段至少询问用户的轮数",
  schedulerCycleIntervalMs: "调度器检查就绪任务的时间间隔",
  taskDefaultTimeoutMs: "单个任务在后台执行的最大时间",
  taskHeartbeatTimeoutMs: "任务无响应判定为超时的时间",
  llmLogMode: "LLM请求/响应的日志详细程度: minimal=仅基本信息, standard=摘要(前1000字符), verbose=完整内容并在控制台输出",
};
