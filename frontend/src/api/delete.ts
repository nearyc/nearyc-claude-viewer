import axios from 'axios';

const API_BASE = '/api';

/**
 * Delete a team by ID
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    const response = await axios.delete(`${API_BASE}/teams/${teamId}`);
    return response.data.success === true;
  } catch (error) {
    console.error('Failed to delete team:', error);
    throw error;
  }
}

/**
 * Delete a session by ID
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const response = await axios.delete(`${API_BASE}/sessions/${sessionId}`);
    return response.data.success === true;
  } catch (error) {
    console.error('Failed to delete session:', error);
    throw error;
  }
}
