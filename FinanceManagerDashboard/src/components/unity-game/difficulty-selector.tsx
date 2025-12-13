'use client';

import type { GameDifficulty } from './types';

import styles from './game-modal.module.css';

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
}

export function DifficultySelector({ onSelectDifficulty, recommendedDifficulty, recommendationReason }: DifficultySelectorProps) {
  return (
    <div className={styles.difficultySelector}>
      <h3 className={styles.difficultySelectorTitle}>Select Difficulty</h3>
      <p className={styles.difficultySelectorSubtitle}>
        {recommendedDifficulty 
          ? `Recommended based on your financial performance`
          : 'Choose your challenge level for the budgeting game'}
      </p>

      {recommendationReason && (
        <div className={styles.recommendationReason}>
          <span className={styles.recommendationIcon}>💡</span>
          <span>{recommendationReason}</span>
        </div>
      )}

      <div className={styles.difficultyOptions}>
        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyEasy} ${recommendedDifficulty === 'easy' ? styles.difficultyRecommended : ''}`}
          onClick={() => onSelectDifficulty('easy')}
        >
          {recommendedDifficulty === 'easy' && (
            <span className={styles.recommendedBadge}>Recommended</span>
          )}
          <span className={styles.difficultyIcon}>🌱</span>
          <span className={styles.difficultyLabel}>Easy</span>
          <span className={styles.difficultyDescription}>Perfect for beginners</span>
        </button>

        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyNormal} ${recommendedDifficulty === 'normal' ? styles.difficultyRecommended : ''}`}
          onClick={() => onSelectDifficulty('normal')}
        >
          {recommendedDifficulty === 'normal' && (
            <span className={styles.recommendedBadge}>Recommended</span>
          )}
          <span className={styles.difficultyIcon}>⚡</span>
          <span className={styles.difficultyLabel}>Normal</span>
          <span className={styles.difficultyDescription}>Balanced challenge</span>
        </button>

        <button
          type="button"
          className={`${styles.difficultyButton} ${styles.difficultyHard} ${recommendedDifficulty === 'hard' ? styles.difficultyRecommended : ''}`}
          onClick={() => onSelectDifficulty('hard')}
        >
          {recommendedDifficulty === 'hard' && (
            <span className={styles.recommendedBadge}>Recommended</span>
          )}
          <span className={styles.difficultyIcon}>🔥</span>
          <span className={styles.difficultyLabel}>Hard</span>
          <span className={styles.difficultyDescription}>Expert mode</span>
        </button>
      </div>
    </div>
  );
}


