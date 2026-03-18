/**
 * Guarded Tools
 *
 * Tool wrappers that enforce file access permissions.
 * These tools wrap the base tools with PathGuard checks.
 */

import type { Tool } from '@mariozechner/pi-agent-core';
import type { PathGuard } from './path-guard.js';
import type { BashMode, FilePermissionConfig } from './permission-config.js';

/**
 * Result of a tool execution with permission guard
 */
export interface GuardedToolResult {
  success: boolean;
  content?: string;
  error?: string;
  deniedPath?: string;
}

/**
 * Creates a guarded Read tool that enforces permission checks
 */
export function createGuardedReadTool(
  originalTool: Tool,
  guard: PathGuard
): Tool {
  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'read',
    execute: async (
      toolCallId: string,
      params: { path: string; limit?: number; offset?: number; pages?: string },
      signal?: AbortSignal
    ) => {
      const filePath = params.path;

      try {
        // Validate read access
        const validatedPath = await guard.validateRead(filePath);

        // Execute the original tool with the validated path
        return originalExecute?.call(
          originalTool,
          toolCallId,
          { ...params, path: validatedPath },
          signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Permission denied: ${message}. Path "${filePath}" is not accessible.`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Creates a guarded Write tool that enforces permission checks
 */
export function createGuardedWriteTool(
  originalTool: Tool,
  guard: PathGuard
): Tool {
  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'write',
    execute: async (
      toolCallId: string,
      params: { path: string; content: string },
      signal?: AbortSignal
    ) => {
      const filePath = params.path;

      try {
        // Validate write access
        const validatedPath = await guard.validateWrite(filePath);

        // Execute the original tool with the validated path
        return originalExecute?.call(
          originalTool,
          toolCallId,
          { ...params, path: validatedPath },
          signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Permission denied: ${message}. Path "${filePath}" is not writable.`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Creates a guarded Edit tool that enforces permission checks
 */
export function createGuardedEditTool(
  originalTool: Tool,
  guard: PathGuard
): Tool {
  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'edit',
    execute: async (
      toolCallId: string,
      params: {
        file_path: string;
        old_string: string;
        new_string: string;
        replace_all?: boolean;
      },
      signal?: AbortSignal
    ) => {
      const filePath = params.file_path;

      try {
        // Validate write access (edit requires write permission)
        const validatedPath = await guard.validateWrite(filePath);

        // Execute the original tool with the validated path
        return originalExecute?.call(
          originalTool,
          toolCallId,
          { ...params, file_path: validatedPath },
          signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Permission denied: ${message}. Path "${filePath}" is not editable.`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Creates a guarded Glob tool that enforces permission checks
 */
export function createGuardedGlobTool(
  originalTool: Tool,
  guard: PathGuard
): Tool {
  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'glob',
    execute: async (
      toolCallId: string,
      params: { pattern: string; path?: string },
      signal?: AbortSignal
    ) => {
      const basePath = params.path || process.cwd();

      try {
        // Validate read access to the base path
        const validatedPath = await guard.validateRead(basePath);

        // Execute the original tool with the validated path
        return originalExecute?.call(
          originalTool,
          toolCallId,
          { ...params, path: validatedPath },
          signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Permission denied: ${message}. Path "${basePath}" is not accessible.`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Creates a guarded Grep tool that enforces permission checks
 */
export function createGuardedGrepTool(
  originalTool: Tool,
  guard: PathGuard
): Tool {
  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'grep',
    execute: async (
      toolCallId: string,
      params: {
        pattern: string;
        path?: string;
        type?: string;
        glob?: string;
        output_mode?: string;
        head_limit?: number;
      },
      signal?: AbortSignal
    ) => {
      const basePath = params.path || process.cwd();

      try {
        // Validate read access to the search path
        const validatedPath = await guard.validateRead(basePath);

        // Execute the original tool with the validated path
        return originalExecute?.call(
          originalTool,
          toolCallId,
          { ...params, path: validatedPath },
          signal
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Permission denied: ${message}. Path "${basePath}" is not accessible.`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

/**
 * Creates a guarded Bash tool that enforces permission checks
 */
export function createGuardedBashTool(
  originalTool: Tool,
  guard: PathGuard
): Tool | null {
  const bashMode = guard.getBashMode();

  // If bash is disabled, return null (tool will be removed)
  if (bashMode === 'disabled') {
    return null;
  }

  const originalExecute = originalTool.execute;

  return {
    ...originalTool,
    name: 'bash',
    execute: async (
      toolCallId: string,
      params: { command: string; description?: string; timeout?: number },
      signal?: AbortSignal
    ) => {
      const command = params.command;

      // Validate the command
      const validation = guard.validateBashCommand(command);

      if (!validation.allowed) {
        return {
          content: [
            {
              type: 'text',
              text: `Command blocked: ${validation.reason || 'Permission denied'}. Command: ${command}`,
            },
          ],
          isError: true,
        };
      }

      // Execute the original tool
      return originalExecute?.call(
        originalTool,
        toolCallId,
        params,
        signal
      );
    },
  };
}

/**
 * Options for creating guarded tools
 */
export interface GuardedToolsOptions {
  /** Tools to guard */
  tools: Record<string, Tool>;
  /** Path guard instance */
  guard: PathGuard;
  /** Tool names to apply guards to */
  guardToolNames?: string[];
}

/**
 * Creates a set of guarded tools from original tools
 *
 * @param options - Configuration options
 * @returns Object containing guarded tools
 */
export function createGuardedTools(
  options: GuardedToolsOptions
): Record<string, Tool> {
  const { tools, guard, guardToolNames } = options;

  // Default tool names to guard
  const toolNamesToGuard = guardToolNames || [
    'read', 'write', 'edit', 'glob', 'grep', 'bash',
  ];

  const guardedTools: Record<string, Tool> = { ...tools };

  for (const toolName of toolNamesToGuard) {
    const originalTool = tools[toolName];
    if (!originalTool) continue;

    switch (toolName) {
      case 'read':
        guardedTools.read = createGuardedReadTool(originalTool, guard);
        break;

      case 'write':
        guardedTools.write = createGuardedWriteTool(originalTool, guard);
        break;

      case 'edit':
        guardedTools.edit = createGuardedEditTool(originalTool, guard);
        break;

      case 'glob':
        guardedTools.glob = createGuardedGlobTool(originalTool, guard);
        break;

      case 'grep':
        guardedTools.grep = createGuardedGrepTool(originalTool, guard);
        break;

      case 'bash':
        const guardedBash = createGuardedBashTool(originalTool, guard);
        if (guardedBash) {
          guardedTools.bash = guardedBash;
        } else {
          // Bash is disabled, remove it from the tools
          delete guardedTools.bash;
        }
        break;
    }
  }

  return guardedTools;
}

/**
 * Gets the list of tool names that should be active based on permission config
 *
 * @param allToolNames - All available tool names
 * @param config - Permission configuration
 */
export function getActiveToolNames(
  allToolNames: string[],
  config: FilePermissionConfig
): string[] {
  // Start with all tools
  let activeTools = [...allToolNames];

  // Remove bash if disabled
  if (config.bashMode === 'disabled') {
    activeTools = activeTools.filter(name => name !== 'bash');
  }

  return activeTools;
}
