
import { toast } from 'sonner';
import { createRequestInit, logSafeRequestDetails } from './requestBuilder';
import { handleFailedResponse, parseAiResponse, logNetworkError } from './responseHandlers';
import { testApiEndpoint } from '../networkUtils';

/**
 * Send request to AI API with enhanced retry mechanism
 */
export const sendRequestWithRetries = async (
  apiEndpoint: string,
  input: string,
  screenshotBase64: string | null,
  projectName: string
): Promise<{ response: string; image_processed?: boolean }> => {
  const maxRetries = 3;
  let retryCount = 0;
  
  // Test de connectivité à l'endpoint avant de commencer
  const endpointTest = await testApiEndpoint(apiEndpoint);
  if (!endpointTest.ok) {
    console.error(`[Assistant] L'endpoint ${apiEndpoint} n'est pas accessible:`, endpointTest.error);
    toast.error("Erreur de connexion à l'API", {
      description: `Vérifiez que la fonction Edge est déployée (${endpointTest.error})`,
      duration: 10000
    });
  } else {
    console.log(`[Assistant] Test préliminaire de l'endpoint: OK`);
  }
  
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
        
        // Détails sur l'URL utilisée pour aider au diagnostic
        console.error(`[Assistant] URL endpoint problématique: ${apiEndpoint}`);
        console.error(`[Assistant] URL de base Supabase: ${import.meta.env.VITE_SUPABASE_URL}`);
        console.error(`[Assistant] Nom de fonction: anthropic-ai`);
        
        if (retryCount === 0) {
          toast.error("Erreur de connexion", {
            description: "Impossible de contacter la fonction Edge 'anthropic-ai'",
            duration: 10000
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
      
      // Retourner le message d'erreur avec des instructions plus précises
      return { 
        response: `Erreur de connexion: ${error.message}. Vérifiez que la fonction Edge "anthropic-ai" est correctement déployée et active. Si l'erreur persiste, vérifiez les logs de la fonction dans la console Supabase.` 
      };
    }
  }
  
  // Si on a épuisé toutes les tentatives
  toast.error("Échec après plusieurs tentatives", {
    description: "Vérifiez l'état des fonctions Edge Supabase et les logs du navigateur"
  });
  
  return { 
    response: `Erreur: Impossible de contacter le serveur après ${maxRetries} tentatives. Vérifiez que la fonction Edge "anthropic-ai" est active et correctement configurée dans votre projet Supabase.` 
  };
};
