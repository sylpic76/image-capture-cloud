
import { ScreenCaptureConfig } from './types';

// Configuration sans AUCUNE limitation - performance maximale
export const defaultConfig: ScreenCaptureConfig = {
  disableAdvancedSDK: false, // Activer les fonctionnalités avancées
  requestFrameRate: 60,      // Utiliser un taux de rafraîchissement très élevé
  useLowResolution: false,   // Utiliser une résolution normale
  captureWithAudio: false,   // Ne pas capturer l'audio par défaut
};

// Configuration simple sans verrouillage
export const lockConfiguration = (config: Partial<ScreenCaptureConfig> = {}): ScreenCaptureConfig => {
  // Fusionner la config par défaut avec les paramètres fournis - pas de restrictions
  return {
    ...defaultConfig,
    ...config,
  };
};
