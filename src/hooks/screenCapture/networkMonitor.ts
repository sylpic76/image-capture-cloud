
import { createLogger } from './logger';
import { toast } from 'sonner';

const { logError, logDebug } = createLogger();

// Fonction améliorée pour surveiller le réseau
export const setupNetworkMonitor = (): () => void => {
  logDebug("Initialisation du moniteur réseau");
  
  // Réponses courantes d'erreur et leur signification
  const errorMessages: Record<number, string> = {
    400: "Requête incorrecte. Vérifiez les paramètres.",
    401: "Non autorisé. Vérifiez vos identifiants.",
    403: "Accès refusé. Vérifiez les permissions.",
    404: "Ressource introuvable. Vérifiez l'URL.",
    500: "Erreur serveur. Réessayez plus tard.",
    502: "Erreur de passerelle. Serveur indisponible.",
    503: "Service indisponible. Réessayez plus tard.",
    504: "Délai d'attente dépassé. Vérifiez votre connexion."
  };

  // Intercepter les requêtes fetch pour mieux gérer les erreurs
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = args[0] ? String(args[0]) : '';
    const isScreenshotEndpoint = url.includes('capture-screenshot') || url.includes('latest');
    
    if (isScreenshotEndpoint) {
      logDebug(`Requête réseau interceptée vers: ${url}`);
    }
    
    try {
      const response = await originalFetch(...args);
      
      if (isScreenshotEndpoint && !response.ok) {
        const status = response.status;
        const errorMessage = errorMessages[status] || `Erreur ${status}: ${response.statusText}`;
        
        logError(`Erreur réseau ${status} pour ${url}`, { status, statusText: response.statusText });
        toast.error(`Erreur réseau: ${errorMessage}`);
      }
      
      return response;
    } catch (error) {
      if (isScreenshotEndpoint) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Erreur réseau pour ${url}`, error);
        
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          toast.error("Erreur réseau. Vérifiez votre connexion internet et que le serveur est accessible.");
        } else {
          toast.error(`Erreur: ${errorMessage}`);
        }
      }
      throw error;
    }
  };
  
  // Surveiller les erreurs non gérées
  const originalOnError = window.onerror;
  window.onerror = (message, source, line, column, error) => {
    if (source && (source.includes('capture-screenshot') || source.includes('screenCapture'))) {
      logError(`Erreur non gérée: ${message}`, { source, line, column, error });
    }
    return originalOnError ? originalOnError(message, source, line, column, error) : false;
  };

  // Fonction pour restaurer les comportements originaux
  return () => {
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    logDebug("Moniteur réseau désactivé");
  };
};
