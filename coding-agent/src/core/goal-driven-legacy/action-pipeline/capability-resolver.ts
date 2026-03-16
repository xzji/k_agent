import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, CapabilityResolution, ToolStep } from "../types.js";

/**
 * CapabilityResolver
 *
 * Determines HOW to execute an ActionPlan by analyzing available capabilities
 * and selecting the best approach (Level 1-4 strategy).
 *
 * Level 1: Direct tool match (use existing tool)
 * Level 2: Tool composition (chain multiple tools)
 * Level 3: Code generation (write script to solve)
 * Level 4: User help request (ask user for assistance)
 */
export class CapabilityResolver {
	private llm: BackgroundLLMChannel;
	private availableTools: string[] = [
		"bash",          // Execute bash commands
		"web_search",    // Search the web
		"read",          // Read file contents
		"write",         // Write/create files
		"edit",          // Edit existing files
		"grep",          // Search in files
		"find",          // Find files
		"ls",            // List directory
	];

	constructor(llm: BackgroundLLMChannel) {
		this.llm = llm;
	}

	/**
	 * Resolve how to execute the given ActionPlan
	 */
	async resolve(plan: ActionPlan): Promise<CapabilityResolution> {
		// First, ask LLM to analyze the action and determine the approach
		const prompt = `You are a Capability Resolver. Analyze this action plan and determine the best way to execute it.

Action to perform: ${plan.what}
Expected outcome: ${plan.expectedOutcome}
Cost estimate: ${plan.costEstimate}
Urgency: ${plan.urgency}

Available tools: ${this.availableTools.join(", ")}

Determine the execution strategy:
- Level 1: Can be done with a single existing tool directly
- Level 2: Needs multiple tools chained together
- Level 3: Needs custom code/script (write a temp script and run it)
- Level 4: Cannot be automated, needs user help

Provide your analysis as JSON (respond with ONLY valid JSON, no other text):
{
  "level": 1,
  "toolChain": [
    {
      "toolName": "bash",
      "description": "brief description",
      "input": {},
      "dependsOn": []
    }
  ],
  "reasoning": "brief explanation",
  "needsUserHelp": false
}`;

		try {
			const response = await this.llm.chatJSON<{
				level: 1 | 2 | 3 | 4;
				toolChain: Array<{
					toolName: string;
					description: string;
					input: Record<string, unknown>;
					dependsOn?: string[];
				}>;
				reasoning: string;
				needsUserHelp: boolean;
			}>({
				systemPrompt: "You are a Capability Resolver. Always respond with valid JSON only. Do not include any text outside the JSON object.",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.3  // Lower temperature for more consistent JSON
			});

			// Convert to our ToolStep format
			const toolChain: ToolStep[] = response.toolChain.map((step, index) => ({
				toolName: step.toolName,
				description: step.description,
				input: step.input,
				dependsOn: step.dependsOn
			}));

			if (response.level === 4 || response.needsUserHelp) {
				// Level 4: Need user help
				return {
					level: 4,
					toolChain: [],
					needsUserHelp: true,
					userHelpRequest: {
						whatAgentWantsToDo: plan.what,
						why: plan.why,
						blockedBy: response.reasoning,
						whatUserNeedsToDo: this.extractUserTask(response),
						agentPreparedParts: this.generateUserHelpPreparation(plan)
					}
				};
			}

			// Level 1-3: Automated execution
			return {
				level: response.level,
				toolChain,
				needsUserHelp: false
			};

		} catch (error) {
			// Log the actual error with more context
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("CapabilityResolver LLM error:", errorMessage);

			// If it's a JSON parsing error, try to get the raw response
			if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
				console.error("JSON parsing failed. The LLM may have returned non-JSON response.");
				console.error("Action being analyzed:", plan.what);
				console.error("Using fallback resolution...");
			}

			// Fallback: Treat as Level 2 with a generic bash/web_search approach
			const fallbackChain: ToolStep[] = [
				{
					toolName: plan.urgency === "urgent" ? "web_search" : "bash",
					description: plan.what,
					input: plan.urgency === "urgent"
						? { query: this.extractSearchQuery(plan.what) || plan.what }
						: { command: this.extractSearchQuery(plan.what) || `echo "Analyzing: ${plan.what}"` }
				}
			];

			return {
				level: 2,
				toolChain: fallbackChain,
				needsUserHelp: false
			};
		}
	}

	/**
	 * Extract a search query from natural language description
	 */
	private extractSearchQuery(what: string): string | null {
		// Simple heuristic: look for search-related keywords
		const searchKeywords = ["search", "find", "look up", "google", "query"];
		const lowerWhat = what.toLowerCase();

		for (const keyword of searchKeywords) {
			if (lowerWhat.includes(keyword)) {
				// Extract what to search for
				const match = what.match(new RegExp(`${keyword}\\s+(?:for\\s+)?(.+)`, "i"));
				return match ? match[1].trim() : null;
			}
		}

		return null;
	}

	/**
	 * Extract what the user needs to do for Level 4 cases
	 */
	private extractUserTask(response: { reasoning: string }): string {
		// Generate a clear user task description
		return `The agent needs assistance with: ${response.reasoning}. Please perform this action manually or provide the necessary resources.`;
	}

	/**
	 * Generate prepared parts to help the user
	 */
	private generateUserHelpPreparation(plan: ActionPlan): string {
		return `Context for the action:
- Goal: ${plan.goalImpact}
- Action: ${plan.what}
- Why: ${plan.why}
- Expected: ${plan.expectedOutcome}`;
	}
}
