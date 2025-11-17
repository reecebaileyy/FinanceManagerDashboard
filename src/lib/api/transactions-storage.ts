import { TransactionsWorkspacePayload } from './transactions';

const TRANSACTIONS_WORKSPACE_STORAGE_KEY = 'finance_manager_transactions_workspace';

interface StorageStrategy {
  getTransactionsWorkspace(): Promise<TransactionsWorkspacePayload | null>;
  saveTransactionsWorkspace(workspace: TransactionsWorkspacePayload): Promise<void>;
}

class LocalStorageStrategy implements StorageStrategy {
  async getTransactionsWorkspace(): Promise<TransactionsWorkspacePayload | null> {
    try {
      if (typeof window === 'undefined') return null;
      const stored = localStorage.getItem(TRANSACTIONS_WORKSPACE_STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as TransactionsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to read transactions from localStorage:', error);
      return null;
    }
  }

  async saveTransactionsWorkspace(workspace: TransactionsWorkspacePayload): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(TRANSACTIONS_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.warn('Failed to save transactions to localStorage:', error);
      throw error;
    }
  }
}

class ApiStrategy implements StorageStrategy {
  async getTransactionsWorkspace(): Promise<TransactionsWorkspacePayload | null> {
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return (await response.json()) as TransactionsWorkspacePayload;
    } catch (error) {
      console.warn('Failed to fetch transactions from API:', error);
      return null;
    }
  }

  async saveTransactionsWorkspace(workspace: TransactionsWorkspacePayload): Promise<void> {
    try {
      const response = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspace),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to save transactions via API:', error);
      throw error;
    }
  }
}

class HybridStorage {
  private apiStrategy = new ApiStrategy();
  private localStrategy = new LocalStorageStrategy();

  async getTransactionsWorkspace(): Promise<TransactionsWorkspacePayload | null> {
    const apiResult = await this.apiStrategy.getTransactionsWorkspace();
    if (apiResult) {
      try {
        await this.localStrategy.saveTransactionsWorkspace(apiResult);
      } catch {}
      return apiResult;
    }
    return await this.localStrategy.getTransactionsWorkspace();
  }

  async saveTransactionsWorkspace(workspace: TransactionsWorkspacePayload): Promise<void> {
    const errors: Error[] = [];
    try {
      await this.apiStrategy.saveTransactionsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }
    try {
      await this.localStrategy.saveTransactionsWorkspace(workspace);
    } catch (error) {
      errors.push(error as Error);
    }
    if (errors.length === 2) {
      throw errors[0];
    }
  }
}

export const transactionsStorage = new HybridStorage();
