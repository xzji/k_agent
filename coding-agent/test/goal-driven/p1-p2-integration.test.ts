/**
 * P1 & P2 Integration Tests
 *
 * Tests for information collection, relevance judgment,
 * action reasoning, capability resolution, and execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BackgroundLLMChannel } from "../../src/core/goal-driven/background-loop/llm-channel.js";
import { InfoCollector } from "../../src/core/goal-driven/info-engine/info-collector.js";
import { RelevanceJudge } from "../../src/core/goal-driven/info-engine/relevance-judge.js";
import { ActionReasoner } from "../../src/core/goal-driven/action-pipeline/action-reasoner.js";
import { CapabilityResolver } from "../../src/core/goal-driven/action-pipeline/capability-resolver.js";
import { PreActionGate } from "../../src/core/goal-driven/action-pipeline/pre-action-gate.js";
import { type GoalNode, type DimensionNode, type DataSource } from "../../src/core/goal-driven/types.js";

// Mock ModelRegistry for testing
class MockModelRegistry {
	getApiKey = async () => "test-api-key";
}

describe("P1: Info Engine", () => {
	let goal: GoalNode;
	let dimension: DimensionNode;
	let sources: DataSource[];

	beforeEach(() => {
		goal = {
			id: "goal-1",
			parentId: null,
			title: "Research AI Agent frameworks",
			description: "Investigate available AI agent frameworks",
			status: "active",
			authorizationDepth: "full_auto",
			priority: 7,
			constraints: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		dimension = {
			id: "dim-1",
			goalId: goal.id,
			parentDimensionId: null,
			title: "Open Source Frameworks",
			description: "Explore open source AI agent frameworks",
			core_questions: [
				"What are the top open source AI agent frameworks?",
				"Which frameworks have the most active communities?",
				"What are the key features of each framework?"
			],
			status: "pending",
			explorationDepth: 0,
			estimated_depth: 3,
			timeliness: "normal",
			refresh_interval: "weekly",
			valueScore: 8,
			children: [],
			dataSources: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		sources = [{
			id: "source-1",
			type: "web_search",
			name: "Web Search",
			config: {},
			reachable: true,
			lastCheckedAt: Date.now(),
		}];
	});

	describe("InfoCollector", () => {
		it("should initialize", () => {
			const collector = new InfoCollector();
			expect(collector).toBeDefined();
		});

		// Note: Full integration test would require actual search API
		// This is a unit test skeleton
	});

	describe("RelevanceJudge", () => {
		it("should initialize with LLM channel", () => {
			const llm = new BackgroundLLMChannel(new MockModelRegistry() as any);
			const judge = new RelevanceJudge(llm);
			expect(judge).toBeDefined();
		});

		// Note: Would require mock LLM responses for full testing
	});
});

describe("P2: Action Pipeline", () => {
	let goal: GoalNode;
	let dimension: DimensionNode;
	let llm: BackgroundLLMChannel;

	beforeEach(() => {
		goal = {
			id: "goal-1",
			parentId: null,
			title: "Build a todo list app",
			description: "Create a simple todo list application",
			status: "active",
			authorizationDepth: "full_auto",
			priority: 8,
			constraints: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		dimension = {
			id: "dim-1",
			goalId: goal.id,
			parentDimensionId: null,
			title: "Tech Stack",
			description: "Determine the technology stack",
			core_questions: [
				"What are the best frameworks for building todo apps?",
				"Should we use React, Vue, or Angular?",
				"What backend framework should we use?"
			],
			status: "pending",
			explorationDepth: 0,
			estimated_depth: 2,
			timeliness: "normal",
			refresh_interval: "weekly",
			valueScore: 9,
			children: [],
			dataSources: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		llm = new BackgroundLLMChannel(new MockModelRegistry() as any);
	});

	describe("ActionReasoner", () => {
		it("should initialize with LLM channel", () => {
			const reasoner = new ActionReasoner(llm);
			expect(reasoner).toBeDefined();
		});

		it("should have reasonNextAction method", async () => {
			const reasoner = new ActionReasoner(llm);
			expect(typeof reasoner.reasonNextAction).toBe("function");
		});
	});

	describe("CapabilityResolver", () => {
		it("should initialize with LLM channel", () => {
			const resolver = new CapabilityResolver(llm);
			expect(resolver).toBeDefined();
		});

		it("should have resolve method", async () => {
			const resolver = new CapabilityResolver(llm);
			expect(typeof resolver.resolve).toBe("function");
		});
	});

	describe("PreActionGate", () => {
		it("should initialize with LLM channel", () => {
			const gate = new PreActionGate(llm);
			expect(gate).toBeDefined();
		});

		it("should have evaluate method", async () => {
			const gate = new PreActionGate(llm);
			expect(typeof gate.evaluate).toBe("function");
		});

		it("should reject monitor-only goals", async () => {
			const gate = new PreActionGate(llm);
			const monitorGoal = { ...goal, authorizationDepth: "monitor" as const };
			const plan = {
				id: "plan-1",
				goalId: goal.id,
				dimensionId: dimension.id,
				triggerInfoIds: [],
				what: "Test action",
				why: "Test",
				expectedOutcome: "Test",
				goalImpact: "Test",
				costEstimate: "low" as const,
				urgency: "normal" as const,
				successProbability: 8,
				requiresUserInvolvement: false,
				reversible: true,
				reasoningTrace: "",
				alternativeActions: [],
				knowledgeToSave: "",
				status: "proposed" as const,
				createdAt: Date.now(),
			};

			const result = await gate.evaluate(monitorGoal, plan);
			expect(result).toBe("needs_user");
		});
	});
});
