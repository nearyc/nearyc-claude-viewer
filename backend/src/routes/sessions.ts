import { Router, type Response } from 'express';
import type { SessionsService } from '../services/sessionsService';
import type { ApiResponse, Session } from '../types';

function sendSuccess<T>(res: Response, data: T, count?: number): void {
  const response: ApiResponse<T> & { count?: number } = {
    success: true,
    data,
  };
  if (count !== undefined) {
    response.count = count;
  }
  res.json(response);
}

function sendError(res: Response, status: number, message: string): void {
  const response: ApiResponse<null> = {
    success: false,
    error: message,
  };
  res.status(status).json(response);
}

interface SessionsRouterOptions {
  sessionsService: SessionsService;
}

export function createSessionsRouter(options: SessionsRouterOptions): Router {
  const { sessionsService } = options;
  const router = Router();

  // GET /api/sessions - Get all sessions
  router.get('/', async (req, res) => {
    try {
      const { project, limit, search, refresh } = req.query;

      // Force refresh - clear cache and reload from disk
      if (refresh === 'true') {
        sessionsService.clearCache();
        await sessionsService.loadSessions();
        console.log('[API] Sessions cache refreshed');
      }

      let sessions: Session[];

      if (search && typeof search === 'string') {
        sessions = await sessionsService.searchSessions(search);
      } else if (project && typeof project === 'string') {
        sessions = await sessionsService.getSessionsByProject(project);
      } else {
        sessions = await sessionsService.getSessions();
      }

      if (limit && typeof limit === 'string') {
        const MAX_LIMIT = 1000;
        const limitNum = parseInt(limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          sessions = sessions.slice(0, Math.min(limitNum, MAX_LIMIT));
        }
      }

      sendSuccess(res, sessions, sessions.length);
    } catch (error) {
      console.error('[API] Error getting sessions:', error);
      sendError(res, 500, 'Failed to get sessions');
    }
  });

  // GET /api/sessions/:id - Get specific session
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { full } = req.query;

      const session = full === 'true'
        ? await sessionsService.getSessionWithConversation(id)
        : await sessionsService.getSessionById(id);

      if (!session) {
        sendError(res, 404, 'Session not found');
        return;
      }

      sendSuccess(res, session);
    } catch (error) {
      console.error('[API] Error getting session:', error);
      sendError(res, 500, 'Failed to get session');
    }
  });

  // GET /api/sessions/:id/full - Get session with full conversation (alias)
  router.get('/:id/full', async (req, res) => {
    try {
      const { id } = req.params;
      const session = await sessionsService.getSessionWithConversation(id);

      if (!session) {
        sendError(res, 404, 'Session not found');
        return;
      }

      sendSuccess(res, session);
    } catch (error) {
      console.error('[API] Error getting session:', error);
      sendError(res, 500, 'Failed to get session');
    }
  });

  // DELETE /api/sessions/:id - Delete a session
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if session exists
      const session = await sessionsService.getSessionById(id);
      if (!session) {
        sendError(res, 404, 'Session not found');
        return;
      }

      // Delete the session
      const success = await sessionsService.deleteSession(id);

      if (success) {
        // Clear cache and reload to ensure fresh data
        await sessionsService.afterDelete();
        // SSE clients will receive updates via file watcher events
        sendSuccess(res, { message: 'Session deleted successfully' });
      } else {
        sendError(res, 500, 'Failed to delete session');
      }
    } catch (error) {
      console.error('[API] Error deleting session:', error);
      sendError(res, 500, 'Failed to delete session');
    }
  });

  return router;
}
