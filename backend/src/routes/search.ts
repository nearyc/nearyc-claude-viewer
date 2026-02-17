import { Router, type Response } from 'express';
import type { SearchService } from '../services/searchService';
import type { ApiResponse, SearchResult } from '../types';

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

interface SearchRouterOptions {
  searchService: SearchService;
}

export function createSearchRouter(options: SearchRouterOptions): Router {
  const { searchService } = options;
  const router = Router();

  // GET /api/search - Search across sessions and team messages
  router.get('/', async (req, res) => {
    try {
      const { q, type, limit } = req.query;

      if (!q || typeof q !== 'string') {
        sendError(res, 400, 'Query parameter "q" is required');
        return;
      }

      const searchOptions = {
        query: q,
        type: (type as 'session' | 'team_message' | 'all') || 'all',
        limit: limit ? parseInt(limit as string, 10) : 50,
      };

      const results = await searchService.search(searchOptions);
      sendSuccess(res, results, results.length);
    } catch (error) {
      console.error('[API] Error performing search:', error);
      sendError(res, 500, 'Failed to perform search');
    }
  });

  return router;
}
