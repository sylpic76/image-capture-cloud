
import { ScreenCaptureConfig } from './types';

// Configuration standard sans limitations restrictives
export const defaultConfig: ScreenCaptureConfig = {
  disableAdvancedSDK: false, // Permettre les fonctionnalités avancées
  requestFrameRate: 30,      // Utiliser un taux de rafraîchissement normal
  enforceBasicMode: false,   // Ne pas forcer le mode basique
  useLowResolution: false,   // Utiliser une résolution normale
};

export const lockConfiguration = (config: Partial<ScreenCaptureConfig> = {}): ScreenCaptureConfig => {
  // Fusionner la config par défaut avec les paramètres fournis
  const mergedConfig = {
    ...defaultConfig,
    ...config,
  };
  
  // Ne pas verrouiller la configuration pour permettre des modifications dynamiques
  return mergedConfig;
};
