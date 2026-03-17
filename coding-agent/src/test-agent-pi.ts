/**
 * Agent-Pi 独立测试脚本
 *
 * 完全复刻 background-session.ts 的执行逻辑，用于调试 Agent 响应问题。
 *
 * 运行方式:
 *   npx tsx src/test-agent-pi.ts
 */

import { homedir } from "os";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";

// ============================================================================
// Step 1: 初始化依赖
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("🔧 Step 1: 初始化依赖");
console.log("=".repeat(60) + "\n");

// 获取 agent 目录
const agentDir = join(homedir(), ".pi", "agent");
console.log(`[Init] agentDir: ${agentDir}`);

// 确保必要目录存在
const sessionsDir = join(agentDir, "sessions");
const sessionLogsDir = join(agentDir, "session-logs");
if (!existsSync(sessionsDir)) {
  mkdirSync(sessionsDir, { recursive: true });
  console.log(`[Init] Created sessions directory: ${sessionsDir}`);
}
if (!existsSync(sessionLogsDir)) {
  mkdirSync(sessionLogsDir, { recursive: true });
  console.log(`[Init] Created session-logs directory: ${sessionLogsDir}`);
}

// 动态导入模块
async function main() {
  console.log("[Init] Importing modules...");

  const { SettingsManager } = await import("./core/settings-manager.js");
  const { ModelRegistry } = await import("./core/model-registry.js");
  const { DefaultResourceLoader } = await import("./core/resource-loader.js");
  const { SessionManager } = await import("./core/session-manager.js");
  const { AgentSession } = await import("./core/agent-session.js");
  const { Agent: AgentCore } = await import("@mariozechner/pi-agent-core");
  const { AuthStorage, FileAuthStorageBackend } = await import("./core/auth-storage.js");
  const { getAuthPath, getModelsPath } = await import("./config.js");

  // ============================================================================
  // Step 2: 创建 SettingsManager
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("⚙️ Step 2: 创建 SettingsManager");
  console.log("=".repeat(60) + "\n");

  const settingsManager = SettingsManager.create(process.cwd(), agentDir);
  console.log(`[Settings] Default provider: ${settingsManager.getDefaultProvider()}`);
  console.log(`[Settings] Default model: ${settingsManager.getDefaultModel()}`);

  // ============================================================================
  // Step 3: 创建 ModelRegistry
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("🤖 Step 3: 创建 ModelRegistry");
  console.log("=".repeat(60) + "\n");

  const authStorage = new AuthStorage(new FileAuthStorageBackend(getAuthPath()));
  const modelRegistry = new ModelRegistry(authStorage, getModelsPath());

  const availableModels = modelRegistry.getAvailable();
  console.log(`[ModelRegistry] Available models: ${availableModels.length}`);

  if (availableModels.length === 0) {
    console.error("[ModelRegistry] ❌ No models available! Please run /login first.");
    process.exit(1);
  }

  // 显示前5个可用模型
  console.log("[ModelRegistry] First 5 available models:");
  for (const m of availableModels.slice(0, 5)) {
    console.log(`  - ${m.provider}/${m.id}`);
  }

  // ============================================================================
  // Step 4: 获取当前模型
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("🎯 Step 4: 获取当前模型");
  console.log("=".repeat(60) + "\n");

  const defaultProvider = settingsManager.getDefaultProvider();
  const defaultModelId = settingsManager.getDefaultModel();

  let currentModel = defaultProvider && defaultModelId
    ? modelRegistry.find(defaultProvider, defaultModelId)
    : undefined;

  if (!currentModel) {
    // 使用第一个可用模型
    currentModel = availableModels[0];
    console.log(`[Model] No default model set, using first available: ${currentModel.provider}/${currentModel.id}`);
  } else {
    console.log(`[Model] Using default model: ${currentModel.provider}/${currentModel.id}`);
  }

  // 显示模型详细信息
  console.log(`[Model] API: ${currentModel.api}`);
  console.log(`[Model] Base URL: ${currentModel.baseUrl}`);
  console.log(`[Model] Reasoning: ${currentModel.reasoning}`);
  console.log(`[Model] Context Window: ${currentModel.contextWindow}`);
  console.log(`[Model] Max Tokens: ${currentModel.maxTokens}`);

  // 检查 API Key
  const apiKey = await modelRegistry.getApiKey(currentModel);
  console.log(`[Model] API Key: ${apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT FOUND'}`);

  if (!apiKey) {
    const isOAuth = modelRegistry.isUsingOAuth(currentModel);
    if (isOAuth) {
      console.error(`[Model] ❌ OAuth required for ${currentModel.provider}. Run '/login ${currentModel.provider}'`);
    } else {
      console.error(`[Model] ❌ No API key for ${currentModel.provider}. Run '/login ${currentModel.provider}'`);
    }
    process.exit(1);
  }

  // ============================================================================
  // Step 5: 创建 ResourceLoader
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("📦 Step 5: 创建 ResourceLoader");
  console.log("=".repeat(60) + "\n");

  const resourceLoader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir,
    settingsManager,
    noExtensions: true, // 不加载扩展以简化测试
  });

  await resourceLoader.reload();
  console.log(`[ResourceLoader] Skills: ${resourceLoader.getSkills().skills.length}`);
  console.log(`[ResourceLoader] Prompts: ${resourceLoader.getPrompts().prompts.length}`);

  // ============================================================================
  // Step 6: 创建 SessionManager
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("📝 Step 6: 创建 SessionManager");
  console.log("=".repeat(60) + "\n");

  const sessionId = `test-${Date.now().toString(36)}`;
  const sessionPath = join(sessionsDir, `${sessionId}.jsonl`);
  const sessionDir = dirname(sessionPath);

  const sessionManager = SessionManager.create(process.cwd(), sessionDir);
  console.log(`[SessionManager] Session ID: ${sessionId}`);
  console.log(`[SessionManager] Session path: ${sessionPath}`);

  // ============================================================================
  // Step 7: 构建 AgentSession 配置
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("🔧 Step 7: 构建 AgentSession 配置");
  console.log("=".repeat(60) + "\n");

  // 构建系统提示词
  const systemPrompt = `You are an autonomous task execution agent running in background mode.

Your responsibilities:
1. Execute tasks efficiently without user interaction
2. Use available tools to gather information and perform actions
3. Provide clear, structured results
4. Report progress and completion status

Guidelines:
- Be concise but thorough
- Use tools when needed, don't rely solely on training data
- Structure output for easy parsing
- Indicate completion with clear status`;

  console.log(`[Config] System prompt length: ${systemPrompt.length} chars`);

  // 创建 Agent 核心
  console.log(`[Config] Creating AgentCore with model: ${currentModel.provider}/${currentModel.id}`);
  const agent = new AgentCore({
    initialState: {
      model: currentModel,
      systemPrompt,
    },
    // 关键：设置 getApiKey 回调，让 Agent 能够获取 API key
    getApiKey: async (provider: string) => {
      console.log(`[Agent.getApiKey] Provider: ${provider}`);
      const key = await modelRegistry.getApiKeyForProvider(provider);
      console.log(`[Agent.getApiKey] Key: ${key ? `${key.slice(0, 8)}...` : 'NOT FOUND'}`);
      return key;
    },
  });

  console.log(`[Config] Agent created, agent.state.model: ${agent.state.model?.provider}/${agent.state.model?.id}`);

  // 工具列表
  const tools = ["read", "bash", "edit", "write", "glob", "grep"];
  console.log(`[Config] Tools: ${tools.join(", ")}`);

  // ============================================================================
  // Step 8: 创建 AgentSession
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("🚀 Step 8: 创建 AgentSession");
  console.log("=".repeat(60) + "\n");

  const agentSession = new AgentSession({
    agent,
    sessionManager,
    settingsManager,
    cwd: process.cwd(),
    resourceLoader,
    modelRegistry,
    initialActiveToolNames: tools,
  });

  console.log(`[AgentSession] Created successfully`);
  console.log(`[AgentSession] Model: ${agentSession.model?.provider}/${agentSession.model?.id}`);

  // ============================================================================
  // Step 9: 订阅所有事件
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("👂 Step 9: 订阅所有事件");
  console.log("=".repeat(60) + "\n");

  let messageBuffer = "";
  let turnCount = 0;
  let agentEndReceived = false;

  const unsubscribe = agentSession.subscribe((event) => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);

    // 从 turn_start/turn_end 事件更新 turnIndex
    let currentTurnIndex = 0;
    if (event.type === 'turn_start' || event.type === 'turn_end') {
      currentTurnIndex = (event as any).turnIndex ?? 0;
    }
    const turnIndex = currentTurnIndex;

    switch (event.type) {
      case "agent_start": {
        console.log(`\n[${timestamp}] 🚀 AGENT STARTED`);
        break;
      }

      case "agent_end": {
        agentEndReceived = true;
        const reason = (event as any).reason || "completed";
        const error = (event as any).error;
        console.log(`\n[${timestamp}] 🏁 AGENT ENDED, reason: ${reason}`);
        if (error) {
          console.log(`[${timestamp}] ❌ Error: ${JSON.stringify(error)}`);
        }
        console.log(`[${timestamp}] Messages count: ${(event as any).messages?.length || 0}`);

        // 打印最后一条消息
        const messages = (event as any).messages || [];
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          console.log(`[${timestamp}] Last message role: ${lastMsg.role}`);
          if (lastMsg.role === "assistant") {
            const content = lastMsg.content;
            if (Array.isArray(content)) {
              const textBlocks = content.filter((b: any) => b.type === "text");
              for (const block of textBlocks) {
                console.log(`[${timestamp}] Assistant text: ${block.text?.slice(0, 200)}...`);
              }
            }
          }
        }
        break;
      }

      case "turn_start": {
        turnCount++;
        console.log(`\n[${timestamp}] ─── Turn ${turnIndex} START (count: ${turnCount}) ───`);
        break;
      }

      case "turn_end": {
        console.log(`[${timestamp}] ─── Turn ${turnIndex} END ───\n`);
        break;
      }

      case "message_start": {
        const msg = (event as any).message;
        console.log(`[${timestamp}] 📩 MESSAGE START, role: ${msg.role}`);
        break;
      }

      case "message_delta": {
        const delta = (event as any).delta;
        if (delta?.text) {
          process.stdout.write(delta.text);
          messageBuffer += delta.text;
        }
        break;
      }

      case "content_block_delta": {
        const delta = (event as any).delta;
        if (delta?.text) {
          process.stdout.write(delta.text);
          messageBuffer += delta.text;
        }
        break;
      }

      case "message_stop": {
        if (messageBuffer) {
          console.log("\n");
          console.log(`[${timestamp}] 📝 Message content (${messageBuffer.length} chars):`);
          console.log(messageBuffer.slice(0, 500) + (messageBuffer.length > 500 ? "..." : ""));
          messageBuffer = "";
        }
        break;
      }

      case "message_update": {
        const assistantEvent = (event as any).assistantMessageEvent;
        if (!assistantEvent) break;

        switch (assistantEvent.type) {
          case "thinking_start":
            console.log(`[${timestamp}] 💭 Thinking started...`);
            break;
          case "thinking_delta":
            process.stdout.write(assistantEvent.delta);
            break;
          case "thinking_end":
            console.log(`\n[${timestamp}] 💭 Thinking ended`);
            break;
          case "text_start":
            console.log(`[${timestamp}] 📝 Response text started...`);
            break;
          case "text_delta":
            process.stdout.write(assistantEvent.delta);
            break;
          case "text_end":
            console.log(`\n[${timestamp}] 📝 Response text ended`);
            break;
          case "toolcall_start":
            console.log(`[${timestamp}] 🔧 Tool call started...`);
            break;
          case "toolcall_delta":
            process.stdout.write(assistantEvent.delta);
            break;
          case "toolcall_end":
            console.log(`\n[${timestamp}] 🔧 Tool call ended: ${assistantEvent.toolName || assistantEvent.toolCall?.tool || 'unknown'}`);
            break;
          case "done":
            console.log(`[${timestamp}] ✅ Message done, reason: ${assistantEvent.reason}`);
            break;
          case "error":
            console.log(`[${timestamp}] ❌ Error: ${assistantEvent.errorMessage}`);
            break;
        }
        break;
      }

      case "message_end":
      case "message": {
        const msg = (event as any).message;

        if (msg.role === "user") {
          const content = typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
          console.log(`[${timestamp}] 👤 User message (${content.length} chars)`);
          console.log(`[${timestamp}]    Content: ${content.slice(0, 200)}...`);
        } else if (msg.role === "assistant") {
          console.log(`[${timestamp}] 🤖 Assistant message`);
          const content = typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
          console.log(`[${timestamp}]    Content: ${content.slice(0, 500)}...`);
        } else if (msg.role === "toolResult") {
          console.log(`[${timestamp}] 📋 Tool result`);
        }
        break;
      }

      case "tool_execution_start": {
        const toolName = (event as any).toolName || "unknown";
        const params = (event as any).args;
        console.log(`[${timestamp}] 🔧 TOOL START: ${toolName}`);
        console.log(`[${timestamp}]    Params: ${JSON.stringify(params).slice(0, 200)}`);
        break;
      }

      case "tool_execution_end": {
        const toolName = (event as any).toolName || "unknown";
        const result = (event as any).result;
        const isError = (event as any).isError;
        if (isError) {
          console.log(`[${timestamp}] ❌ TOOL ERROR: ${toolName}`);
          console.log(`[${timestamp}]    Error: ${JSON.stringify(result).slice(0, 200)}`);
        } else {
          console.log(`[${timestamp}] ✅ TOOL END: ${toolName}`);
          console.log(`[${timestamp}]    Result: ${JSON.stringify(result).slice(0, 200)}...`);
        }
        break;
      }

      case "error": {
        const errorMsg = (event as any).message || "Unknown error";
        console.log(`[${timestamp}] ❌ ERROR: ${errorMsg}`);
        break;
      }

      default: {
        // 未识别的事件
        // console.log(`[${timestamp}] ❓ Unknown event: ${event.type}`);
        break;
      }
    }
  });

  console.log("[Subscribe] Event listener registered");

  // ============================================================================
  // Step 10: 执行测试 Prompt
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("📤 Step 10: 执行测试 Prompt");
  console.log("=".repeat(60) + "\n");

  const testPrompt = "Hello! Please respond with a brief greeting and tell me what tools you have available.";

  console.log(`[Prompt] Sending: "${testPrompt}"`);
  console.log(`[Prompt] Model: ${agentSession.model?.provider}/${agentSession.model?.id}`);
  console.log(`[Prompt] Streaming started...\n`);

  const startTime = Date.now();

  try {
    console.log(`[Prompt] Calling agentSession.prompt()...`);
    console.log(`[Prompt] agentSession.model: ${agentSession.model?.provider}/${agentSession.model?.id}`);
    console.log(`[Prompt] agent.state.model: ${agent.state.model?.provider}/${agent.state.model?.id}`);
    console.log(`[Prompt] agent.state.isStreaming: ${agent.state.isStreaming}`);
    console.log(`[Prompt] agent.state.tools: ${agent.state.tools?.length || 0}`);

    await agentSession.prompt(testPrompt, {
      expandPromptTemplates: true,
      source: "background_task",
    });

    const duration = Date.now() - startTime;
    console.log(`\n[Prompt] ✅ Prompt completed in ${duration}ms`);
  } catch (error) {
    console.error(`\n[Prompt] ❌ Error:`, error);
    if (error instanceof Error) {
      console.error(`[Prompt] Error stack:`, error.stack);
    }
  }

  // ============================================================================
  // Step 11: 等待并显示结果
  // ============================================================================

  console.log("\n" + "=".repeat(60));
  console.log("📊 Step 11: 结果汇总");
  console.log("=".repeat(60) + "\n");

  console.log(`[Result] Total turns: ${turnCount}`);
  console.log(`[Result] Agent end received: ${agentEndReceived}`);
  console.log(`[Result] Duration: ${Date.now() - startTime}ms`);

  // 清理
  unsubscribe();

  console.log("\n[DONE] Test completed.\n");
  process.exit(0);
}

// 运行主函数
main().catch((error) => {
  console.error("\n[FATAL] Unhandled error:", error);
  process.exit(1);
});
