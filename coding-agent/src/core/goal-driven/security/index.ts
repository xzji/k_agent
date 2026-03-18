/**
 * Security Module
 *
 * Provides file access permission management for the goal-driven agent.
 *
 * This module addresses the following security vulnerabilities:
 * 1. Absolute path bypass vulnerability
 * 2. Symlink escape vulnerability
 * 3. Bash tool unrestricted access
 *
 * Usage:
 * ```typescript
 * import {
 *   PathGuard,
 *   createPermissionConfig,
 *   createGuardedTools,
 * } from './security/index.js';
 *
 * // Create permission configuration
 * const config = createPermissionConfig(goalId, agentDir, {
 *   level: 'standard',
 *   bashMode: 'readonly',
 * });
 *
 * // Create path guard
 * const guard = new PathGuard(config, cwd);
 *
 * // Create guarded tools
 * const guardedTools = createGuardedTools({
 *   tools: originalTools,
 *   guard,
 * });
 * ```
 */

// Permission configuration
export {
  type PermissionLevel,
  type BashMode,
  type PathRule,
  type FilePermissionConfig,
  type PermissionCheckResult,
  DEFAULT_PERMISSION_CONFIGS,
  READONLY_BASH_COMMANDS,
  SHARED_DIRECTORIES,
  createPermissionConfig,
} from './permission-config.js';

// Path validation
export {
  expandPath,
  pathExists,
  safeResolvePath,
  safeResolvePathSync,
  isPathWithinAllowedRoots,
  validatePathAccess,
  validateMultiplePaths,
  detectPathTraversal,
  sanitizeFilename,
  getValidatedPath,
} from './path-validator.js';

// Path guard
export {
  PathGuard,
  createPathGuard,
} from './path-guard.js';

// Guarded tools
export {
  createGuardedReadTool,
  createGuardedWriteTool,
  createGuardedEditTool,
  createGuardedGlobTool,
  createGuardedGrepTool,
  createGuardedBashTool,
  createGuardedTools,
  getActiveToolNames,
  type GuardedToolResult,
  type GuardedToolsOptions,
} from './guarded-tools.js';

// Bash sandbox
export {
  executeInSandbox,
  isSandboxAvailable,
  generateMacOSSandboxProfile,
  generateLinuxBwrapCommand,
  createSandboxConfig,
  READONLY_SANDBOX_CONFIG,
  type SandboxConfig,
} from './bash-sandbox.js';
