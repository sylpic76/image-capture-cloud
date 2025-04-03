
import { toast } from 'sonner';
import { checkRequiredEnvironmentVars, getApiEndpoint } from './networkUtils';
import { sendRequestWithRetries } from './ai/retryMechanism';

/**
 * Send a message to the AI with retry mechanism
 */
export const sendMessageToAI = async (
  input: string,
  screenshotBase64: string | null,
  projectName: string = 'Default Project'
): Promise<{ response: string; image_processed?: boolean }> => {
  // Check environment variables
  if (!checkRequiredEnvironmentVars()) {
    return {
      response: "Erreur de configuration: Variables d'environnement manquantes. Veuillez vérifier le fichier .env."
    };
  }
  
  // Get API endpoint
  const apiEndpoint = getApiEndpoint();
  if (!apiEndpoint) {
    return {
      response: "Erreur de configuration: Impossible de construire l'URL de l'API."
    };
  }
  
  console.log(`[Assistant] Envoi vers: ${apiEndpoint}`);
  console.log(`[Assistant] Données: screenshot=${screenshotBase64 ? "oui" : "non"}, projet="${projectName}"`);
  
  // Test de connectivité
  try {
    const online = navigator.onLine;
    console.log(`[Assistant] État réseau: ${online ? "En ligne" : "Hors ligne"}`);
    if (!online) {
      toast.error("Pas de connexion Internet", {
        description: "Vérifiez votre connexion et réessayez"
      });
      return { 
        response: "Erreur: Pas de connexion Internet. Veuillez vérifier votre connectivité et réessayer."
      };
    }
  } catch (e) {
    console.log("[Assistant] Impossible de vérifier l'état du réseau:", e);
  }
  
  return await sendRequestWithRetries(apiEndpoint, input, screenshotBase64, projectName);
};
