/**
 * Type definitions for Unity WebGL integration
 */

export type GameDifficulty = 'easy' | 'normal' | 'hard';

export interface UnityConfig {
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl: string;
  companyName: string;
  productName: string;
  productVersion: string;
  showBanner?: (msg: string, type: 'error' | 'warning' | 'info') => void;
  matchWebGLToCanvasSize?: boolean;
  devicePixelRatio?: number;
}

export interface UnityInstance {
  SetFullscreen(fullscreen: number): void;
  SendMessage(objectName: string, methodName: string, value?: string | number): void;
  Quit(): Promise<void>;
}

export type UnityProgressCallback = (progress: number) => void;

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: UnityConfig,
      onProgress?: UnityProgressCallback,
    ) => Promise<UnityInstance>;
  }
}

export {};


