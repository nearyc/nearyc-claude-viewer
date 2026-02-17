import { Router, type Response } from 'express';
import type { SessionsService } from '../services/sessionsService';
import type { ApiResponse, Project, Session } from '../types';

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

export function createProjectsRouter(sessionsService: SessionsService): Router {
  const router = Router();

  // GET /api/projects - Get all projects
  router.get('/', async (_req, res) => {
    try {
      const projects = await sessionsService.getProjects();
      sendSuccess(res, projects, projects.length);
    } catch (error) {
      console.error('[API] Error getting projects:', error);
      sendError(res, 500, 'Failed to get projects');
    }
  });

  // GET /api/projects/:path - Get specific project
  router.get('/:path', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.path);
      const project = await sessionsService.getProjectByPath(projectPath);

      if (!project) {
        sendError(res, 404, 'Project not found');
        return;
      }

      sendSuccess(res, project);
    } catch (error) {
      console.error('[API] Error getting project:', error);
      sendError(res, 500, 'Failed to get project');
    }
  });

  // GET /api/projects/:path/sessions - Get sessions for a project
  router.get('/:path/sessions', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.path);
      const sessions = await sessionsService.getSessionsByProject(projectPath);

      sendSuccess(res, sessions, sessions.length);
    } catch (error) {
      console.error('[API] Error getting project sessions:', error);
      sendError(res, 500, 'Failed to get project sessions');
    }
  });

  return router;
}
