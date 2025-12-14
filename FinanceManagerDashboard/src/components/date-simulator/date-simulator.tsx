'use client';

import { useEffect, useState } from 'react';
import { getCurrentDate, setSimulatedDate, resetSimulatedDate, isDateSimulated } from '@lib/date-simulator';
import styles from './date-simulator.module.css';

export function DateSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(getCurrentDate());
  const [inputDate, setInputDate] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(isDateSimulated());

  useEffect(() => {
    const updateCurrentDate = () => {
      setCurrentDate(getCurrentDate());
      setIsSimulating(isDateSimulated());
    };

    // Update every second
    const interval = setInterval(updateCurrentDate, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialize input with current simulated date
    const date = getCurrentDate();
    setInputDate(date.toISOString().split('T')[0]);
  }, []);

  const handleSetDate = () => {
    if (inputDate) {
      setSimulatedDate(inputDate);
      setCurrentDate(getCurrentDate());
      setIsSimulating(true);
      // Force reload to update all components
      window.location.reload();
    }
  };

  const handleReset = () => {
    resetSimulatedDate();
    setCurrentDate(new Date());
    setInputDate(new Date().toISOString().split('T')[0]);
    setIsSimulating(false);
    // Force reload to update all components
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.toggleButton} ${isSimulating ? styles.active : ''}`}
        title="Date Simulator (Testing)"
      >
        📅 {isSimulating ? 'Simulating' : 'Real Time'}
      </button>

      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <h3>Date Simulator (Testing)</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.closeButton}
            >
              ×
            </button>
          </div>

          <div className={styles.content}>
            <div className={styles.currentDate}>
              <label>Current Date:</label>
              <div className={styles.dateDisplay}>
                {currentDate.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {isSimulating && (
                <span className={styles.simulatingBadge}>Simulated</span>
              )}
            </div>

            <div className={styles.controls}>
              <label htmlFor="date-input">Set Simulated Date:</label>
              <input
                id="date-input"
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className={styles.dateInput}
              />
              <div className={styles.buttons}>
                <button
                  type="button"
                  onClick={handleSetDate}
                  className={styles.setButton}
                  disabled={!inputDate}
                >
                  Set Date
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.resetButton}
                  disabled={!isSimulating}
                >
                  Reset to Real Time
                </button>
              </div>
            </div>

            <div className={styles.info}>
              <p>
                <strong>Note:</strong> This simulator allows you to test date-dependent features like
                goal deadlines. The simulated date persists across page reloads.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
