
import { ScreenCaptureConfig } from './types';

// Configuration pour limiter l'accès aux API sensibles
export const defaultConfig: ScreenCaptureConfig = {
  disableAdvancedSDK: true, // Désactive par défaut les fonctionnalités avancées des SDK
  requestFrameRate: 1, // Limite le taux de rafraîchissement (1 = très lent)
  enforceBasicMode: true, // Force le mode basique de capture
  useLowResolution: true, // Utilise une résolution plus basse
};

export const lockConfiguration = (config: Partial<ScreenCaptureConfig> = {}): ScreenCaptureConfig => {
  // Fusionner la config par défaut avec les paramètres fournis
  const mergedConfig = {
    ...defaultConfig,
    ...config,
    // Toujours forcer disableAdvancedSDK à true pour des raisons de sécurité
    disableAdvancedSDK: true,
  };
  
  // Verrouiller la configuration pour qu'elle ne puisse pas être modifiée
  return Object.freeze(mergedConfig);
};
