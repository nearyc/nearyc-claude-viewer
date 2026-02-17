import { Router, type Response, type Request } from 'express';
import { spawn } from 'child_process';
import type { ApiResponse } from '../types';

interface ExecuteRequest {
  command: string;
}

function sendSuccess<T>(res: Response, data: T): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  res.json(response);
}

function sendError(res: Response, status: number, message: string): void {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };
  res.status(status).json(response);
}

export function createExecuteRouter(): Router {
  const router = Router();

  // POST /api/execute - Execute a shell command
  router.post('/', async (req: Request<unknown, unknown, ExecuteRequest>, res) => {
    try {
      const { command } = req.body;

      if (!command || typeof command !== 'string') {
        sendError(res, 400, 'Command is required and must be a string');
        return;
      }

      // Security: Only allow specific command patterns
      // Only allow commands that start with specific safe patterns
      const allowedPatterns = [
        /^start powershell/,
        /^powershell/,
        /^cmd/,
      ];

      const isAllowed = allowedPatterns.some(pattern => pattern.test(command.trim()));

      if (!isAllowed) {
        sendError(res, 403, 'Command pattern not allowed');
        return;
      }

      // Execute the command
      const child = spawn(command, { shell: true, detached: true, stdio: 'ignore' });
      child.unref();

      console.log('[Execute] Command executed:', command);

      sendSuccess(res, { executed: true });
    } catch (error) {
      console.error('[Execute] Error executing command:', error);
      sendError(res, 500, 'Failed to execute command');
    }
  });

  return router;
}
