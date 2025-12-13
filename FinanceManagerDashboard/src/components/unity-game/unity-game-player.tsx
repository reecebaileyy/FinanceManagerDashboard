'use client';

import { useEffect, useRef, useState } from 'react';

import type { GameDifficulty, UnityConfig, UnityInstance } from './types';

import styles from './game-modal.module.css';

interface UnityGamePlayerProps {
  difficulty: GameDifficulty;
  onLoaded?: () => void;
  onError?: (error: string) => void;
}

const difficultyConfig = {
  easy: {
    folder: 'BudgetingEasy',
    buildName: 'BudgetingEasy',
    productName: 'Budgeting Game - Easy',
  },
  normal: {
    folder: 'BudgetingNormal',
    buildName: 'BudgetingNormal',
    productName: 'Budgeting Game - Normal',
  },
  hard: {
    folder: 'BudgetingHard',
    buildName: 'BudgetingHard',
    productName: 'Budgeting Game - Hard',
  },
};

export function UnityGamePlayer({ difficulty, onLoaded, onError }: UnityGamePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unityInstanceRef = useRef<UnityInstance | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let scriptElement: HTMLScriptElement | null = null;

    const loadUnityGame = async () => {
      if (!canvasRef.current) {
        return;
      }

      const config = difficultyConfig[difficulty];

      try {
        // Load the Unity loader script
        scriptElement = document.createElement('script');
        scriptElement.src = `/unity-game/${config.folder}/Build/${config.buildName}.loader.js`;

        scriptElement.onload = async () => {
          if (!isMounted || !canvasRef.current) {
            return;
          }

          const canvas = canvasRef.current;

          const unityConfig: UnityConfig = {
            dataUrl: `/unity-game/${config.folder}/Build/${config.buildName}.data`,
            frameworkUrl: `/unity-game/${config.folder}/Build/${config.buildName}.framework.js`,
            codeUrl: `/unity-game/${config.folder}/Build/${config.buildName}.wasm`,
            streamingAssetsUrl: 'StreamingAssets',
            companyName: 'DefaultCompany',
            productName: config.productName,
            productVersion: '1.0',
            showBanner: (msg: string, type: 'error' | 'warning' | 'info') => {
              console.log(`[Unity ${type}]:`, msg);
              if (type === 'error') {
                setError(msg);
                onError?.(msg);
              }
            },
          };

          try {
            if (!window.createUnityInstance) {
              throw new Error('Unity loader not available');
            }

            const unityInstance = await window.createUnityInstance(
              canvas,
              unityConfig,
              (progress: number) => {
                if (isMounted) {
                  setLoadingProgress(Math.round(progress * 100));
                }
              },
            );

            if (isMounted) {
              unityInstanceRef.current = unityInstance;
              setIsLoading(false);
              onLoaded?.();
            }
          } catch (err) {
            if (isMounted) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to load Unity game';
              setError(errorMessage);
              setIsLoading(false);
              onError?.(errorMessage);
            }
          }
        };

        scriptElement.onerror = () => {
          if (isMounted) {
            const errorMessage = 'Failed to load Unity loader script';
            setError(errorMessage);
            setIsLoading(false);
            onError?.(errorMessage);
          }
        };

        document.body.appendChild(scriptElement);
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Unity';
          setError(errorMessage);
          setIsLoading(false);
          onError?.(errorMessage);
        }
      }
    };

    loadUnityGame();

    return () => {
      isMounted = false;

      // Cleanup Unity instance
      if (unityInstanceRef.current) {
        unityInstanceRef.current.Quit().catch((err) => {
          console.error('Error quitting Unity instance:', err);
        });
        unityInstanceRef.current = null;
      }

      // Remove the script element
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, [difficulty, onLoaded, onError]);

  if (error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>Failed to load game</p>
        <p className={styles.errorDetails}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.unityContainer}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingBar}>
            <div className={styles.loadingProgress} style={{ width: `${loadingProgress}%` }} />
          </div>
          <p className={styles.loadingText}>Loading game... {loadingProgress}%</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={styles.unityCanvas}
        id="unity-canvas"
        tabIndex={-1}
      />
    </div>
  );
}


