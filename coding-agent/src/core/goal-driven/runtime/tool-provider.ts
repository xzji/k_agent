/**
 * Tool Provider
 *
 * 从 Agent Pi 获取可用工具列表
 */

import type { ResourceLoader } from "../resource-loader.js";

export interface ToolInfo {
  name: string;
  description: string;
  category: "search" | "file" | "browser" | "code" | "system";
}

export class ToolProvider {
  private tools: ToolInfo[] | null = null;

  constructor(private resourceLoader: ResourceLoader) {}

  /**
   * 从 Agent Pi 获取可用工具列表
   *
   * 通过 resourceLoader 或全局 agent session 获取工具列表
   */
  async getAvailableTools(): Promise<ToolInfo[]> {
    if (this.tools) {
      return this.tools;
    }

    try {
      // 方式1: 从 AgentSession 获取工具列表
      // 方式2: 通过 resourceLoader 获取配置
      // 方式3: 使用默认工具列表作为 fallback

      // 目前先使用默认列表，后续可以扩展为动态获取
      this.tools = this.getDefaultTools();
      return this.tools;
    } catch (error) {
      console.warn("[ToolProvider] Failed to get tools from Agent Pi, using defaults:", error);
      return this.getDefaultTools();
    }
  }

  /**
   * 获取默认工具列表
   */
  private getDefaultTools(): ToolInfo[] {
    return [
      { name: "web_search", description: "网络搜索", category: "search" },
      { name: "codebase_search", description: "代码库搜索", category: "search" },
      { name: "read", description: "读取文件", category: "file" },
      { name: "edit", description: "编辑文件", category: "file" },
      { name: "write", description: "写入文件", category: "file" },
      { name: "glob", description: "文件匹配", category: "file" },
      { name: "grep", description: "内容搜索", category: "code" },
      { name: "bash", description: "命令行", category: "system" },
      { name: "Agent", description: "启动子代理", category: "system" },
    ];
  }

  /**
   * 获取工具名称列表（用于传递给后台执行）
   */
  async getToolNames(): Promise<string[]> {
    const tools = await this.getAvailableTools();
    return tools.map((t) => t.name);
  }
}

// 全局单例
let globalToolProvider: ToolProvider | null = null;

export function initToolProvider(resourceLoader: ResourceLoader): ToolProvider {
  if (!globalToolProvider) {
    globalToolProvider = new ToolProvider(resourceLoader);
  }
  return globalToolProvider;
}

export function getToolProvider(): ToolProvider | null {
  return globalToolProvider;
}
