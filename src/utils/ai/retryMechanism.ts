
import { toast } from 'sonner';
import { createRequestInit, logSafeRequestDetails } from './requestBuilder';
import { handleFailedResponse, parseAiResponse, logNetworkError } from './responseHandlers';

/**
 * Send request to AI API with retry mechanism
 */
export const sendRequestWithRetries = async (
  apiEndpoint: string,
  input: string,
  screenshotBase64: string | null,
  projectName: string
): Promise<{ response: string; image_processed?: boolean }> => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`[Assistant] Tentative ${retryCount + 1}/${maxRetries}`);
        toast.info(`Nouvelle tentative de connexion (${retryCount + 1}/${maxRetries})...`);
        // Attente exponentielle entre les tentatives
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)));
      }
      
      // Création de l'objet Request
      const requestInit = createRequestInit(input, screenshotBase64, projectName);
      
      // Masquer les informations sensibles dans les logs
      logSafeRequestDetails(requestInit, input, screenshotBase64);
      
      // Mesurer le temps de la requête
      const startTime = performance.now();
      
      // Exécution de la requête avec un timeout
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout de la requête après 30 secondes")), 30000);
      });
      
      const fetchPromise = fetch(apiEndpoint, requestInit);
      const aiResponse = await Promise.race([fetchPromise, timeoutPromise]);
      
      const endTime = performance.now();
      console.log(`[Assistant] Réponse reçue en ${Math.round(endTime - startTime)}ms avec statut: ${aiResponse.status}`);
      
      if (!aiResponse.ok) {
        const result = await handleFailedResponse(aiResponse, retryCount, maxRetries, apiEndpoint);
        if (result.retry) {
          retryCount++;
          continue;
        }
        return result.response;
      }
      
      return await parseAiResponse(aiResponse);
      
    } catch (error) {
      console.error("[Assistant] Erreur lors de l'envoi du message:", error);
      
      // Détailler l'erreur réseau
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        logNetworkError(error);
        
        if (retryCount === 0) {
          toast.error("Erreur de connexion", {
            description: "Impossible de contacter la fonction Edge 'anthropic-ai'",
            duration: 7000
          });
        }
      }
      
      // Les erreurs de connexion doivent être réessayées
      if (error instanceof TypeError && 
         (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Timeout')) && 
         retryCount < maxRetries - 1) {
        retryCount++;
        continue;
      }
      
      // Retourner le message d'erreur
      return { 
        response: `Erreur de connexion: ${error.message}. Vérifiez que la fonction Edge "anthropic-ai" est correctement déployée et active.` 
      };
    }
  }
  
  // Si on a épuisé toutes les tentatives
  toast.error("Échec après plusieurs tentatives", {
    description: "Vérifiez l'état des fonctions Edge Supabase"
  });
  
  return { 
    response: `Erreur: Impossible de contacter le serveur après ${maxRetries} tentatives. Vérifiez que la fonction Edge "anthropic-ai" est active et correctement configurée.` 
  };
};
