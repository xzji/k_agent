import type { ExtensionAPI } from "../../extensions/types.js";
import { ActionPlan, CapabilityResolution, ExecutionResult, ToolStep } from "../types.js";
import { generateId } from "../utils.js";

/**
 * Executor
 *
 * Executes an approved ActionPlan using the resolved capability (tool chain).
 * For P2, supports bash commands, web search, and basic file operations.
 */
export class Executor {
	private pi: ExtensionAPI;
	private llm: any; // BackgroundLLMChannel (optional, for complex tasks)

	constructor(pi: ExtensionAPI, llm?: any) {
		this.pi = pi;
		this.llm = llm;
	}

	/**
	 * Executes the approved ActionPlan with the given capability resolution
	 */
	async execute(plan: ActionPlan, resolution: CapabilityResolution): Promise<ExecutionResult> {
		if (resolution.needsUserHelp) {
			// Level 4: Request user help
			return {
				actionPlanId: plan.id,
				status: "failed",
				stepResults: [],
				output: "This action requires user assistance",
				newDimensions: [],
				executedAt: Date.now()
			};
		}

		const stepResults: ExecutionResult["stepResults"] = [];
		const outputs: Map<string, string> = new Map();

		for (const step of resolution.toolChain) {
			// Check dependencies
			if (step.dependsOn && step.dependsOn.length > 0) {
				const allDepsMet = step.dependsOn.every(depId => {
					const depResult = stepResults.find(r => r.stepId === depId);
					return depResult?.status === "success";
				});
				if (!allDepsMet) {
					stepResults.push({
						stepId: step.toolName,
						status: "skipped",
						reason: "Dependencies not met"
					});
					continue;
				}
			}

			// Execute the step with retry
			let result: ExecutionResult["stepResults"][0] = {
				stepId: step.toolName,
				status: "failed",
				error: "Execution failed after retries"
			};
			for (let attempt = 0; attempt < 3; attempt++) {
				result = await this.executeStep(step, outputs);

				if (result.status === "success") {
					break;
				}

				// If failed and not the last attempt, could retry with adjustment
				if (attempt < 2) {
					// For now, just retry as-is. In full version, would use LLM to adjust.
					await this.sleep(1000 * (attempt + 1)); // Backoff
				}
			}

			stepResults.push(result);

			if (result.status === "success" && result.output) {
				outputs.set(step.toolName, result.output);
			}
		}

		// Aggregate results
		const allSuccess = stepResults.every(r => r.status === "success" || r.status === "skipped");
		const finalOutput = Array.from(outputs.values()).join("\n\n");

		return {
			actionPlanId: plan.id,
			status: allSuccess ? "completed" : "partial",
			stepResults,
			output: finalOutput,
			newDimensions: [], // Could be populated by analyzing output
			executedAt: Date.now()
		};
	}

	/**
	 * Execute a single tool step
	 */
	private async executeStep(
		step: ToolStep,
		priorOutputs: Map<string, string>
	): Promise<ExecutionResult["stepResults"][0]> {
		try {
			switch (step.toolName) {
				case "bash":
					return await this.executeBash(step.input);

				case "web_search":
					return await this.executeWebSearch(step.input);

				case "read":
					return await this.executeRead(step.input);

				case "write":
					return await this.executeWrite(step.input, priorOutputs);

				case "grep":
					return await this.executeGrep(step.input);

				case "find":
					return await this.executeFind(step.input);

				case "ls":
					return await this.executeLs(step.input);

				case "llm_analysis":
					return await this.executeLLMAnalysis(step.input, priorOutputs);

				default:
					return {
						stepId: step.toolName,
						status: "failed",
						error: `Unknown tool: ${step.toolName}`
					};
			}
		} catch (error) {
			return {
				stepId: step.toolName,
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Execute bash command via pi.exec
	 */
	private async executeBash(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const command = String(input.command || "");

		try {
			// Parse command and args
			const parts = command.trim().split(/\s+/);
			const cmd = parts[0] || "echo";
			const args = parts.slice(1);

			// Use ExtensionAPI's exec method
			const result = await this.pi.exec(cmd, args, {
				timeout: 30000 // 30 second timeout
			});

			return {
				stepId: "bash",
				status: result.code === 0 ? "success" : "failed",
				output: result.stdout || result.stderr,
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "bash",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Execute web search using SearXNG (no API key required)
	 */
	private async executeWebSearch(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const query = String(input.query || "");

		try {
			// Use SearXNG (same as websearch extension)
			const DEFAULT_SEARXNG_URL = "https://sousuo.emoe.top/search";
			const apiUrl = process.env.SEARXNG_URL || DEFAULT_SEARXNG_URL;
			const url = new URL(apiUrl);
			url.searchParams.append("q", query);
			url.searchParams.append("format", "json");
			url.searchParams.append("language", "auto");
			url.searchParams.append("categories", "general");

			const response = await fetch(url.toString());

			if (!response.ok) {
				return {
					stepId: "web_search",
					status: "failed",
					error: `SearXNG API failed: ${response.statusText}`
				};
			}

			const data = await response.json();

			if (!data.results || data.results.length === 0) {
				return {
					stepId: "web_search",
					status: "success",
					output: `No results found for query: ${query}`
				};
			}

			// Format results
			let output = `Found ${data.results.length} results for "${query}":\n\n`;
			for (const [index, result] of data.results.slice(0, 5).entries()) {
				const snippet = result.content?.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").substring(0, 100) || "";
				output += `${index + 1}. ${result.title}\n   ${snippet}\n   ${result.url}\n\n`;
			}

			return {
				stepId: "web_search",
				status: "success",
				output: output.trim()
			};
		} catch (error) {
			return {
				stepId: "web_search",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Read file contents
	 */
	private async executeRead(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const filePath = String(input.path || "");

		try {
			const result = await this.pi.exec("cat", [filePath]);

			return {
				stepId: "read",
				status: result.code === 0 ? "success" : "failed",
				output: result.stdout,
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "read",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Write content to file
	 */
	private async executeWrite(
		input: Record<string, unknown>,
		priorOutputs: Map<string, string>
	): Promise<ExecutionResult["stepResults"][0]> {
		const filePath = String(input.path || "");
		// Use content from input or from prior step outputs
		const content = String(input.content || priorOutputs.get("llm_analysis") || "");

		try {
			// Write using bash with heredoc for multi-line support
			// Use printf to avoid issues with special characters
			const escapedContent = content.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
			const script = `printf '%s\\n' "${escapedContent}" > "${filePath}"`;

			const parts = script.trim().split(/\s+/);
			const cmd = parts[0] || "printf";
			const args = parts.slice(1);

			const result = await this.pi.exec(cmd, args);

			return {
				stepId: "write",
				status: result.code === 0 ? "success" : "failed",
				output: `Written to ${filePath}`,
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "write",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Grep for patterns in files
	 */
	private async executeGrep(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const pattern = String(input.pattern || "");
		const path = String(input.path || ".");

		try {
			const result = await this.pi.exec("grep", ["-r", pattern, path, "|", "head", "-20"]);

			return {
				stepId: "grep",
				status: result.code === 0 ? "success" : "failed",
				output: result.stdout || "No matches found",
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "grep",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Find files
	 */
	private async executeFind(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const path = String(input.path || ".");
		const name = String(input.name || "");
		const type = String(input.type || "");

		try {
			const args = [path];
			if (name) args.push("-name", name);
			if (type) args.push("-type", type);
			args.push("|", "head", "-20");

			const result = await this.pi.exec("find", args);

			return {
				stepId: "find",
				status: result.code === 0 ? "success" : "failed",
				output: result.stdout || "No files found",
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "find",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * List directory contents
	 */
	private async executeLs(input: Record<string, unknown>): Promise<ExecutionResult["stepResults"][0]> {
		const path = String(input.path || ".");

		try {
			const result = await this.pi.exec("ls", ["-la", path]);

			return {
				stepId: "ls",
				status: result.code === 0 ? "success" : "failed",
				output: result.stdout,
				error: result.code !== 0 ? result.stderr : undefined
			};
		} catch (error) {
			return {
				stepId: "ls",
				status: "failed",
				error: String(error)
			};
		}
	}

	/**
	 * Execute LLM analysis step
	 */
	private async executeLLMAnalysis(
		input: Record<string, unknown>,
		priorOutputs: Map<string, string>
	): Promise<ExecutionResult["stepResults"][0]> {
		if (!this.llm) {
			return {
				stepId: "llm_analysis",
				status: "failed",
				error: "LLM not available"
			};
		}

		const prompt = String(input.prompt || "");
		const context = String(input.context || "");

		try {
			const response = await this.llm.chat({
				systemPrompt: "You are analyzing information for a goal-driven autonomous agent.",
				messages: [
					{ role: "user", content: `${context}\n\nTask: ${prompt}` }
				]
			});

			return {
				stepId: "llm_analysis",
				status: "success",
				output: response.content
			};
		} catch (error) {
			return {
				stepId: "llm_analysis",
				status: "failed",
				error: String(error)
			};
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
