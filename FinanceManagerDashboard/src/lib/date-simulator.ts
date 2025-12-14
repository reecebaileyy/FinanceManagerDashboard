/**
 * Date Simulator for Testing
 * Allows overriding the current date for testing purposes
 */

let simulatedDate: Date | null = null;

/**
 * Get the current date, or simulated date if set
 */
export function getCurrentDate(): Date {
  return simulatedDate || new Date();
}

/**
 * Set a simulated date for testing
 * @param date - Date to simulate, or null to use real current date
 */
export function setSimulatedDate(date: Date | string | null): void {
  if (date === null) {
    simulatedDate = null;
  } else if (typeof date === 'string') {
    simulatedDate = new Date(date);
  } else {
    simulatedDate = date;
  }
  
  // Store in localStorage for persistence
  if (typeof window !== 'undefined') {
    if (simulatedDate) {
      localStorage.setItem('simulatedDate', simulatedDate.toISOString());
    } else {
      localStorage.removeItem('simulatedDate');
    }
  }
}

/**
 * Load simulated date from localStorage on initialization
 */
export function initializeDateSimulator(): void {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('simulatedDate');
    if (stored) {
      simulatedDate = new Date(stored);
    }
  }
}

/**
 * Reset to real current date
 */
export function resetSimulatedDate(): void {
  setSimulatedDate(null);
}

/**
 * Check if date is currently being simulated
 */
export function isDateSimulated(): boolean {
  return simulatedDate !== null;
}

/**
 * Get the simulated date (or null if not simulating)
 */
export function getSimulatedDate(): Date | null {
  return simulatedDate;
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initializeDateSimulator();
}
