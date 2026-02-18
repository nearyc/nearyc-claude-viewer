import path from 'path';

/**
 * Normalize a file path for cross-platform consistency
 */
export function normalizePath(filePath: string): string {
  if (!filePath || filePath === 'unknown') return 'unknown';

  // Normalize multiple backslashes to single backslash
  let normalized = filePath.replace(/\\+/g, '\\');

  // Normalize forward slashes to backslash on Windows (if drive letter present)
  if (/^[a-zA-Z]:/.test(normalized) || /^[a-zA-Z]\//.test(normalized)) {
    normalized = normalized.replace(/\//g, '\\');
    // Ensure drive letter has colon
    if (/^[a-zA-Z]\\/.test(normalized)) {
      normalized = normalized[0] + ':' + normalized.slice(1);
    }
  }

  // Ensure Windows drive letter is uppercase for consistency
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
    .toLowerCase();
}

/**
 * Convert a project slug back to a path
 */
export function projectSlugToPath(slug: string): string {
  if (!slug || slug === 'unknown') return 'unknown';

  // If it starts with a single letter followed by dash, it was likely a Windows drive
  if (/^[a-zA-Z]-/.test(slug)) {
    const drive = slug[0].toUpperCase();
    const rest = slug.substring(2).replace(/-/g, '\\');
    return `${drive}:\\${rest}`;
  }

  // If it starts with a dash followed by a letter, it was likely a Unix absolute path
  if (/^-[a-zA-Z]/.test(slug)) {
    return slug.substring(1).replace(/-/g, '/');
  }

  // Otherwise treat as relative path (replace dashes with slashes)
  return slug.replace(/-/g, '/');
}
