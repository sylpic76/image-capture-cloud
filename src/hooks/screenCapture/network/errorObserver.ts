
import { createLogger } from '../logger';

const { logError, logDebug } = createLogger();

// Setup global error handler
export const setupErrorObserver = (): () => void => {
  const originalOnError = window.onerror;
  
  // Intercept unhandled errors
  window.onerror = (message, source, line, column, error) => {
    if (source && (source.includes('anthropic-ai') || source.includes('capture-screenshot') || source.includes('screenCapture'))) {
      logError(`Erreur non gérée: ${message}`, { source, line, column, error });
    }
    return originalOnError ? originalOnError(message, source, line, column, error) : false;
  };
  
  // Return cleanup function
  return () => {
    window.onerror = originalOnError;
    logDebug("Observateur d'erreurs désactivé");
  };
};
