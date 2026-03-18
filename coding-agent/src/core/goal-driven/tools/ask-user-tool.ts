/**
 * Ask User Tool
 *
 * 用于后台任务执行过程中向用户请求输入的工具。
 * 当 Agent 发现需要用户提供额外信息才能继续时，调用此工具。
 */

import type { Tool } from "@mariozechner/pi-agent-core";

/**
 * ask_user 工具参数
 */
export interface AskUserParams {
  /** 向用户提出的问题 */
  question: string;
  /** 问题背景说明 */
  context?: string;
  /** 可选的预设选项 */
  options?: string[];
  /** 是否必须回答，默认为 true */
  required?: boolean;
}

/**
 * ask_user 工具返回结果
 */
export interface AskUserResult {
  /** 用户的回答 */
  response: string;
  /** 回答时间戳 */
  timestamp: number;
}

/**
 * ask_user 工具定义
 *
 * 此工具让 Agent 能够在后台任务执行过程中请求用户输入。
 * 调用此工具时，后台会话会暂停，等待用户响应后继续执行。
 */
export const askUserTool: Tool = {
  name: "ask_user",
  description:
    "当任务执行过程中需要用户提供额外信息时，使用此工具向用户提问。用户回答后，你可以继续执行任务。例如：需要澄清用户偏好、确认执行方向、获取缺失的上下文信息等。",
  parameters: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "向用户提出的问题，应该清晰、具体",
      },
      context: {
        type: "string",
        description:
          "问题的背景说明，帮助用户理解为什么需要这个信息，以及如何影响后续执行",
      },
      options: {
        type: "array",
        items: { type: "string" },
        description:
          "可选的预设选项列表，用户可以从中选择。提供选项可以让用户更容易回答",
      },
      required: {
        type: "boolean",
        description: "是否必须回答。如果为 true，用户必须提供回答才能继续；如果为 false，用户可以跳过。默认为 true",
        default: true,
      },
    },
    required: ["question"],
  },
};

/**
 * 等待输入状态信息
 *
 * 当后台会话因等待用户输入而暂停时，存储此信息以便恢复
 */
export interface PendingInputRequest {
  /** 工具调用 ID */
  toolCallId: string;
  /** 问题参数 */
  params: AskUserParams;
  /** 创建时间 */
  createdAt: number;
  /** 关联的会话 ID */
  sessionId: string;
  /** 关联的任务 ID */
  taskId: string;
}

/**
 * 创建 ask_user 工具调用结果
 */
export function createAskUserResult(response: string): AskUserResult {
  return {
    response,
    timestamp: Date.now(),
  };
}

/**
 * 验证 ask_user 工具参数
 */
export function validateAskUserParams(params: unknown): params is AskUserParams {
  if (typeof params !== "object" || params === null) {
    return false;
  }

  const p = params as Record<string, unknown>;

  // question 是必需的字符串
  if (typeof p.question !== "string" || p.question.trim().length === 0) {
    return false;
  }

  // context 如果存在，必须是字符串
  if (p.context !== undefined && typeof p.context !== "string") {
    return false;
  }

  // options 如果存在，必须是字符串数组
  if (p.options !== undefined) {
    if (!Array.isArray(p.options)) {
      return false;
    }
    if (!p.options.every((opt) => typeof opt === "string")) {
      return false;
    }
  }

  // required 如果存在，必须是布尔值
  if (p.required !== undefined && typeof p.required !== "boolean") {
    return false;
  }

  return true;
}
