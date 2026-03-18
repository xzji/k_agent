/**
 * Path Guard
 *
 * A high-level guard for file system operations that enforces permission rules.
 * Wraps the path-validator to provide a simpler API for tools.
 */

import type { FilePermissionConfig, PermissionCheckResult, BashMode } from './permission-config.js';
import { createPermissionConfig } from './permission-config.js';
import {
  validatePathAccess,
  getValidatedPath,
  safeResolvePath,
  pathExists,
} from './path-validator.js';

/**
 * Path Guard - Enforces file access permissions
 *
 * This class provides a simple interface for tools to check and validate
 * file system operations against the configured permission rules.
 */
export class PathGuard {
  private config: FilePermissionConfig;
  private cwd: string;

  constructor(config: FilePermissionConfig, cwd: string = process.cwd()) {
    this.config = config;
    this.cwd = cwd;
  }

  /**
   * Updates the permission configuration
   */
  updateConfig(config: FilePermissionConfig): void {
    this.config = config;
  }

  /**
   * Updates the current working directory
   */
  updateCwd(cwd: string): void {
    this.cwd = cwd;
  }

  /**
   * Gets the current configuration
   */
  getConfig(): FilePermissionConfig {
    return this.config;
  }

  /**
   * Checks if read access is allowed for a path
   *
   * @param requestedPath - The path to check
   * @returns Permission check result
   */
  async checkRead(requestedPath: string): Promise<PermissionCheckResult> {
    return validatePathAccess(requestedPath, this.cwd, this.config, 'read');
  }

  /**
   * Checks if write access is allowed for a path
   *
   * @param requestedPath - The path to check
   * @returns Permission check result
   */
  async checkWrite(requestedPath: string): Promise<PermissionCheckResult> {
    return validatePathAccess(requestedPath, this.cwd, this.config, 'write');
  }

  /**
   * Validates and returns a safe path for reading
   * Throws if access is denied
   *
   * @param requestedPath - The path to validate
   * @returns The resolved, validated path
   * @throws Error if access is denied
   */
  async validateRead(requestedPath: string): Promise<string> {
    return getValidatedPath(requestedPath, this.cwd, this.config, 'read');
  }

  /**
   * Validates and returns a safe path for writing
   * Throws if access is denied
   *
   * @param requestedPath - The path to validate
   * @returns The resolved, validated path
   * @throws Error if access is denied
   */
  async validateWrite(requestedPath: string): Promise<string> {
    return getValidatedPath(requestedPath, this.cwd, this.config, 'write');
  }

  /**
   * Checks if bash is enabled
   */
  isBashEnabled(): boolean {
    return this.config.bashMode !== 'disabled';
  }

  /**
   * Gets the current bash mode
   */
  getBashMode(): BashMode {
    return this.config.bashMode;
  }

  /**
   * Validates a bash command against the permission configuration
   *
   * @param command - The bash command to validate
   * @returns Whether the command is allowed
   */
  validateBashCommand(command: string): { allowed: boolean; reason?: string } {
    const bashMode = this.config.bashMode;

    // Full access - all commands allowed
    if (bashMode === 'full') {
      return { allowed: true };
    }

    // Disabled - no commands allowed
    if (bashMode === 'disabled') {
      return {
        allowed: false,
        reason: 'Bash execution is disabled in restricted mode',
      };
    }

    // Readonly mode - check if command is safe
    if (bashMode === 'readonly') {
      return this.validateReadonlyBashCommand(command);
    }

    return { allowed: false, reason: 'Unknown bash mode' };
  }

  /**
   * Validates a command for readonly bash mode
   *
   * This is a best-effort check. It cannot catch all malicious commands.
   * For true security, use sandbox-exec (macOS) or bubblewrap (Linux).
   */
  private validateReadonlyBashCommand(command: string): { allowed: boolean; reason?: string } {
    // List of potentially dangerous patterns
    const dangerousPatterns = [
      /\brm\s/,           // rm command
      /\brm$/,            // rm at end
      /\bmv\s/,           // mv command
      /\bcp\s.*\s/,       // cp with multiple args (source -> dest)
      /\bchmod\s/,        // chmod
      /\bchown\s/,        // chown
      /\bdd\s/,           // dd (disk operations)
      /\bmkfs/,           // format disk
      /\bfdisk/,          // partition operations
      /\b>\s*\//,         // redirect to absolute path
      /\b>>\s*\//,        // append redirect to absolute path
      /\|\s*sh/,          // pipe to shell
      /\|\s*bash/,        // pipe to bash
      /\|\s*zsh/,         // pipe to zsh
      /\$\(/,             // command substitution
      /`/,                // backtick command substitution
      /eval\s/,           // eval
      /\bexec\s/,         // exec
      /\bsource\s/,       // source
      /\.\s+\//,          // dot source with path
      /\bcurl\s.*\|\s*sh/, // curl pipe to shell
      /\bwget\s.*\|\s*sh/, // wget pipe to shell
      /\bsudo\s/,         // sudo
      /\bsu\s/,           // su
      /\bkill\s/,         // kill
      /\bpkill\s/,        // pkill
      /\bkillall\s/,      // killall
    ];

    // Check for dangerous patterns
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Command contains potentially dangerous operation: ${pattern.source}`,
        };
      }
    }

    // Check for file writes (>, >>)
    if (/>>|>/.test(command)) {
      // Extract the file path being written to
      const writeMatch = command.match(/>>?\s*(['"]?)([^'"\s]+)\1/);
      if (writeMatch) {
        const targetPath = writeMatch[2];
        // In readonly mode, no writes are allowed
        return {
          allowed: false,
          reason: 'File writes are not allowed in readonly bash mode',
        };
      }
    }

    // Check for valid readonly commands
    // This is a whitelist approach for common readonly commands
    const commandName = command.trim().split(/\s+/)[0];
    const readonlyCommands = [
      'cat', 'head', 'tail', 'less', 'more',
      'ls', 'dir', 'find', 'grep', 'egrep', 'fgrep',
      'wc', 'sort', 'uniq', 'cut', 'awk',
      'file', 'stat', 'du', 'df',
      'echo', 'printf', 'basename', 'dirname',
      'pwd', 'whoami', 'id', 'uname',
      'date', 'cal', 'uptime',
      'which', 'whereis', 'type',
      'env', 'printenv',
      'git',
    ];

    // Allow git commands (with some restrictions)
    if (commandName === 'git') {
      // Git commands that might modify state
      const dangerousGitOps = [
        'push', 'commit', 'merge', 'rebase', 'reset', 'checkout',
        'branch', 'tag', 'stash', 'clean', 'gc',
      ];
      const gitSubcommand = command.trim().split(/\s+/)[1];
      if (gitSubcommand && dangerousGitOps.includes(gitSubcommand)) {
        return {
          allowed: false,
          reason: `Git '${gitSubcommand}' is not allowed in readonly bash mode`,
        };
      }
      return { allowed: true };
    }

    // Check whitelist
    if (readonlyCommands.includes(commandName)) {
      return { allowed: true };
    }

    // Unknown command - be conservative
    return {
      allowed: false,
      reason: `Command '${commandName}' is not in the readonly whitelist`,
    };
  }

  /**
   * Resolves a path safely without validation
   * Useful for path display purposes
   */
  async resolvePath(requestedPath: string): Promise<string> {
    return safeResolvePath(requestedPath, this.cwd, this.config.resolveSymlinks);
  }

  /**
   * Checks if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    const resolved = await safeResolvePath(filePath, this.cwd, this.config.resolveSymlinks);
    return pathExists(resolved);
  }

  /**
   * Creates a permission denied error message
   */
  createDeniedMessage(result: PermissionCheckResult): string {
    if (result.reason) {
      return `Permission denied: ${result.reason}`;
    }
    return `Permission denied: Path "${result.resolvedPath}" is not accessible`;
  }
}

/**
 * Creates a PathGuard for a goal execution
 *
 * @param goalId - The goal ID
 * @param agentDir - The agent directory path
 * @param options - Additional options
 */
export function createPathGuard(
  goalId: string,
  agentDir: string,
  options: {
    taskId?: string;
    level?: 'restricted' | 'standard' | 'full';
    bashMode?: 'disabled' | 'readonly' | 'full';
    cwd?: string;
  } = {}
): PathGuard {
  const config = createPermissionConfig(goalId, agentDir, options);
  return new PathGuard(config, options.cwd || process.cwd());
}
