import path from 'path';

/**
 * Normalize a file path for cross-platform consistency
 */
export function normalizePath(filePath: string): string {
  // Normalize to forward slashes for consistency
  let normalized = path.normalize(filePath).replace(/\\/g, '/');

  // Capitalize drive letter on Windows for consistency
  if (/^[a-z]:/.test(normalized)) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
  }

  return normalized;
}

/**
 * Generate a URL-friendly slug from a project path
 */
export function generateProjectSlug(projectPath: string): string {
  const normalized = normalizePath(projectPath);

  return normalized
    .replace(/:/g, '-')        // Replace : with -
    .replace(/[\\/]/g, '-')    // Replace \ and / with -
    .replace(/-+/g, '-')       // Replace multiple consecutive - with single -
    .toLowerCase();
}

/**
 * Convert a project slug back to a path
 */
export function projectSlugToPath(slug: string): string {
  // Reverse the slugification process
  let projectPath = slug.replace(/-/g, '/');

  // Restore drive letter on Windows (e.g., /c/ -> C:/)
  if (/^\/[a-z]\//i.test(projectPath)) {
    projectPath = projectPath[1].toUpperCase() + ':' + '/' + projectPath.slice(3);
  }

  return projectPath;
}

/**
 * Check if a path is within allowed root directories
 */
export function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
  const resolvedPath = path.resolve(targetPath);
  return allowedRoots.some(root => {
    const resolvedRoot = path.resolve(root);
    return resolvedPath.startsWith(resolvedRoot);
  });
}

/**
 * Validate session ID format (alphanumeric and hyphens only)
 */
export function isValidSessionId(sessionId: string): boolean {
  // Session ID should only contain alphanumeric characters and hyphens
  // Length between 1 and 64 characters
  const validPattern = /^[a-zA-Z0-9-]{1,64}$/;
  return validPattern.test(sessionId);
}
