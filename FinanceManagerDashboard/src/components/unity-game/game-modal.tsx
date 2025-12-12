'use client';

import { useEffect, useRef, useState } from 'react';

import { DifficultySelector } from './difficulty-selector';
import type { GameDifficulty } from './types';
import { UnityGamePlayer } from './unity-game-player';

import styles from './game-modal.module.css';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameModal({ isOpen, onClose }: GameModalProps) {
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
    } else {
      // Reset difficulty when modal closes
      setSelectedDifficulty(null);
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
  }, [isOpen]);

  const handleClose = () => {
    setSelectedDifficulty(null);
    onClose();
  };

  const handleSelectDifficulty = (difficulty: GameDifficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleBackGame = () => {
    setSelectedDifficulty(null);
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
          {selectedDifficulty && (
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
            {selectedDifficulty ? 'Budgeting Game' : 'Choose Your Challenge'}
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
            <DifficultySelector onSelectDifficulty={handleSelectDifficulty} />
          )}
        </div>
      </div>
    </div>
  );
}


