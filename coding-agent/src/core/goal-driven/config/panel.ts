/**
 * Goal-Driven Agent Configuration Panel
 *
 * Interactive UI for viewing and modifying configuration settings.
 */

import type { ExtensionCommandContext } from "../../extensions/types.js";
import type { GoalDrivenConfigStore } from "./store.js";
import { CONFIG_LABELS, CONFIG_DESCRIPTIONS, CONFIG_RANGES, type GoalDrivenConfig } from "./types.js";

export class ConfigPanel {
  constructor(private configStore: GoalDrivenConfigStore) {}

  async open(ctx: ExtensionCommandContext): Promise<void> {
    while (true) {
      const config = this.configStore.getConfig();
      const options = this.buildMenuOptions(config);

      const choice = await ctx.ui.select(
        "⚙️ Goal-Driven Agent 配置",
        options
      );

      if (!choice || choice === "🔙 返回") break;

      if (choice === "🔄 重置为默认值") {
        const confirmed = await ctx.ui.confirm(
          "确认重置",
          "确定要重置所有配置为默认值吗？"
        );
        if (confirmed) {
          await this.configStore.resetToDefaults();
          ctx.ui.notify("✅ 配置已重置为默认值", "info");
        }
        continue;
      }

      // Extract config item key
      const key = this.extractKeyFromOption(choice);
      if (key) {
        await this.editConfigItem(ctx, key);
      }
    }
  }

  private buildMenuOptions(config: GoalDrivenConfig): string[] {
    const options: string[] = [];

    for (const [key, label] of Object.entries(CONFIG_LABELS)) {
      const value = config[key as keyof GoalDrivenConfig];
      const range = CONFIG_RANGES[key as keyof GoalDrivenConfig];
      options.push(`${label}: ${value} (${range.min}-${range.max})`);
    }

    options.push("", "🔄 重置为默认值", "🔙 返回");
    return options;
  }

  private extractKeyFromOption(option: string): keyof GoalDrivenConfig | null {
    for (const [key, label] of Object.entries(CONFIG_LABELS)) {
      if (option.startsWith(label)) {
        return key as keyof GoalDrivenConfig;
      }
    }
    return null;
  }

  private async editConfigItem(
    ctx: ExtensionCommandContext,
    key: keyof GoalDrivenConfig
  ): Promise<void> {
    const label = CONFIG_LABELS[key];
    const description = CONFIG_DESCRIPTIONS[key];
    const range = CONFIG_RANGES[key];
    const currentValue = this.configStore.get(key);

    // Show description
    ctx.ui.notify(`${label}\n${description}\n范围: ${range.min} - ${range.max}`, "info");

    // Get new value
    const input = await ctx.ui.input(
      `${label} (当前: ${currentValue})`,
      `输入新值 (${range.min}-${range.max})`
    );

    if (!input) return; // User cancelled

    // Validate and update
    const newValue = parseInt(input, 10);
    if (isNaN(newValue)) {
      ctx.ui.notify("❌ 请输入有效的数字", "error");
      return;
    }

    if (newValue < range.min || newValue > range.max) {
      ctx.ui.notify(`❌ 值必须在 ${range.min} 和 ${range.max} 之间`, "error");
      return;
    }

    try {
      await this.configStore.updateConfig({ [key]: newValue } as Partial<GoalDrivenConfig>);
      ctx.ui.notify(`✅ ${label} 已更新为 ${newValue}`, "info");
    } catch (error) {
      ctx.ui.notify(`❌ 更新失败: ${String(error)}`, "error");
    }
  }
}
