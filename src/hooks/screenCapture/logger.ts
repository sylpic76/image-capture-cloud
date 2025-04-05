
// Logger spécialisé pour le hook useScreenCapture
export const createLogger = () => {
  // Fonction de débogage - affiche un message dans la console
  const logDebug = (message: string, ...args: any[]) => {
    if (args && args.length > 0) {
      console.log(`[useScreenCapture] ${message}`, ...args);
    } else {
      console.log(`[useScreenCapture] ${message}`);
    }
  };

  // Fonction d'erreur - affiche un message d'erreur dans la console
  // Accepte un seul argument (message d'erreur)
  const logError = (message: string): Error => {
    console.error(`[useScreenCapture ERROR] ${message}`);
    return new Error(message);
  };
  
  return {
    logDebug,
    logError
  };
};
