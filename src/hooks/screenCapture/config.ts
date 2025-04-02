
import { ScreenCaptureConfig } from './types';

// Configuration sans aucune limitation - performance maximale
export const defaultConfig: ScreenCaptureConfig = {
  disableAdvancedSDK: false, // Activer les fonctionnalités avancées
  requestFrameRate: 30,      // Utiliser un taux de rafraîchissement élevé
  enforceBasicMode: false,   // Ne pas forcer le mode basique
  useLowResolution: false,   // Utiliser une résolution normale
};

export const lockConfiguration = (config: Partial<ScreenCaptureConfig> = {}): ScreenCaptureConfig => {
  // Fusionner la config par défaut avec les paramètres fournis
  return {
    ...defaultConfig,
    ...config,
  };
};
