import { Router, type Response } from 'express';
import type { StatsService } from '../services/statsService';
import type { CodeStatsService } from '../services/codeStatsService';
import type { ApiResponse } from '../types';

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

interface StatsRouterOptions {
  statsService: StatsService;
  codeStatsService: CodeStatsService;
}

export function createStatsRouter(options: StatsRouterOptions): Router {
  const { statsService, codeStatsService } = options;
  const router = Router();

  // GET /api/stats/activity - Get activity stats (daily + heatmap)
  router.get('/activity', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await statsService.getActivityStats(days);
      sendSuccess(res, stats);
    } catch (error) {
      console.error('[API] Error getting activity stats:', error);
      sendError(res, 500, 'Failed to get activity stats');
    }
  });

  // GET /api/stats/projects/:path/trends - Get project trends
  router.get('/projects/:path/trends', async (req, res) => {
    try {
      const projectPath = decodeURIComponent(req.params.path);
      const days = parseInt(req.query.days as string) || 30;
      const trends = await statsService.getProjectTrends(projectPath, days);
      sendSuccess(res, trends);
    } catch (error) {
      console.error('[API] Error getting project trends:', error);
      sendError(res, 500, 'Failed to get project trends');
    }
  });

  // GET /api/stats/usage - Get usage statistics
  router.get('/usage', async (_req, res) => {
    try {
      const stats = await statsService.getUsageStats();
      sendSuccess(res, stats);
    } catch (error) {
      console.error('[API] Error getting usage stats:', error);
      sendError(res, 500, 'Failed to get usage stats');
    }
  });

  // GET /api/stats/code-output - Get code output statistics
  router.get('/code-output', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const codeStats = await codeStatsService.getCodeStats(days);
      sendSuccess(res, codeStats);
    } catch (error) {
      console.error('[API] Error getting code output stats:', error);
      sendError(res, 500, 'Failed to get code output stats');
    }
  });

  return router;
}
