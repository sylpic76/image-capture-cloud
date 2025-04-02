
import { ScreenCaptureConfig } from './types';

// Configuration sans AUCUNE limitation - performance maximale
export const defaultConfig: ScreenCaptureConfig = {
  disableAdvancedSDK: false, // Activer les fonctionnalités avancées
  requestFrameRate: 60,      // Utiliser un taux de rafraîchissement très élevé
  enforceBasicMode: false,   // Ne pas forcer le mode basique
  useLowResolution: false,   // Utiliser une résolution normale
};

// Configuration simple sans verrouillage
export const lockConfiguration = (config: Partial<ScreenCaptureConfig> = {}): ScreenCaptureConfig => {
  // Fusionner la config par défaut avec les paramètres fournis - pas de restrictions
  return {
    ...defaultConfig,
    ...config,
  };
};
