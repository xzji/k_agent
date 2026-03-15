import { BackgroundLLMChannel } from "../background-loop/llm-channel.js";
import { ActionPlan, DimensionNode, GoalNode, InfoItem } from "../types.js";
import { generateId } from "../utils.js";

/**
 * ActionReasoner
 *
 * Uses LLM to reason over collected info and generate the next ActionPlan for a dimension.
 *
 * Enhanced with:
 * - Five-step reasoning chain for deeper analysis
 * - Multiple alternative actions (2-3 options)
 * - Dynamic goalImpact calculation based on action characteristics
 */
export class ActionReasoner {
	private llm: BackgroundLLMChannel;

	constructor(llm: BackgroundLLMChannel) {
		this.llm = llm;
	}

	async reasonNextAction(
		goal: GoalNode,
		dimension: DimensionNode,
		recentInfo: InfoItem[]
	): Promise<ActionPlan | null> {
		const infoContext = recentInfo.map(i => `- ${i.content}`).join("\n");

		const prompt = `You are an autonomous Action Reasoner. Your task is to determine the best immediate next step for an AI agent.

**GOAL**: ${goal.title}
**Dimension**: ${dimension.title}
**Dimension Description**: ${dimension.description}
**Current Exploration Depth**: ${dimension.explorationDepth}/${dimension.estimated_depth}
**Core Questions**: ${dimension.core_questions.join(", ")}

**RECENT FINDINGS**:
${infoContext || "(No new specific findings yet)"}

**YOUR TASK - FIVE-STEP REASONING CHAIN**:

Step 1: Analyze Current State
- What do we know so far about this dimension?
- What specific gaps remain in our understanding?
- How close are we to completing this dimension's exploration?

Step 2: Identify Key Problems
- What are the 1-2 most critical questions we still need to answer?
- What information would have the highest impact on goal completion?
- What blockers or dependencies exist?

Step 3: Generate Candidate Actions
- Brainstorm 3 different actions the agent could take next
- Ensure variety: one information gathering, one analytical, one synthetic
- For each action, briefly describe what it does and why

Step 4: Evaluate and Select
- For each candidate, assess: success probability (1-10), cost (low/medium/high), urgency
- Rank candidates by overall value (impact × probability ÷ cost)
- Select the top choice as the primary action

Step 5: Formulate Execution Plan
- For the selected action, specify: exact command/query/search terms
- What tools or capabilities are needed?
- What would constitute success?
- What are the fallback options if it fails?

**RESPONSE FORMAT** (JSON only):
{
  "step1_stateAnalysis": "Your analysis of current state",
  "step2_keyProblems": ["problem 1", "problem 2"],
  "step3_candidates": [
    {
      "what": "Action description 1",
      "why": "Reason this action makes sense",
      "expectedOutcome": "What we hope to achieve",
      "costEstimate": "low|medium|high",
      "urgency": "urgent|normal|can_wait",
      "successProbability": 1-10,
      "requiresUserInvolvement": false,
      "reversible": true,
      "impactCategory": "high|medium|low"  // How much this moves the goal forward
    },
    {
      "what": "Action description 2",
      ... (same structure)
    },
    {
      "what": "Action description 3",
      ... (same structure)
    }
  ],
  "step4_evaluation": {
    "selectedIndex": 0,  // Which candidate was selected (0-2)
    "selectionReason": "Why this one was chosen over the others",
    "rankings": "Brief ranking explanation"
  },
  "step5_executionPlan": {
    "primaryAction": {
      "what": "Detailed action description (can be same as candidate)",
      "why": "Detailed reasoning",
      "expectedOutcome": "Specific expected result",
      "costEstimate": "low|medium|high",
      "urgency": "urgent|normal|can_wait",
      "successProbability": 1-10,
      "requiresUserInvolvement": false,
      "reversible": true
    },
    "toolsNeeded": ["tool1", "tool2"],  // e.g., ["web_search", "bash"]
    "successCriteria": "Specific indicators of success",
    "fallbackOptions": "What to do if this fails"
  }
}

**IMPORTANT**:
- Be specific and actionable. Instead of "search the web", say "search for 'X vs Y comparison 2024'"
- Consider the exploration depth. Early stages: gather broad info. Later stages: deepen/synthesize.
- Ensure at least 2-3 candidates in step3_candidates array.
- All probabilities should be realistic (5-8 for normal actions, 8-10 for low-risk, 3-5 for complex/uncertain)`;

		try {
			const parsed = await this.llm.chatJSON<any>({
				systemPrompt: "You are an expert autonomous agent planner. Provide your reasoning as valid JSON following the exact schema requested. Think step by step, be specific and actionable.",
				messages: [{ role: "user", content: prompt }],
				temperature: 0.7, // Slightly higher for creativity in generating alternatives
				maxTokens: 3000 // Allow longer response for detailed reasoning
			});

			// Extract primary action from the five-step reasoning
			const primaryAction = parsed.step5_executionPlan?.primaryAction || parsed.step3_candidates?.[0] || {};

			// Generate alternative actions from candidates
			const alternatives: ActionPlan[] = this.generateAlternativeActions(
				goal.id,
				dimension.id,
				recentInfo.map(i => i.id),
				parsed.step3_candidates || [],
				parsed.step4_evaluation?.selectedIndex || 0
			);

			// Calculate dynamic goal impact
			const goalImpact = this.calculateGoalImpact(
				primaryAction,
				parsed.step4_evaluation?.selectionReason || "",
				parsed.step1_stateAnalysis || "",
				dimension
			);

			// Build reasoning trace from all five steps
			const reasoningTrace = this.buildReasoningTrace(parsed);

			// Build knowledge to save
			const knowledgeToSave = this.buildKnowledgeToSave(parsed);

			return {
				id: generateId(),
				goalId: goal.id,
				dimensionId: dimension.id,
				triggerInfoIds: recentInfo.map(i => i.id),
				what: primaryAction.what || "Explore dimension",
				why: primaryAction.why || "To progress the goal",
				expectedOutcome: primaryAction.expectedOutcome || "Information",
				goalImpact: goalImpact,
				costEstimate: primaryAction.costEstimate || "low",
				urgency: primaryAction.urgency || "normal",
				successProbability: typeof primaryAction.successProbability === 'number'
					? primaryAction.successProbability
					: parseInt(primaryAction.successProbability) || 5,
				requiresUserInvolvement: !!primaryAction.requiresUserInvolvement,
				reversible: primaryAction.reversible !== false,
				reasoningTrace: reasoningTrace,
				alternativeActions: alternatives,
				knowledgeToSave: knowledgeToSave,
				status: "proposed",
				createdAt: Date.now()
			};
		} catch (error) {
			console.error("ActionReasoner error:", error);
			// Fallback placeholder plan
			return {
				id: generateId(),
				goalId: goal.id,
				dimensionId: dimension.id,
				triggerInfoIds: [],
				what: `Explore dimension ${dimension.title} further`,
				why: "Parsing failed, using generic fallback",
				expectedOutcome: "Continue information gathering",
				goalImpact: this.calculateGoalImpact({}, "", "", dimension),
				costEstimate: "low",
				urgency: "normal",
				successProbability: 5,
				requiresUserInvolvement: false,
				reversible: true,
				reasoningTrace: JSON.stringify({ error: String(error), fallback: true }, null, 2),
				alternativeActions: [],
				knowledgeToSave: "",
				status: "proposed",
				createdAt: Date.now()
			};
		}
	}

	/**
	 * Generate alternative actions from candidates (excluding the selected one)
	 */
	private generateAlternativeActions(
		goalId: string,
		dimensionId: string,
		triggerInfoIds: string[],
		candidates: any[],
		selectedIndex: number
	): ActionPlan[] {
		const alternatives: ActionPlan[] = [];

		// Add non-selected candidates as alternatives
		for (let i = 0; i < candidates.length; i++) {
			if (i === selectedIndex) continue; // Skip the selected one
			if (alternatives.length >= 2) break; // Max 2 alternatives

			const candidate = candidates[i];
			if (!candidate || !candidate.what) continue;

			alternatives.push({
				id: generateId(),
				goalId: goalId,
				dimensionId: dimensionId,
				triggerInfoIds: [...triggerInfoIds],
				what: candidate.what || `Alternative action ${i + 1}`,
				why: candidate.why || "Alternative approach",
				expectedOutcome: candidate.expectedOutcome || "Additional information",
				goalImpact: this.calculateGoalImpact(candidate, "", "", { valueScore: 5 } as any),
				costEstimate: candidate.costEstimate || "low",
				urgency: candidate.urgency || "normal",
				successProbability: typeof candidate.successProbability === 'number'
					? candidate.successProbability
					: parseInt(candidate.successProbability) || 5,
				requiresUserInvolvement: !!candidate.requiresUserInvolvement,
				reversible: candidate.reversible !== false,
				reasoningTrace: `Alternative option ${i + 1}`,
				alternativeActions: [], // No nested alternatives
				knowledgeToSave: "",
				status: "proposed",
				createdAt: Date.now()
			});
		}

		return alternatives;
	}

	/**
	 * Calculate dynamic goalImpact based on action characteristics and context
	 */
	private calculateGoalImpact(
		action: any,
		selectionReason: string,
		stateAnalysis: string,
		dimension: DimensionNode
	): string {
		// Extract key factors
		const successProb = action.successProbability || 5;
		const urgency = action.urgency || "normal";
		const cost = action.costEstimate || "low";
		const what = (action.what || "").toLowerCase();
		const why = (action.why || "").toLowerCase();

		// Calculate impact score (0-10)
		let impactScore = 0;

		// Factor 1: Success probability (0-3 points)
		impactScore += (successProb / 10) * 3;

		// Factor 2: Urgency (0-2 points)
		if (urgency === "urgent") impactScore += 2;
		else if (urgency === "normal") impactScore += 1;

		// Factor 3: Cost-effectiveness (0-2 points)
		if (cost === "low") impactScore += 2;
		else if (cost === "medium") impactScore += 1;

		// Factor 4: Action type keywords (0-3 points)
		const highImpactKeywords = [
			"complete", "finalize", "deliver", "synthesize", "analyze", "compare",
			"evaluate", "assess", "deep", "comprehensive", "detailed"
		];
		const mediumImpactKeywords = [
			"search", "gather", "collect", "explore", "investigate"
		];
		const lowImpactKeywords = [
			"check", "verify", "review", "monitor"
		];

		const hasHighImpact = highImpactKeywords.some(kw => what.includes(kw) || why.includes(kw));
		const hasMediumImpact = mediumImpactKeywords.some(kw => what.includes(kw) || why.includes(kw));
		const hasLowImpact = lowImpactKeywords.some(kw => what.includes(kw) || why.includes(kw));

		if (hasHighImpact && !hasLowImpact) impactScore += 3;
		else if (hasMediumImpact) impactScore += 2;
		else if (hasLowImpact) impactScore += 1;

		// Factor 5: Dimension value score (0-2 points)
		// Actions on high-value dimensions have higher impact
		if (dimension.valueScore >= 8) impactScore += 2;
		else if (dimension.valueScore >= 5) impactScore += 1;

		// Normalize to 0-10 range
		impactScore = Math.min(10, Math.max(0, impactScore));

		// Map score to descriptive string
		if (impactScore >= 8) {
			return `High impact - Directly advances goal completion (score: ${impactScore.toFixed(1)}/10)`;
		} else if (impactScore >= 6) {
			return `Medium-high impact - Significant progress toward milestone (score: ${impactScore.toFixed(1)}/10)`;
		} else if (impactScore >= 4) {
			return `Medium impact - Steady progress on dimension (score: ${impactScore.toFixed(1)}/10)`;
		} else if (impactScore >= 2) {
			return `Low-medium impact - Supporting information gathering (score: ${impactScore.toFixed(1)}/10)`;
		} else {
			return `Low impact - Maintenance or verification activity (score: ${impactScore.toFixed(1)}/10)`;
		}
	}

	/**
	 * Build comprehensive reasoning trace from all five steps
	 */
	private buildReasoningTrace(parsed: any): string {
		const steps: string[] = [];

		if (parsed.step1_stateAnalysis) {
			steps.push(`**Step 1: Current State Analysis**\n${parsed.step1_stateAnalysis}`);
		}

		if (parsed.step2_keyProblems && Array.isArray(parsed.step2_keyProblems)) {
			steps.push(`**Step 2: Key Problems**\n${parsed.step2_keyProblems.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`);
		}

		if (parsed.step3_candidates && Array.isArray(parsed.step3_candidates)) {
			steps.push(`**Step 3: Candidate Actions**\n${parsed.step3_candidates.map((c: any, i: number) =>
				`Option ${i + 1}: ${c.what}\n  Reason: ${c.why}\n  Impact: ${c.impactCategory || "medium"}\n  Success: ${c.successProbability}/10`
			).join("\n\n")}`);
		}

		if (parsed.step4_evaluation) {
			steps.push(`**Step 4: Evaluation**\nSelected: Option ${parsed.step4_evaluation.selectedIndex + 1}\nReason: ${parsed.step4_evaluation.selectionReason}\nRankings: ${parsed.step4_evaluation.rankings}`);
		}

		if (parsed.step5_executionPlan) {
			steps.push(`**Step 5: Execution Plan**\nTools: ${(parsed.step5_executionPlan.toolsNeeded || []).join(", ")}\nSuccess Criteria: ${parsed.step5_executionPlan.successCriteria}\nFallback: ${parsed.step5_executionPlan.fallbackOptions}`);
		}

		return steps.length > 0 ? steps.join("\n\n") : "No detailed reasoning trace available";
	}

	/**
	 * Build knowledge to save from reasoning process
	 */
	private buildKnowledgeToSave(parsed: any): string {
		const knowledge: string[] = [];

		// Save key problems identified
		if (parsed.step2_keyProblems && Array.isArray(parsed.step2_keyProblems)) {
			knowledge.push(`Key Problems: ${parsed.step2_keyProblems.join("; ")}`);
		}

		// Save state analysis for future reference
		if (parsed.step1_stateAnalysis) {
			// Just save the key insight, not the full analysis
			const firstLine = parsed.step1_stateAnalysis.split("\n")[0];
			knowledge.push(`State: ${firstLine.substring(0, 100)}...`);
		}

		// Save alternative actions considered
		if (parsed.step3_candidates && Array.isArray(parsed.step3_candidates)) {
			const alternatives = parsed.step3_candidates.map((c: any) => c.what).filter(Boolean).join("; ");
			if (alternatives) {
				knowledge.push(`Alternatives Considered: ${alternatives}`);
			}
		}

		return knowledge.join("\n\n");
	}
}
