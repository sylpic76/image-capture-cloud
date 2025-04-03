
import { toast } from 'sonner';
import { checkRequiredEnvironmentVars, getApiEndpoint } from './networkUtils';
import { sendRequestWithRetries } from './ai/retryMechanism';
import { prepareMessageRequest } from './ai/messagePreparation';

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
  
  // Prepare and validate request
  const requestInfo = await prepareMessageRequest(input, screenshotBase64, projectName);
  if (!requestInfo.valid) {
    return { response: requestInfo.errorMessage || "Erreur de préparation de la requête." };
  }
  
  // Send request with retries
  return await sendRequestWithRetries(apiEndpoint, input, screenshotBase64, projectName);
};
