/**
 * File Permission Configuration Types
 *
 * Defines the permission levels and configuration for file access control.
 * Based on the security review findings, this implements a tiered permission model.
 */

import type { Goal } from '../types/index.js';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Default shared directories that Agent can access
 * These directories are shared across all goals
 */
export const SHARED_DIRECTORIES = {
  /** Skills directory - contains skill definitions and extensions */
  skills: join(homedir(), '.agents', 'skills'),
  /** Extensions directory - contains extension configurations */
  extensions: join(homedir(), '.agents', 'extensions'),
};

/**
 * Permission levels for file access
 *
 * - restricted: Only goal-specific directory, complete isolation
 * - standard: Goal directory + knowledge base + /tmp + skills (read-only knowledge)
 * - full: No restrictions (requires explicit user authorization)
 */
export type PermissionLevel = 'restricted' | 'standard' | 'full';

/**
 * Bash execution mode
 *
 * - disabled: Bash tool is completely disabled
 * - readonly: Only read-only commands allowed (cat, ls, head, etc.)
 * - full: All commands allowed (requires explicit authorization)
 */
export type BashMode = 'disabled' | 'readonly' | 'full';

/**
 * Path access rule
 */
export interface PathRule {
  /** Path pattern (supports glob patterns) */
  pattern: string;
  /** Whether read access is allowed */
  allowRead: boolean;
  /** Whether write access is allowed */
  allowWrite: boolean;
  /** Whether this is a deny rule (takes precedence over allow rules) */
  deny?: boolean;
}

/**
 * File permission configuration for a goal/task execution
 */
export interface FilePermissionConfig {
  /** Permission level */
  level: PermissionLevel;

  /** Bash execution mode */
  bashMode: BashMode;

  /** Additional allowed paths (beyond the default for the level) */
  allowedPaths?: string[];

  /** Explicitly denied paths (always blocked regardless of level) */
  deniedPaths?: string[];

  /** Goal ID this config is associated with */
  goalId: string;

  /** Task ID this config is associated with (optional) */
  taskId?: string;

  /** Whether to resolve symlinks before checking permissions */
  resolveSymlinks: boolean;

  /** Maximum file size allowed to read (in bytes, 0 = unlimited) */
  maxFileSize?: number;
}

/**
 * Default configurations for each permission level
 */
export const DEFAULT_PERMISSION_CONFIGS: Record<PermissionLevel, Omit<FilePermissionConfig, 'goalId' | 'taskId'>> = {
  restricted: {
    level: 'restricted',
    bashMode: 'disabled',
    resolveSymlinks: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  standard: {
    level: 'standard',
    bashMode: 'readonly',
    resolveSymlinks: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },
  full: {
    level: 'full',
    bashMode: 'full',
    resolveSymlinks: true,
    maxFileSize: 0, // unlimited
  },
};

/**
 * Read-only bash commands whitelist
 * These commands are considered safe and don't modify the file system
 */
export const READONLY_BASH_COMMANDS = [
  'cat', 'head', 'tail', 'less', 'more',
  'ls', 'dir', 'find', 'locate',
  'grep', 'egrep', 'fgrep', 'rg',
  'wc', 'sort', 'uniq', 'cut', 'awk', 'sed',  // sed without -i
  'file', 'stat', 'du', 'df',
  'echo', 'printf', 'basename', 'dirname',
  'pwd', 'whoami', 'id', 'uname',
  'date', 'cal', 'uptime',
  'which', 'whereis', 'type',
  'env', 'printenv',
  'git status', 'git log', 'git diff', 'git show', 'git branch', 'git remote',
];

/**
 * Creates a permission configuration for a goal execution
 *
 * @param goalId - The goal ID
 * @param agentDir - The agent directory (e.g., ~/.pi/agent/)
 * @param options - Additional options
 */
export function createPermissionConfig(
  goalId: string,
  agentDir: string,
  options: {
    taskId?: string;
    level?: PermissionLevel;
    bashMode?: BashMode;
    customAllowedPaths?: string[];
  } = {}
): FilePermissionConfig {
  const {
    taskId,
    level = 'standard',
    bashMode,
    customAllowedPaths = [],
  } = options;

  const defaultConfig = DEFAULT_PERMISSION_CONFIGS[level];

  // Build default allowed paths based on level
  const allowedPaths: string[] = [];

  // Goal-specific directory is always allowed
  const goalDir = `${agentDir}/goal-driven/tasks/${goalId}`;
  allowedPaths.push(goalDir);

  // Task-specific directory if taskId is provided
  if (taskId) {
    const taskDir = `${agentDir}/goal-driven/tasks/${goalId}/${taskId}`;
    allowedPaths.push(taskDir);
  }

  // Standard level adds knowledge base and temp directory
  if (level === 'standard' || level === 'full') {
    // Knowledge base (read-only access)
    allowedPaths.push(`${agentDir}/goal-driven/knowledge`);
    // Temp directory
    allowedPaths.push('/tmp');
    // macOS temp directory
    allowedPaths.push('/private/tmp');
    // Skills directory - for accessing skill definitions
    allowedPaths.push(SHARED_DIRECTORIES.skills);
    // Extensions directory - for accessing extension configurations
    allowedPaths.push(SHARED_DIRECTORIES.extensions);
  }

  // Add custom paths
  allowedPaths.push(...customAllowedPaths);

  return {
    ...defaultConfig,
    goalId,
    taskId,
    allowedPaths,
    bashMode: bashMode ?? defaultConfig.bashMode,
  };
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** The resolved absolute path */
  resolvedPath: string;

  /** Reason for denial (if not allowed) */
  reason?: string;

  /** Whether the path is read-only */
  readOnly?: boolean;
}
