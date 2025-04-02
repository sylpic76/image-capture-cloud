
import { createLogger } from './logger';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

const { logError, logDebug } = createLogger();

// Fonction améliorée pour surveiller le réseau
export const setupNetworkMonitor = (): () => void => {
  logDebug("Initialisation du moniteur réseau");
  
  // Réponses courantes d'erreur et leur signification
  const errorMessages: Record<number, string> = {
    400: "Requête incorrecte. Vérifiez les paramètres.",
    401: "Session expirée ou non autorisée. Veuillez vous reconnecter.",
    403: "Accès refusé. Vérifiez les permissions.",
    404: "Ressource introuvable. Vérifiez l'URL.",
    500: "Erreur serveur. Réessayez plus tard.",
    502: "Erreur de passerelle. Serveur indisponible.",
    503: "Service indisponible. Réessayez plus tard.",
    504: "Délai d'attente dépassé. Vérifiez votre connexion."
  };

  // Store a reference to handle for refreshing tokens
  let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Helper function to try refreshing the session token
  const tryRefreshToken = async () => {
    try {
      logDebug("Tentative de rafraîchissement du token...");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logError("Échec du rafraîchissement du token", error);
      } else if (data?.session) {
        logDebug("Token rafraîchi avec succès");
        return true;
      }
    } catch (err) {
      logError("Erreur lors du rafraîchissement du token", err);
    }
    return false;
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
        
        // Only show toast for non-background operations to avoid spamming
        const isBackground = url.includes('?t=');
        if (!isBackground) {
          toast.error(`Erreur réseau: ${errorMessage}`);
          
          // If we get a 401 unauthorized, try to refresh the token
          if (status === 401 && !refreshTimeoutId) {
            refreshTimeoutId = setTimeout(async () => {
              const success = await tryRefreshToken();
              if (success) {
                toast.success("Authentification renouvelée");
              }
              refreshTimeoutId = null;
            }, 1000); // Small delay to avoid multiple refreshes
          }
        }
      }
      
      return response;
    } catch (error) {
      if (isScreenshotEndpoint) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Erreur réseau pour ${url}`, error);
        
        // Only show toast errors if it's not a background refresh
        const isBackground = url.includes('?t=');
        if (!isBackground && (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError'))) {
          toast.error("Erreur réseau. Vérifiez votre connexion internet et que le serveur est accessible.");
        } else if (!isBackground) {
          toast.error(`Erreur: ${errorMessage}`);
        }
      }
      throw error;
    }
  };
  
  // Surveiller l'état de la connexion
  const handleOnline = () => {
    logDebug("🌐 Connexion internet rétablie");
    toast.success("Connexion internet rétablie");
  };
  
  const handleOffline = () => {
    logDebug("🌐 Connexion internet perdue");
    toast.error("Connexion internet perdue. Les captures d'écran ne seront pas envoyées.");
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
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
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    logDebug("Moniteur réseau désactivé");
  };
};
