import { createServerInstance } from './server';

const PORT = process.env.PORT || 13927;

const { httpServer, fileWatcher } = createServerInstance();

httpServer.listen(PORT, () => {
  console.log(`
========================================
  Claude Viewer Backend
========================================
Server running on http://localhost:${PORT}

API endpoints:
  GET  /api/health                - Health check
  GET  /api/sessions              - List all sessions
  GET  /api/sessions?refresh=true - Force refresh from disk
  GET  /api/sessions?limit=N      - List N most recent sessions
  GET  /api/sessions?project=PATH - List sessions for project
  GET  /api/sessions?search=QUERY - Search sessions
  GET  /api/sessions/:id          - Get session details
  GET  /api/sessions/:id/full     - Get session with full conversation
  DELETE /api/sessions/:id        - Delete a session
  GET  /api/projects              - List all projects
  GET  /api/projects/:path        - Get project details
  GET  /api/projects/:path/sessions - Get sessions for project
  GET  /api/teams                 - List all teams
  GET  /api/teams?refresh=true    - Force refresh from disk
  GET  /api/teams/:id             - Get team details
  GET  /api/teams/:id/messages    - Get team messages (all members or ?member=NAME)
  GET  /api/teams/:id/stats       - Get team efficiency statistics
  DELETE /api/teams/:id           - Delete a team
  GET  /api/search?q=query        - Search sessions and team messages
  GET  /api/stats/activity        - Get activity stats (daily + heatmap)
  GET  /api/stats/usage           - Get usage statistics
  GET  /api/stats/code-output     - Get code output statistics

WebSocket events:
  sessions:initial    - Initial sessions data on connect
  sessions:updated    - Sessions data updated
  session:data        - Single session data
  session:updated     - Single session update
  projects:initial    - Initial projects data on connect
  projects:updated    - Projects data updated
  teams:initial       - Initial teams data on connect
  teams:updated       - Teams list updated
  team:data           - Full team data with members and inboxes
  team:messages       - Team messages update
  stats:updated       - Dashboard stats update

Environment:
  PORT=${PORT}
  HISTORY_FILE_PATH=${process.env.HISTORY_FILE_PATH || '~/.claude/history.jsonl'}
  TEAMS_DIR=${process.env.TEAMS_DIR || '~/.claude/teams'}
  CORS_ORIGIN=${process.env.CORS_ORIGIN || 'http://localhost:5173'}
========================================
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n[SIGTERM] Shutting down gracefully...');
  fileWatcher.stop();
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SIGINT] Shutting down gracefully...');
  fileWatcher.stop();
  httpServer.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Error] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Error] Unhandled rejection at:', promise, 'reason:', reason);
});
