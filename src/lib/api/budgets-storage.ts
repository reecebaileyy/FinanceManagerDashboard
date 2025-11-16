import { Budget, BudgetsWorkspacePayload } from './budgets';

const BUDGETS_WORKSPACE_STORAGE_KEY = 'finance_manager_budgets_workspace';

interface StorageStrategy {
  getBudgetsWorkspace(): Promise<BudgetsWorkspacePayload | null>;
  saveBudgetsWorkspace(workspace: BudgetsWorkspacePayload): Promise<void>;
}

class LocalStorageStrategy implements StorageStrategy {
  async getBudgetsWorkspace(): Promise<BudgetsWorkspacePayload | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = localStorage.getItem(BUDGETS_WORKSPACE_STORAGE_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored) as BudgetsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to read budgets from localStorage:', error);
      return null;
    }
  }

  async saveBudgetsWorkspace(workspace: BudgetsWorkspacePayload): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.setItem(BUDGETS_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.warn('Failed to save budgets to localStorage:', error);
      throw error;
    }
  }
}

class ApiStrategy implements StorageStrategy {
  async getBudgetsWorkspace(): Promise<BudgetsWorkspacePayload | null> {
    try {
      const response = await fetch('/api/budgets');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json() as BudgetsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to fetch budgets from API:', error);
      return null;
    }
  }

  async saveBudgetsWorkspace(workspace: BudgetsWorkspacePayload): Promise<void> {
    try {
      const response = await fetch('/api/budgets', {
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
      console.warn('Failed to save budgets via API:', error);
      throw error;
    }
  }
}

class HybridStorage {
  private apiStrategy = new ApiStrategy();
  private localStrategy = new LocalStorageStrategy();

  async getBudgetsWorkspace(): Promise<BudgetsWorkspacePayload | null> {
    // Try API first
    const apiResult = await this.apiStrategy.getBudgetsWorkspace();
    if (apiResult) {
      // Cache successful API result in localStorage
      try {
        await this.localStrategy.saveBudgetsWorkspace(apiResult);
      } catch {
        // Ignore localStorage save errors
      }
      return apiResult;
    }

    // Fallback to localStorage
    return await this.localStrategy.getBudgetsWorkspace();
  }

  async saveBudgetsWorkspace(workspace: BudgetsWorkspacePayload): Promise<void> {
    const errors: Error[] = [];

    // Try to save to API
    try {
      await this.apiStrategy.saveBudgetsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }

    // Always try to save to localStorage as backup
    try {
      await this.localStrategy.saveBudgetsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }

    // If both failed, throw the first error
    if (errors.length === 2) {
      throw errors[0];
    }
  }
}

export const budgetsStorage = new HybridStorage();