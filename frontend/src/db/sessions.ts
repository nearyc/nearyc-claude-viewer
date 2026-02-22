import type { Session, Project } from '../types';

// Initialize IndexedDB
const DB_NAME = 'ClaudeViewerDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const PROJECTS_STORE = 'projects';

export interface DBSession extends Session {
  id: string;
}

export interface DBProject extends Project {
  id: string;
}

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB connected successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          sessionsStore.createIndex('project', 'project', { unique: false });
          sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create projects store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          const projectsStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
          projectsStore.createIndex('lastActive', 'lastActive', { unique: false });
          projectsStore.createIndex('name', 'name', { unique: false });
        }

        console.log('IndexedDB stores created');
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.readyPromise;
    }
    return this.db!;
  }

  async saveSessions(sessions: DBSession[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);

      // Clear existing sessions
      store.clear();

      transaction.oncomplete = () => {
        console.log(`Saved ${sessions.length} sessions to IndexedDB`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Error saving sessions to IndexedDB:', transaction.error);
        reject(transaction.error);
      };

      // Add new sessions
      for (const session of sessions) {
        store.add(session);
      }
    });
  }

  async getSessions(): Promise<DBSession[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`Retrieved ${request.result.length} sessions from IndexedDB`);
        resolve(request.result as DBSession[]);
      };

      request.onerror = () => {
        console.error('Error retrieving sessions from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async saveProjects(projects: DBProject[]): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);

      // Clear existing projects
      store.clear();

      transaction.oncomplete = () => {
        console.log(`Saved ${projects.length} projects to IndexedDB`);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Error saving projects to IndexedDB:', transaction.error);
        reject(transaction.error);
      };

      // Add new projects
      for (const project of projects) {
        store.add({ ...project, id: project.path }); // Use path as ID for projects
      }
    });
  }

  async getProjects(): Promise<DBProject[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log(`Retrieved ${request.result.length} projects from IndexedDB`);
        resolve(request.result as DBProject[]);
      };

      request.onerror = () => {
        console.error('Error retrieving projects from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE, PROJECTS_STORE], 'readwrite');
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      const projectsStore = transaction.objectStore(PROJECTS_STORE);

      const sessionsReq = sessionsStore.clear();
      const projectsReq = projectsStore.clear();

      transaction.oncomplete = () => {
        console.log('IndexedDB cleared successfully');
        resolve();
      };

      transaction.onerror = () => {
        console.error('Error clearing IndexedDB:', transaction.error);
        reject(transaction.error);
      };
    });
  }
}

// Export singleton instance
export const indexedDBStorage = new IndexedDBStorage();