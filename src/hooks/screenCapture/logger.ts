
// Logger spécialisé pour le hook useScreenCapture
export const createLogger = () => {
  const logDebug = (message: string) => {
    console.log(`[useScreenCapture] ${message}`);
  };

  // Accepte un seul argument (message d'erreur combiné)
  const logError = (message: string): Error => {
    console.error(`[useScreenCapture ERROR] ${message}`);
    return new Error(message);
  };
  
  return {
    logDebug,
    logError
  };
};
