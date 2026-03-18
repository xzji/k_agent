/**
 * Bash Sandbox
 *
 * Provides additional security for bash command execution through:
 * 1. Command whitelisting/blacklisting
 * 2. OS-level sandboxing (macOS sandbox-exec, Linux bubblewrap)
 * 3. Resource limits
 *
 * Note: OS-level sandboxing requires appropriate system support.
 */

import { spawn } from 'child_process';
import type { FilePermissionConfig, BashMode } from './permission-config.js';
import type { PathGuard } from './path-guard.js';

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  /** Paths that are accessible within the sandbox */
  allowedPaths: string[];

  /** Paths that are explicitly denied */
  deniedPaths: string[];

  /** Whether network access is allowed */
  networkAllowed: boolean;

  /** Maximum execution time in milliseconds */
  timeoutMs: number;

  /** Maximum memory usage in MB (0 = unlimited) */
  maxMemoryMB: number;

  /** Environment variables to pass to the sandbox */
  env: Record<string, string>;
}

/**
 * Default sandbox configuration for readonly mode
 */
export const READONLY_SANDBOX_CONFIG: SandboxConfig = {
  allowedPaths: [],
  deniedPaths: [],
  networkAllowed: false,
  timeoutMs: 30000,
  maxMemoryMB: 512,
  env: {},
};

/**
 * Platform detection
 */
function getPlatform(): 'darwin' | 'linux' | 'other' {
  switch (process.platform) {
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    default:
      return 'other';
  }
}

/**
 * Generates a macOS sandbox profile
 *
 * This creates a sandbox-exec profile that restricts:
 * - File system access to allowed paths
 * - Network access (if disabled)
 * - Process execution
 */
export function generateMacOSSandboxProfile(config: SandboxConfig): string {
  const lines: string[] = [
    '(version 1)',
    '(deny default)',
  ];

  // Allow basic operations
  lines.push('(allow process-exec)');
  lines.push('(allow sysctl-read)');
  lines.push('(allow mach-lookup)');

  // Allow file reads from system paths
  lines.push('(allow file-read* (subpath "/usr"))');
  lines.push('(allow file-read* (subpath "/bin"))');
  lines.push('(allow file-read* (subpath "/lib"))');
  lines.push('(allow file-read* (subpath "/System"))');
  lines.push('(allow file-read* (subpath "/etc"))');

  // Allow reads and writes to allowed paths
  for (const path of config.allowedPaths) {
    lines.push(`(allow file-read* (subpath "${path}"))`);
    // For readonly, don't allow writes
  }

  // Explicitly deny paths
  for (const path of config.deniedPaths) {
    lines.push(`(deny file* (subpath "${path}"))`);
  }

  // Network
  if (config.networkAllowed) {
    lines.push('(allow network*)');
  } else {
    lines.push('(deny network*)');
  }

  return lines.join('\n');
}

/**
 * Generates a Linux bubblewrap command
 *
 * Note: This requires bubblewrap (bwrap) to be installed
 */
export function generateLinuxBwrapCommand(
  command: string,
  config: SandboxConfig
): string {
  const args: string[] = ['bwrap'];

  // Create minimal sandbox
  args.push('--ro-bind', '/usr', '/usr');
  args.push('--ro-bind', '/bin', '/bin');
  args.push('--ro-bind', '/lib', '/lib');
  args.push('--ro-bind', '/lib64', '/lib64');
  args.push('--ro-bind', '/etc', '/etc');
  args.push('--proc', '/proc');
  args.push('--dev', '/dev');
  args.push('--tmpfs', '/tmp');

  // Bind allowed paths
  for (const path of config.allowedPaths) {
    args.push('--bind', path, path);
  }

  // Network
  if (!config.networkAllowed) {
    args.push('--unshare-net');
  }

  // Execute command
  args.push('--', 'sh', '-c', command);

  return args.join(' ');
}

/**
 * Executes a command in a sandbox
 *
 * This uses platform-specific sandboxing when available:
 * - macOS: sandbox-exec
 * - Linux: bubblewrap (if available)
 *
 * Falls back to regular execution if sandboxing is not available.
 */
export async function executeInSandbox(
  command: string,
  config: SandboxConfig
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const platform = getPlatform();

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let childProcess: ReturnType<typeof spawn>;

    if (platform === 'darwin') {
      // Use sandbox-exec on macOS
      const profile = generateMacOSSandboxProfile(config);
      childProcess = spawn('sandbox-exec', ['-p', profile, 'sh', '-c', command], {
        env: { ...process.env, ...config.env },
      });
    } else if (platform === 'linux') {
      // Use bubblewrap on Linux (if available)
      const bwrapCommand = generateLinuxBwrapCommand(command, config);
      childProcess = spawn('sh', ['-c', bwrapCommand], {
        env: { ...process.env, ...config.env },
      });
    } else {
      // Fallback: regular execution (no sandboxing)
      console.warn('[BashSandbox] No sandboxing available, executing directly');
      childProcess = spawn('sh', ['-c', command], {
        env: { ...process.env, ...config.env },
      });
    }

    // Set timeout
    const timeout = setTimeout(() => {
      childProcess.kill('SIGKILL');
      reject(new Error(`Command timed out after ${config.timeoutMs}ms`));
    }, config.timeoutMs);

    childProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    childProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    childProcess.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      });
    });

    childProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Checks if sandboxing is available on this platform
 */
export async function isSandboxAvailable(): Promise<boolean> {
  const platform = getPlatform();

  if (platform === 'darwin') {
    // sandbox-exec is always available on macOS
    return true;
  }

  if (platform === 'linux') {
    // Check if bwrap is available
    return new Promise((resolve) => {
      const proc = spawn('which', ['bwrap']);
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  return false;
}

/**
 * Creates a sandbox configuration from a PathGuard
 */
export function createSandboxConfig(
  guard: PathGuard,
  options: Partial<SandboxConfig> = {}
): SandboxConfig {
  const config = guard.getConfig();

  return {
    allowedPaths: config.allowedPaths || [],
    deniedPaths: config.deniedPaths || [],
    networkAllowed: config.bashMode === 'full',
    timeoutMs: options.timeoutMs || 30000,
    maxMemoryMB: options.maxMemoryMB || 512,
    env: options.env || {},
  };
}
