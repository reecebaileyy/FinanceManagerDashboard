import { Goal, GoalsWorkspacePayload } from './goals';

const GOALS_STORAGE_KEY = 'finance_manager_goals';
const GOALS_WORKSPACE_STORAGE_KEY = 'finance_manager_goals_workspace';

interface StorageStrategy {
  getGoalsWorkspace(): Promise<GoalsWorkspacePayload | null>;
  saveGoalsWorkspace(workspace: GoalsWorkspacePayload): Promise<void>;
}

class LocalStorageStrategy implements StorageStrategy {
  async getGoalsWorkspace(): Promise<GoalsWorkspacePayload | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = localStorage.getItem(GOALS_WORKSPACE_STORAGE_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as GoalsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to read goals from localStorage:', error);
      return null;
    }
  }

  async saveGoalsWorkspace(workspace: GoalsWorkspacePayload): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(GOALS_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.warn('Failed to save goals to localStorage:', error);
      throw error;
    }
  }
}

class ApiStrategy implements StorageStrategy {
  async getGoalsWorkspace(): Promise<GoalsWorkspacePayload | null> {
    try {
      const response = await fetch('/api/goals');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as GoalsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to fetch goals from API:', error);
      return null;
    }
  }

  async saveGoalsWorkspace(workspace: GoalsWorkspacePayload): Promise<void> {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workspace),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to save goals via API:', error);
      throw error;
    }
  }
}

class HybridStorage {
  private apiStrategy = new ApiStrategy();
  private localStrategy = new LocalStorageStrategy();

  async getGoalsWorkspace(): Promise<GoalsWorkspacePayload | null> {
    // Try API first
    const apiResult = await this.apiStrategy.getGoalsWorkspace();
    if (apiResult) {
      // Cache successful API result in localStorage
      try {
        await this.localStrategy.saveGoalsWorkspace(apiResult);
      } catch {
        // Ignore localStorage save errors
      }
      return apiResult;
    }

    // Fallback to localStorage
    return await this.localStrategy.getGoalsWorkspace();
  }

  async saveGoalsWorkspace(workspace: GoalsWorkspacePayload): Promise<void> {
    const errors: Error[] = [];

    // Try to save to API
    try {
      await this.apiStrategy.saveGoalsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }

    // Always try to save to localStorage as backup
    try {
      await this.localStrategy.saveGoalsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }

    // If both failed, throw the first error
    if (errors.length === 2) {
      throw errors[0];
    }
  }
}

export const goalsStorage = new HybridStorage();