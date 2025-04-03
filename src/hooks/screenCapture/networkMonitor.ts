
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
    const isAssistantEndpoint = url.includes('anthropic-ai');
    const isScreenshotEndpoint = url.includes('capture-screenshot') || url.includes('latest');
    
    if (isAssistantEndpoint || isScreenshotEndpoint) {
      logDebug(`Requête réseau interceptée vers: ${url}`);
      
      // Log détaillé de la requête
      if (isAssistantEndpoint) {
        const requestInit = args[1] as RequestInit;
        const method = requestInit?.method || 'GET';
        
        // Créer une copie des en-têtes sans les informations sensibles
        const headers = requestInit?.headers ? 
          Object.fromEntries(
            Object.entries(requestInit.headers as Record<string, string>)
              .filter(([key]) => !['Authorization', 'apikey'].includes(key))
          ) : {};
        
        logDebug(`Détails requête assistant: ${method} ${url}`, { 
          headers,
          bodySize: requestInit?.body ? String(requestInit.body).length : 0,
          cache: requestInit?.cache || 'default'
        });
      }
    }
    
    try {
      const startTime = performance.now();
      const response = await originalFetch(...args);
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      if ((isAssistantEndpoint || isScreenshotEndpoint) && responseTime > 500) {
        logDebug(`Requête lente (${responseTime}ms): ${url}`);
      }
      
      if ((isAssistantEndpoint || isScreenshotEndpoint) && !response.ok) {
        const status = response.status;
        const errorMessage = errorMessages[status] || `Erreur ${status}: ${response.statusText}`;
        
        logError(`Erreur réseau ${status} pour ${url}`, { 
          status, 
          statusText: response.statusText,
          responseTime
        });
        
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
      if (isAssistantEndpoint || isScreenshotEndpoint) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'Unknown';
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logError(`Erreur réseau pour ${url}`, { 
          error: errorMessage,
          name: errorName,
          stack: errorStack,
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          timeOrigin: performance.timeOrigin
        });
        
        // Only show toast errors if it's not a background refresh
        const isBackground = url.includes('?t=');
        if (!isBackground) {
          if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            // Informatons détaillées sur l'erreur réseau
            toast.error("Erreur réseau. Vérifiez votre connexion internet et que le serveur est accessible.");
            logDebug("Informations réseau supplémentaires", {
              downlink: (navigator as any).connection?.downlink,
              effectiveType: (navigator as any).connection?.effectiveType,
              rtt: (navigator as any).connection?.rtt,
              saveData: (navigator as any).connection?.saveData,
            });
          } else {
            toast.error(`Erreur: ${errorMessage}`);
          }
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
    toast.error("Connexion internet perdue. Les requêtes ne peuvent pas être envoyées.");
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Surveiller les erreurs non gérées
  const originalOnError = window.onerror;
  window.onerror = (message, source, line, column, error) => {
    if (source && (source.includes('anthropic-ai') || source.includes('capture-screenshot') || source.includes('screenCapture'))) {
      logError(`Erreur non gérée: ${message}`, { source, line, column, error });
    }
    return originalOnError ? originalOnError(message, source, line, column, error) : false;
  };

  // Performance monitoring for server requests
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.initiatorType === 'fetch' && 
          (entry.name.includes('anthropic-ai') || entry.name.includes('capture-screenshot'))) {
        const duration = entry.duration;
        if (duration > 3000) { // Si plus de 3 secondes
          logDebug(`⚠️ Performance lente détectée: ${entry.name} (${Math.round(duration)}ms)`);
        }
      }
    }
  });
  
  try {
    observer.observe({ type: 'resource', buffered: true });
  } catch (e) {
    logDebug("PerformanceObserver non supporté");
  }

  // Fonction pour restaurer les comportements originaux
  return () => {
    window.fetch = originalFetch;
    window.onerror = originalOnError;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    try {
      observer.disconnect();
    } catch (e) {
      // Ignorer les erreurs lors de la déconnexion
    }
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    logDebug("Moniteur réseau désactivé");
  };
};
