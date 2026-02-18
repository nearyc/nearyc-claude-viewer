import { Router, type Response, type Request } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { isPathAllowed, isValidSessionId } from '../utils/pathUtils';

interface ExecuteRequest {
  action: 'open-powershell' | 'open-cmd';
  projectPath: string;
  sessionId: string;
}

/**
 * Escape single quotes for PowerShell
 * PowerShell uses '' (two single quotes) to escape a single quote
 */
function escapePowerShellString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Get allowed root directories from environment or use defaults
 */
function getAllowedRoots(): string[] {
  const envRoots = process.env.ALLOWED_PROJECT_ROOTS;
  if (envRoots) {
    return envRoots.split(';').filter((root) => root.trim() !== '');
  }
  // Default to common development directories
  return [process.cwd(), 'g:\\vscodeTest'];
}

export function createExecuteRouter(): Router {
  const router = Router();
  const allowedRoots = getAllowedRoots();

  // POST /api/execute - Execute a shell command
  router.post('/', async (req: Request<unknown, unknown, ExecuteRequest>, res) => {
    try {
      const { action, projectPath, sessionId } = req.body;

      // Validate action
      if (!action || typeof action !== 'string') {
        sendError(res, 400, 'Action is required and must be a string');
        return;
      }

      const allowedActions = ['open-powershell', 'open-cmd'];
      if (!allowedActions.includes(action)) {
        sendError(
          res,
          403,
          `Action not allowed. Allowed actions: ${allowedActions.join(', ')}`
        );
        return;
      }

      // Validate projectPath
      if (!projectPath || typeof projectPath !== 'string') {
        sendError(res, 400, 'Project path is required and must be a string');
        return;
      }

      // Validate sessionId
      if (!sessionId || typeof sessionId !== 'string') {
        sendError(res, 400, 'Session ID is required and must be a string');
        return;
      }

      if (!isValidSessionId(sessionId)) {
        sendError(
          res,
          400,
          'Invalid session ID format. Only alphanumeric characters and hyphens are allowed (1-64 characters)'
        );
        return;
      }

      // Security: Validate that the project path is within allowed directories
      if (!isPathAllowed(projectPath, allowedRoots)) {
        console.error(
          `[Execute] Path traversal attempt blocked: ${projectPath}`
        );
        sendError(res, 403, 'Project path is not in an allowed directory');
        return;
      }

      // Verify the path exists and is a directory
      try {
        const stats = fs.statSync(projectPath);
        if (!stats.isDirectory()) {
          sendError(res, 400, 'Project path must be a directory');
          return;
        }
      } catch (err) {
        sendError(res, 400, 'Project path does not exist or is not accessible');
        return;
      }

      // Build the command with proper escaping
      // Escape single quotes in path and session ID for PowerShell
      const escapedPath = escapePowerShellString(projectPath);
      const escapedSessionId = escapePowerShellString(sessionId);

      let command: string;
      let args: string[];

      if (action === 'open-powershell') {
        // Use PowerShell with encoded command to avoid injection
        const psCommand = `cd '${escapedPath}'; $env:CLAUDE_SESSION_ID='${escapedSessionId}'; Write-Host "Session ${escapedSessionId} restored in ${escapedPath}"`;
        command = 'powershell.exe';
        args = ['-NoExit', '-Command', psCommand];
      } else {
        // open-cmd
        // For CMD, we use /K to keep the window open and execute commands
        // CMD uses different escaping, so we use the start command approach
        const escapedPathCmd = projectPath.replace(/"/g, '""');
        command = 'cmd.exe';
        args = ['/K', `cd /d "${escapedPathCmd}" && set CLAUDE_SESSION_ID=${sessionId} && echo Session %CLAUDE_SESSION_ID% restored in %CD%`];
      }

      // Execute the command with shell: false for security
      // This prevents shell injection attacks
      const child = spawn(command, args, {
        shell: false,
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      console.log('[Execute] Command executed:', { action, projectPath, sessionId });

      sendSuccess(res, { executed: true, action, projectPath, sessionId });
    } catch (error) {
      console.error('[Execute] Error executing command:', error);
      sendError(res, 500, 'Failed to execute command');
    }
  });

  return router;
}
