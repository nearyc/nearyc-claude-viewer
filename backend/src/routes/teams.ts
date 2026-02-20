import { Router, type Response } from 'express';
import type { TeamsService } from '../services/TeamsService';
import type { ApiResponse, Team, TeamWithInboxes, Message, TeamStats } from '../types';

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

interface TeamsRouterOptions {
  teamsService: TeamsService;
}

export function createTeamsRouter(options: TeamsRouterOptions): Router {
  const { teamsService } = options;
  const router = Router();

  // GET /api/teams - Get all teams
  router.get('/', async (req, res) => {
    try {
      const { refresh } = req.query;

      // Force refresh - clear cache and reload from disk
      if (refresh === 'true') {
        teamsService.clearCache();
        // Debug: console.log('[API] Teams cache refreshed');
      }

      const teams = await teamsService.getTeams();
      sendSuccess(res, teams, teams.length);
    } catch (error) {
      console.error('[API] Error getting teams:', error);
      sendError(res, 500, 'Failed to get teams');
    }
  });

  // GET /api/teams/:id - Get single team details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { messages } = req.query;

      const team = messages === 'true'
        ? await teamsService.getTeamWithInboxes(id)
        : await teamsService.getTeamById(id);

      if (!team) {
        sendError(res, 404, 'Team not found');
        return;
      }

      sendSuccess(res, team);
    } catch (error) {
      console.error('[API] Error getting team:', error);
      sendError(res, 500, 'Failed to get team');
    }
  });

  // GET /api/teams/:id/messages - Get all messages for a team
  router.get('/:id/messages', async (req, res) => {
    try {
      const { id } = req.params;
      const { member } = req.query;

      const messages: Message[] = member && typeof member === 'string'
        ? await teamsService.getMessages(id, member)
        : await teamsService.getAllTeamMessages(id);

      sendSuccess(res, messages, messages.length);
    } catch (error) {
      console.error('[API] Error getting messages:', error);
      sendError(res, 500, 'Failed to get messages');
    }
  });

  // GET /api/teams/:id/stats - Get team statistics
  router.get('/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;

      const stats = await teamsService.getTeamStats(id);

      if (!stats) {
        sendError(res, 404, 'Team not found');
        return;
      }

      sendSuccess(res, stats);
    } catch (error) {
      console.error('[API] Error getting team stats:', error);
      sendError(res, 500, 'Failed to get team stats');
    }
  });

  // DELETE /api/teams/:id - Delete a team
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if team exists
      const team = await teamsService.getTeamById(id);
      if (!team) {
        sendError(res, 404, 'Team not found');
        return;
      }

      // Delete the team
      const success = await teamsService.deleteTeam(id);

      if (success) {
        // Clear cache and reload to ensure fresh data
        await teamsService.afterDelete();
        // SSE clients will receive updates via file watcher events
        sendSuccess(res, { message: 'Team deleted successfully' });
      } else {
        sendError(res, 500, 'Failed to delete team');
      }
    } catch (error) {
      console.error('[API] Error deleting team:', error);
      sendError(res, 500, 'Failed to delete team');
    }
  });

  return router;
}
