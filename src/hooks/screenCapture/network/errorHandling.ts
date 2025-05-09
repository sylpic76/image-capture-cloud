
import { toast } from 'sonner';
import { createLogger } from '../logger';

const { logError, logDebug } = createLogger();

// Common error messages for HTTP status codes
export const errorMessages: Record<number, string> = {
  400: "Requête incorrecte. Vérifiez les paramètres.",
  401: "Session expirée ou non autorisée. Veuillez vous reconnecter.",
  403: "Accès refusé. Vérifiez les permissions.",
  404: "Ressource introuvable. Vérifiez l'URL.",
  500: "Erreur serveur. Réessayez plus tard.",
  502: "Erreur de passerelle. Serveur indisponible.",
  503: "Service indisponible. Réessayez plus tard.",
  504: "Délai d'attente dépassé. Vérifiez votre connexion."
};

// Handle HTTP errors based on status codes
export const handleHttpError = (url: string, status: number, statusText: string, responseTime: number) => {
  const errorMessage = errorMessages[status] || `Erreur ${status}: ${statusText}`;
  
  logError(`Erreur réseau ${status} pour ${url} - ${statusText}, responseTime: ${responseTime}ms`);
  
  // Only show toast for non-background operations to avoid spamming
  const isBackground = url.includes('?t=');
  if (!isBackground) {
    toast.error(`Erreur réseau: ${errorMessage}`);
  }
  
  return { isBackground, status };
};

// Handle fetch errors (network errors)
export const handleFetchError = (url: string, error: Error) => {
  const errorMessage = error.message;
  const errorName = error.name;
  
  logError(`Erreur réseau pour ${url} - ${errorMessage}, name: ${errorName}`);
  
  // Only show toast errors if it's not a background refresh
  const isBackground = url.includes('?t=');
  if (!isBackground) {
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      // Informatons détaillées sur l'erreur réseau
      toast.error("Erreur réseau. Vérifiez votre connexion internet et que le serveur est accessible.");
      logDebug("Informations réseau supplémentaires");
    } else {
      toast.error(`Erreur: ${errorMessage}`);
    }
  }
  
  return { error, isBackground };
};
