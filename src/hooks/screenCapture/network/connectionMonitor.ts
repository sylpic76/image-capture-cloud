
import { createLogger } from '../logger';
import { toast } from 'sonner';

const { logDebug, logError } = createLogger();

// Setup online/offline event listeners
export const setupConnectionMonitor = (): () => void => {
  // Handle online event
  const handleOnline = () => {
    logDebug("🌐 Connexion internet rétablie");
    toast.success("Connexion internet rétablie");
  };
  
  // Handle offline event
  const handleOffline = () => {
    logDebug("🌐 Connexion internet perdue");
    toast.error("Connexion internet perdue. Les requêtes ne peuvent pas être envoyées.");
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    logDebug("Moniteur de connexion désactivé");
  };
};
