/**
 * Path Validator
 *
 * Core path validation logic that fixes the security vulnerabilities identified in the review:
 * 1. Absolute path bypass vulnerability
 * 2. Symlink escape vulnerability
 * 3. Path traversal attacks
 *
 * This module ensures all paths are properly resolved and validated before access.
 */

import { realpath, stat, access } from 'fs/promises';
import { resolve, normalize, isAbsolute, dirname, basename } from 'path';
import { homedir } from 'os';
import type { PermissionCheckResult, FilePermissionConfig } from './permission-config.js';

/**
 * Expands path by replacing ~ with home directory
 */
export function expandPath(filePath: string): string {
  if (filePath.startsWith('~')) {
    return filePath.replace('~', homedir());
  }
  return filePath;
}

/**
 * Checks if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely resolves a path, handling symlinks and normalizing the result
 *
 * This function:
 * 1. Expands ~ to home directory
 * 2. Normalizes the path (removes . and ..)
 * 3. Resolves symlinks to their real paths
 * 4. Handles non-existent paths gracefully
 *
 * @param requestedPath - The path to resolve
 * @param cwd - Current working directory for relative paths
 * @param resolveSymlinks - Whether to resolve symlinks
 */
export async function safeResolvePath(
  requestedPath: string,
  cwd: string,
  resolveSymlinks: boolean = true
): Promise<string> {
  // Step 1: Expand ~ to home directory
  let resolved = expandPath(requestedPath);

  // Step 2: Handle relative paths
  if (!isAbsolute(resolved)) {
    resolved = resolve(cwd, resolved);
  }

  // Step 3: Normalize the path (handle . and ..)
  resolved = normalize(resolved);

  // Step 4: Resolve symlinks if enabled
  if (resolveSymlinks) {
    try {
      // Try to resolve the full path first
      const realPath = await realpath(resolved);
      resolved = realPath;
    } catch (error) {
      // If the path doesn't exist, try to resolve the parent directory
      // This handles the case where we're creating a new file
      const parentDir = dirname(resolved);
      const fileName = basename(resolved);

      try {
        const realParent = await realpath(parentDir);
        resolved = resolve(realParent, fileName);
      } catch {
        // If parent also doesn't exist, just use the normalized path
        // Permission check will fail later if the parent isn't accessible
      }
    }
  }

  return resolved;
}

/**
 * Synchronous version of safeResolvePath for cases where async isn't possible
 * Note: This does NOT resolve symlinks
 */
export function safeResolvePathSync(
  requestedPath: string,
  cwd: string
): string {
  // Step 1: Expand ~ to home directory
  let resolved = expandPath(requestedPath);

  // Step 2: Handle relative paths
  if (!isAbsolute(resolved)) {
    resolved = resolve(cwd, resolved);
  }

  // Step 3: Normalize the path
  resolved = normalize(resolved);

  return resolved;
}

/**
 * Checks if a resolved path is within an allowed directory
 *
 * @param resolvedPath - The absolute, resolved path to check
 * @param allowedRoots - List of allowed root directories
 */
export function isPathWithinAllowedRoots(
  resolvedPath: string,
  allowedRoots: string[]
): { allowed: boolean; matchingRoot?: string } {
  // Normalize both the path and roots for comparison
  const normalizedPath = normalize(resolvedPath);

  for (const root of allowedRoots) {
    const normalizedRoot = normalize(root);

    // Check if the path is the root itself or is within the root
    if (
      normalizedPath === normalizedRoot ||
      normalizedPath.startsWith(normalizedRoot + '/')
    ) {
      return { allowed: true, matchingRoot: normalizedRoot };
    }
  }

  return { allowed: false };
}

/**
 * Validates path access against permission configuration
 *
 * This is the main validation function that checks:
 * 1. Path is properly resolved
 * 2. Path is within allowed directories
 * 3. Path is not in denied directories
 * 4. For write access, path is not read-only
 *
 * @param requestedPath - The path requested by the tool
 * @param cwd - Current working directory
 * @param config - Permission configuration
 * @param accessType - 'read' or 'write'
 */
export async function validatePathAccess(
  requestedPath: string,
  cwd: string,
  config: FilePermissionConfig,
  accessType: 'read' | 'write'
): Promise<PermissionCheckResult> {
  // For 'full' permission level, allow everything
  if (config.level === 'full') {
    const resolvedPath = await safeResolvePath(
      requestedPath,
      cwd,
      config.resolveSymlinks
    );
    return {
      allowed: true,
      resolvedPath,
    };
  }

  // Resolve the path safely
  const resolvedPath = await safeResolvePath(
    requestedPath,
    cwd,
    config.resolveSymlinks
  );

  // Check against denied paths first (highest priority)
  if (config.deniedPaths && config.deniedPaths.length > 0) {
    const deniedCheck = isPathWithinAllowedRoots(resolvedPath, config.deniedPaths);
    if (deniedCheck.allowed) {
      return {
        allowed: false,
        resolvedPath,
        reason: `Path "${resolvedPath}" is explicitly denied`,
      };
    }
  }

  // Check against allowed paths
  if (!config.allowedPaths || config.allowedPaths.length === 0) {
    return {
      allowed: false,
      resolvedPath,
      reason: 'No allowed paths configured',
    };
  }

  const allowedCheck = isPathWithinAllowedRoots(resolvedPath, config.allowedPaths);
  if (!allowedCheck.allowed) {
    return {
      allowed: false,
      resolvedPath,
      reason: `Path "${resolvedPath}" is outside allowed directories`,
    };
  }

  // For 'standard' level, knowledge base is read-only
  if (config.level === 'standard' && allowedCheck.matchingRoot) {
    const knowledgePath = config.allowedPaths.find(p => p.includes('/knowledge'));
    if (knowledgePath && resolvedPath.startsWith(normalize(knowledgePath))) {
      if (accessType === 'write') {
        return {
          allowed: false,
          resolvedPath,
          reason: 'Knowledge base is read-only in standard mode',
          readOnly: true,
        };
      }
      return {
        allowed: true,
        resolvedPath,
        readOnly: true,
      };
    }
  }

  return {
    allowed: true,
    resolvedPath,
    readOnly: false,
  };
}

/**
 * Validates multiple paths at once
 *
 * @param paths - Array of paths to validate
 * @param cwd - Current working directory
 * @param config - Permission configuration
 * @param accessType - 'read' or 'write'
 */
export async function validateMultiplePaths(
  paths: string[],
  cwd: string,
  config: FilePermissionConfig,
  accessType: 'read' | 'write'
): Promise<{ allAllowed: boolean; results: Map<string, PermissionCheckResult> }> {
  const results = new Map<string, PermissionCheckResult>();
  let allAllowed = true;

  for (const path of paths) {
    const result = await validatePathAccess(path, cwd, config, accessType);
    results.set(path, result);
    if (!result.allowed) {
      allAllowed = false;
    }
  }

  return { allAllowed, results };
}

/**
 * Detects path traversal attempts
 *
 * @param path - Path to check
 */
export function detectPathTraversal(path: string): boolean {
  // Check for common path traversal patterns
  const traversalPatterns = [
    /\.\./,           // .. in path
    /%2e%2e/i,       // URL encoded ..
    /%252e/i,        // Double URL encoded
    /\.\.%2f/i,      // ..%2f
    /%2e%2e\//i,     // %2e%2e/
  ];

  return traversalPatterns.some(pattern => pattern.test(path));
}

/**
 * Sanitizes a filename by removing potentially dangerous characters
 *
 * @param filename - Filename to sanitize
 */
export function sanitizeFilename(filename: string): string {
  // Remove null bytes and other dangerous characters
  return filename
    .replace(/\x00/g, '')  // Null bytes
    .replace(/\.\./g, '')  // Path traversal
    .replace(/[<>:"|?*]/g, '_')  // Invalid filename chars (Windows)
    .replace(/^\.+/, '');  // Leading dots (hidden files on Unix)
}

/**
 * Gets the safe absolute path for a file operation
 * Throws an error if the path is not allowed
 *
 * @param requestedPath - The path requested
 * @param cwd - Current working directory
 * @param config - Permission configuration
 * @param accessType - 'read' or 'write'
 * @throws Error if path is not allowed
 */
export async function getValidatedPath(
  requestedPath: string,
  cwd: string,
  config: FilePermissionConfig,
  accessType: 'read' | 'write'
): Promise<string> {
  // Check for path traversal attempts
  if (detectPathTraversal(requestedPath)) {
    throw new Error(`Path traversal detected in "${requestedPath}"`);
  }

  const result = await validatePathAccess(requestedPath, cwd, config, accessType);

  if (!result.allowed) {
    throw new Error(result.reason || 'Access denied');
  }

  return result.resolvedPath;
}
