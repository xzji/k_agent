/**
 * Goal-Driven Agent Configuration Store
 *
 * Manages configuration persistence and runtime updates with change notification.
 * Stores configuration in JSON format at `~/.pi/agent/goal-driven/config.json`.
 */

import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import type { GoalDrivenConfig } from "./types.js";
import { DEFAULT_GOAL_DRIVEN_CONFIG, CONFIG_RANGES } from "./types.js";

export class GoalDrivenConfigStore {
  private config: GoalDrivenConfig;
  private configPath: string;
  private listeners: Set<(config: GoalDrivenConfig) => void> = new Set();

  constructor(dataDir: string) {
    this.configPath = join(dataDir, "config.json");
    this.config = { ...DEFAULT_GOAL_DRIVEN_CONFIG };
  }

  async init(): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Load existing config
    if (existsSync(this.configPath)) {
      try {
        const data = readFileSync(this.configPath, "utf-8");
        const loaded = JSON.parse(data);
        this.config = { ...DEFAULT_GOAL_DRIVEN_CONFIG, ...loaded };
      } catch (error) {
        console.error("[GoalDrivenConfig] Failed to load config:", error);
      }
    } else {
      // Create default config
      await this.save();
    }
  }

  getConfig(): GoalDrivenConfig {
    return { ...this.config };
  }

  get<K extends keyof GoalDrivenConfig>(key: K): GoalDrivenConfig[K] {
    return this.config[key];
  }

  async updateConfig(updates: Partial<GoalDrivenConfig>): Promise<void> {
    // Validate config
    const errors = this.validateConfig(updates);
    if (errors.length > 0) {
      throw new Error(`Config validation failed: ${errors.join(", ")}`);
    }

    // Update config
    this.config = { ...this.config, ...updates };
    await this.save();

    // Notify listeners
    for (const listener of this.listeners) {
      listener(this.getConfig());
    }
  }

  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_GOAL_DRIVEN_CONFIG };
    await this.save();
    for (const listener of this.listeners) {
      listener(this.getConfig());
    }
  }

  onChange(listener: (config: GoalDrivenConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private validateConfig(updates: Partial<GoalDrivenConfig>): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const range = CONFIG_RANGES[key as keyof GoalDrivenConfig];
      if (range && (value < range.min || value > range.max)) {
        errors.push(`${key} must be between ${range.min} and ${range.max}`);
      }
    }

    // Validate that min rounds <= max rounds
    if (updates.minInfoCollectionRounds !== undefined || updates.maxInfoCollectionRounds !== undefined) {
      const newMin = updates.minInfoCollectionRounds ?? this.config.minInfoCollectionRounds;
      const newMax = updates.maxInfoCollectionRounds ?? this.config.maxInfoCollectionRounds;
      if (newMin > newMax) {
        errors.push("minInfoCollectionRounds cannot be greater than maxInfoCollectionRounds");
      }
    }

    // Validate llmLogMode
    if (updates.llmLogMode !== undefined) {
      const validModes = ['minimal', 'standard', 'verbose'];
      if (!validModes.includes(updates.llmLogMode)) {
        errors.push(`llmLogMode must be one of: ${validModes.join(', ')}`);
      }
    }

    return errors;
  }

  private async save(): Promise<void> {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }
}
