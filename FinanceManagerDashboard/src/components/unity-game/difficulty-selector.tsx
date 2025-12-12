'use client';

import type { GameDifficulty } from './types';

import styles from './game-modal.module.css';

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
}

export function DifficultySelector({ onSelectDifficulty }: DifficultySelectorProps) {
  return (
    <div className={styles.difficultySelector}>
      <h3 className={styles.difficultySelectorTitle}>Select Difficulty</h3>
      <p className={styles.difficultySelectorSubtitle}>
        Choose your challenge level for the budgeting game
      </p>

      <div className={styles.difficultyOptions}>
        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyEasy}`}
          onClick={() => onSelectDifficulty('easy')}
        >
          <span className={styles.difficultyIcon}>🌱</span>
          <span className={styles.difficultyLabel}>Easy</span>
          <span className={styles.difficultyDescription}>Perfect for beginners</span>
        </button>

        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyNormal}`}
          onClick={() => onSelectDifficulty('normal')}
        >
          <span className={styles.difficultyIcon}>⚡</span>
          <span className={styles.difficultyLabel}>Normal</span>
          <span className={styles.difficultyDescription}>Balanced challenge</span>
        </button>

        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyHard}`}
          onClick={() => onSelectDifficulty('hard')}
        >
          <span className={styles.difficultyIcon}>🔥</span>
          <span className={styles.difficultyLabel}>Hard</span>
          <span className={styles.difficultyDescription}>Expert mode</span>
        </button>
      </div>
    </div>
  );
}

