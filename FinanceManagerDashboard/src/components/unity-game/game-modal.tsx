'use client';

import { useEffect, useRef, useState } from 'react';

import { DifficultySelector } from './difficulty-selector';
import type { GameDifficulty } from './types';
import { UnityGamePlayer } from './unity-game-player';

import styles from './game-modal.module.css';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendedDifficulty?: GameDifficulty;
  recommendationReason?: string;
  autoStart?: boolean; // If true, automatically starts with recommended difficulty
}

export function GameModal({ isOpen, onClose, recommendedDifficulty, recommendationReason, autoStart = false }: GameModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Focus the modal when it opens
      modalRef.current.focus();
    }
    
    // Auto-start with recommended difficulty when modal opens
    if (isOpen && autoStart && recommendedDifficulty) {
      setSelectedDifficulty(recommendedDifficulty);
    } else if (!isOpen) {
      // Reset when closing
      setSelectedDifficulty(null);
    }
  }, [isOpen, autoStart, recommendedDifficulty]);

  const handleClose = () => {
    setSelectedDifficulty(null);
    onClose();
  };

  const handleSelectDifficulty = (difficulty: GameDifficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleBackGame = () => {
    if (autoStart) {
      // If autoStart is enabled, going back closes the modal entirely
      handleClose();
    } else {
      setSelectedDifficulty(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
    >
      <div
        ref={modalRef}
        className={styles.modalContent}
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          {selectedDifficulty && !autoStart && (
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackGame}
              aria-label="Back to difficulty selection"
            >
              ← Back
            </button>
          )}
          <h2 id="game-modal-title" className={styles.modalTitle}>
            {selectedDifficulty 
              ? `Budgeting Game: Difficulty ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`
              : 'Choose Your Challenge'}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close game"
          >
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          {selectedDifficulty ? (
            <UnityGamePlayer difficulty={selectedDifficulty} />
          ) : (
            <DifficultySelector 
              onSelectDifficulty={handleSelectDifficulty}
              recommendedDifficulty={recommendedDifficulty}
              recommendationReason={recommendationReason}
            />
          )}
        </div>
      </div>
    </div>
  );
}


