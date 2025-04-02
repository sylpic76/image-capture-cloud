
import { createLogger } from './logger';
import { toast } from 'sonner';

const { logError } = createLogger();

export const setupNetworkMonitor = (): () => void => {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args);
      return response;
    } catch (error) {
      if (args[0] && String(args[0]).includes('capture-screenshot')) {
        logError("Fetch error in screen capture", error);
        toast.error("Erreur réseau lors de la capture d'écran. Vérifiez votre connexion.");
      }
      throw error;
    }
  };
  
  return () => {
    window.fetch = originalFetch;
  };
};
