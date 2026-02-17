import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Favorites data structures
export interface SessionNamesMap {
  [sessionId: string]: string;
}

export interface TeamNamesMap {
  [teamId: string]: string;
}

export interface SessionTagsMap {
  [sessionId: string]: string[];
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: Record<string, any>;
  createdAt: string;
}

export interface FavoritesData {
  sessionNames: SessionNamesMap;
  teamNames: TeamNamesMap;
  sessionTags: SessionTagsMap;
  savedFilters: SavedFilter[];
}

export class FavoritesService {
  private favoritesDir: string;
  private favoritesFile: string;
  private cache: FavoritesData | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 seconds cache TTL

  constructor(favoritesDir?: string) {
    this.favoritesDir = favoritesDir || path.join(os.homedir(), '.claude', 'favorites');
    this.favoritesFile = path.join(this.favoritesDir, 'favorites.json');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.favoritesDir, { recursive: true });
      console.log('[FavoritesService] Directory ensured:', this.favoritesDir);
    } catch (error) {
      console.error('[FavoritesService] Failed to create directory:', error);
      throw error;
    }
  }

  private async loadFavorites(): Promise<FavoritesData> {
    // Check if cache is still valid
    const now = Date.now();
    if (this.cache && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      const data = await fs.readFile(this.favoritesFile, 'utf-8');
      const parsed = JSON.parse(data) as FavoritesData;
      this.cache = parsed;
      this.lastLoadTime = now;
      return parsed;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default empty data
        const defaultData: FavoritesData = {
          sessionNames: {},
          teamNames: {},
          sessionTags: {},
          savedFilters: [],
        };
        this.cache = defaultData;
        this.lastLoadTime = now;
        return defaultData;
      }
      console.error('[FavoritesService] Failed to load favorites:', error);
      throw error;
    }
  }

  private async saveFavorites(data: FavoritesData): Promise<void> {
    try {
      await fs.writeFile(this.favoritesFile, JSON.stringify(data, null, 2), 'utf-8');
      this.cache = data;
      this.lastLoadTime = Date.now();
      console.log('[FavoritesService] Favorites saved successfully');
    } catch (error) {
      console.error('[FavoritesService] Failed to save favorites:', error);
      throw error;
    }
  }

  // Session Names (Favorites)
  async getSessionNames(): Promise<SessionNamesMap> {
    const data = await this.loadFavorites();
    return data.sessionNames;
  }

  async setSessionName(sessionId: string, name: string): Promise<void> {
    const data = await this.loadFavorites();
    if (name.trim()) {
      data.sessionNames[sessionId] = name.trim();
    } else {
      delete data.sessionNames[sessionId];
    }
    await this.saveFavorites(data);
  }

  async removeSessionName(sessionId: string): Promise<void> {
    const data = await this.loadFavorites();
    delete data.sessionNames[sessionId];
    await this.saveFavorites(data);
  }

  // Team Names (Favorites)
  async getTeamNames(): Promise<TeamNamesMap> {
    const data = await this.loadFavorites();
    return data.teamNames;
  }

  async setTeamName(teamId: string, name: string): Promise<void> {
    const data = await this.loadFavorites();
    if (name.trim()) {
      data.teamNames[teamId] = name.trim();
    } else {
      delete data.teamNames[teamId];
    }
    await this.saveFavorites(data);
  }

  async removeTeamName(teamId: string): Promise<void> {
    const data = await this.loadFavorites();
    delete data.teamNames[teamId];
    await this.saveFavorites(data);
  }

  // Session Tags
  async getSessionTags(): Promise<SessionTagsMap> {
    const data = await this.loadFavorites();
    return data.sessionTags;
  }

  async setSessionTags(sessionId: string, tags: string[]): Promise<void> {
    const data = await this.loadFavorites();
    if (tags.length > 0) {
      data.sessionTags[sessionId] = tags;
    } else {
      delete data.sessionTags[sessionId];
    }
    await this.saveFavorites(data);
  }

  async addSessionTag(sessionId: string, tag: string): Promise<void> {
    const data = await this.loadFavorites();
    const existingTags = data.sessionTags[sessionId] || [];
    if (!existingTags.includes(tag)) {
      data.sessionTags[sessionId] = [...existingTags, tag];
      await this.saveFavorites(data);
    }
  }

  async removeSessionTag(sessionId: string, tag: string): Promise<void> {
    const data = await this.loadFavorites();
    const existingTags = data.sessionTags[sessionId] || [];
    data.sessionTags[sessionId] = existingTags.filter(t => t !== tag);
    if (data.sessionTags[sessionId].length === 0) {
      delete data.sessionTags[sessionId];
    }
    await this.saveFavorites(data);
  }

  // Saved Filters
  async getSavedFilters(): Promise<SavedFilter[]> {
    const data = await this.loadFavorites();
    return data.savedFilters;
  }

  async addSavedFilter(filter: Omit<SavedFilter, 'id' | 'createdAt'>): Promise<SavedFilter> {
    const data = await this.loadFavorites();
    const newFilter: SavedFilter = {
      ...filter,
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    data.savedFilters.push(newFilter);
    await this.saveFavorites(data);
    return newFilter;
  }

  async updateSavedFilter(id: string, updates: Partial<Omit<SavedFilter, 'id' | 'createdAt'>>): Promise<SavedFilter | null> {
    const data = await this.loadFavorites();
    const index = data.savedFilters.findIndex(f => f.id === id);
    if (index === -1) {
      return null;
    }
    data.savedFilters[index] = { ...data.savedFilters[index], ...updates };
    await this.saveFavorites(data);
    return data.savedFilters[index];
  }

  async deleteSavedFilter(id: string): Promise<boolean> {
    const data = await this.loadFavorites();
    const initialLength = data.savedFilters.length;
    data.savedFilters = data.savedFilters.filter(f => f.id !== id);
    if (data.savedFilters.length < initialLength) {
      await this.saveFavorites(data);
      return true;
    }
    return false;
  }

  // Get all favorites data (for export/backup)
  async getAllFavorites(): Promise<FavoritesData> {
    return this.loadFavorites();
  }

  // Import favorites data (for restore)
  async importFavorites(data: FavoritesData): Promise<void> {
    await this.saveFavorites(data);
  }

  // Clear cache (useful for testing or force reload)
  clearCache(): void {
    this.cache = null;
    this.lastLoadTime = 0;
  }
}
