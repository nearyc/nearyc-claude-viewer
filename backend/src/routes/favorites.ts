import { Router, type Response, type Request } from 'express';
import type { FavoritesService } from '../services/favoritesService';
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

interface FavoritesRouterOptions {
  favoritesService: FavoritesService;
}

export function createFavoritesRouter(options: FavoritesRouterOptions): Router {
  const { favoritesService } = options;
  const router = Router();

  // GET /api/favorites - Get all favorites data
  router.get('/', async (_req, res) => {
    try {
      const favorites = await favoritesService.getAllFavorites();
      sendSuccess(res, favorites);
    } catch (error) {
      console.error('[API] Error getting favorites:', error);
      sendError(res, 500, 'Failed to get favorites');
    }
  });

  // ===== Session Names =====
  // GET /api/favorites/session-names - Get all session names
  router.get('/session-names', async (_req, res) => {
    try {
      const sessionNames = await favoritesService.getSessionNames();
      sendSuccess(res, sessionNames);
    } catch (error) {
      console.error('[API] Error getting session names:', error);
      sendError(res, 500, 'Failed to get session names');
    }
  });

  // POST /api/favorites/session-names/:sessionId - Set session name
  router.post('/session-names/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { name } = req.body;

      if (typeof name !== 'string') {
        sendError(res, 400, 'Name must be a string');
        return;
      }

      await favoritesService.setSessionName(sessionId, name);
      sendSuccess(res, { message: 'Session name updated successfully' });
    } catch (error) {
      console.error('[API] Error setting session name:', error);
      sendError(res, 500, 'Failed to set session name');
    }
  });

  // DELETE /api/favorites/session-names/:sessionId - Remove session name
  router.delete('/session-names/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      await favoritesService.removeSessionName(sessionId);
      sendSuccess(res, { message: 'Session name removed successfully' });
    } catch (error) {
      console.error('[API] Error removing session name:', error);
      sendError(res, 500, 'Failed to remove session name');
    }
  });

  // ===== Team Names =====
  // GET /api/favorites/team-names - Get all team names
  router.get('/team-names', async (_req, res) => {
    try {
      const teamNames = await favoritesService.getTeamNames();
      sendSuccess(res, teamNames);
    } catch (error) {
      console.error('[API] Error getting team names:', error);
      sendError(res, 500, 'Failed to get team names');
    }
  });

  // POST /api/favorites/team-names/:teamId - Set team name
  router.post('/team-names/:teamId', async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name } = req.body;

      if (typeof name !== 'string') {
        sendError(res, 400, 'Name must be a string');
        return;
      }

      await favoritesService.setTeamName(teamId, name);
      sendSuccess(res, { message: 'Team name updated successfully' });
    } catch (error) {
      console.error('[API] Error setting team name:', error);
      sendError(res, 500, 'Failed to set team name');
    }
  });

  // DELETE /api/favorites/team-names/:teamId - Remove team name
  router.delete('/team-names/:teamId', async (req, res) => {
    try {
      const { teamId } = req.params;
      await favoritesService.removeTeamName(teamId);
      sendSuccess(res, { message: 'Team name removed successfully' });
    } catch (error) {
      console.error('[API] Error removing team name:', error);
      sendError(res, 500, 'Failed to remove team name');
    }
  });

  // ===== Session Tags =====
  // GET /api/favorites/session-tags - Get all session tags
  router.get('/session-tags', async (_req, res) => {
    try {
      const sessionTags = await favoritesService.getSessionTags();
      sendSuccess(res, sessionTags);
    } catch (error) {
      console.error('[API] Error getting session tags:', error);
      sendError(res, 500, 'Failed to get session tags');
    }
  });

  // POST /api/favorites/session-tags/:sessionId - Set session tags
  router.post('/session-tags/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { tags } = req.body;

      if (!Array.isArray(tags) || !tags.every(t => typeof t === 'string')) {
        sendError(res, 400, 'Tags must be an array of strings');
        return;
      }

      await favoritesService.setSessionTags(sessionId, tags);
      sendSuccess(res, { message: 'Session tags updated successfully' });
    } catch (error) {
      console.error('[API] Error setting session tags:', error);
      sendError(res, 500, 'Failed to set session tags');
    }
  });

  // PATCH /api/favorites/session-tags/:sessionId/add - Add a tag to session
  router.patch('/session-tags/:sessionId/add', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { tag } = req.body;

      if (typeof tag !== 'string' || !tag.trim()) {
        sendError(res, 400, 'Tag must be a non-empty string');
        return;
      }

      await favoritesService.addSessionTag(sessionId, tag.trim());
      sendSuccess(res, { message: 'Tag added successfully' });
    } catch (error) {
      console.error('[API] Error adding session tag:', error);
      sendError(res, 500, 'Failed to add session tag');
    }
  });

  // PATCH /api/favorites/session-tags/:sessionId/remove - Remove a tag from session
  router.patch('/session-tags/:sessionId/remove', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { tag } = req.body;

      if (typeof tag !== 'string') {
        sendError(res, 400, 'Tag must be a string');
        return;
      }

      await favoritesService.removeSessionTag(sessionId, tag);
      sendSuccess(res, { message: 'Tag removed successfully' });
    } catch (error) {
      console.error('[API] Error removing session tag:', error);
      sendError(res, 500, 'Failed to remove session tag');
    }
  });

  // ===== Saved Filters =====
  // GET /api/favorites/saved-filters - Get all saved filters
  router.get('/saved-filters', async (_req, res) => {
    try {
      const savedFilters = await favoritesService.getSavedFilters();
      sendSuccess(res, savedFilters);
    } catch (error) {
      console.error('[API] Error getting saved filters:', error);
      sendError(res, 500, 'Failed to get saved filters');
    }
  });

  // POST /api/favorites/saved-filters - Create new saved filter
  router.post('/saved-filters', async (req, res) => {
    try {
      const { name, filter } = req.body;

      if (typeof name !== 'string' || !name.trim()) {
        sendError(res, 400, 'Filter name is required');
        return;
      }

      if (!filter || typeof filter !== 'object') {
        sendError(res, 400, 'Filter object is required');
        return;
      }

      const newFilter = await favoritesService.addSavedFilter({
        name: name.trim(),
        filter,
      });
      sendSuccess(res, newFilter);
    } catch (error) {
      console.error('[API] Error creating saved filter:', error);
      sendError(res, 500, 'Failed to create saved filter');
    }
  });

  // PUT /api/favorites/saved-filters/:id - Update saved filter
  router.put('/saved-filters/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, filter } = req.body;

      const updates: Partial<{ name: string; filter: Record<string, any> }> = {};
      if (name !== undefined) updates.name = name;
      if (filter !== undefined) updates.filter = filter;

      const updatedFilter = await favoritesService.updateSavedFilter(id, updates);
      if (!updatedFilter) {
        sendError(res, 404, 'Filter not found');
        return;
      }
      sendSuccess(res, updatedFilter);
    } catch (error) {
      console.error('[API] Error updating saved filter:', error);
      sendError(res, 500, 'Failed to update saved filter');
    }
  });

  // DELETE /api/favorites/saved-filters/:id - Delete saved filter
  router.delete('/saved-filters/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const success = await favoritesService.deleteSavedFilter(id);
      if (!success) {
        sendError(res, 404, 'Filter not found');
        return;
      }
      sendSuccess(res, { message: 'Filter deleted successfully' });
    } catch (error) {
      console.error('[API] Error deleting saved filter:', error);
      sendError(res, 500, 'Failed to delete saved filter');
    }
  });

  return router;
}
