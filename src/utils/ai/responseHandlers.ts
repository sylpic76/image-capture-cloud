
import { toast } from 'sonner';

/**
 * Handle failed API response with detailed diagnostics
 */
export const handleFailedResponse = async (
  aiResponse: Response, 
  retryCount: number, 
  maxRetries: number, 
  apiEndpoint: string
): Promise<{ retry: boolean; response?: { response: string } }> => {
  // Tentative de récupération des détails de l'erreur si disponibles
  let errorData;
  try {
    errorData = await aiResponse.json();
    console.error("[Assistant] Détails de l'erreur API:", errorData);
  } catch (jsonError) {
    const textResponse = await aiResponse.text().catch(() => null);
    console.error("[Assistant] Erreur API (non-JSON):", textResponse);
  }
  
  // Server errors (5xx) sont réessayables
  if (aiResponse.status >= 500 && retryCount < maxRetries - 1) {
    console.warn(`[Assistant] Erreur serveur ${aiResponse.status}, nouvelle tentative (${retryCount + 1}/${maxRetries - 1})`);
    return { retry: true };
  }
  
  // Erreur CORS possible
  if (aiResponse.type === 'opaque' || aiResponse.status === 0) {
    console.error("[Assistant] Possible erreur CORS ou problème réseau");
    toast.error("Erreur de communication", {
      description: "Problème de CORS ou de connexion à la fonction Edge",
      duration: 7000
    });
    return { 
      retry: false,
      response: { 
        response: `Erreur réseau: Problème de CORS ou de connexion. Vérifiez que la fonction Edge "anthropic-ai" est correctement déployée et configurée avec les en-têtes CORS appropriés.` 
      }
    };
  }
  
  // Messages d'erreur personnalisés selon le code HTTP
  const statusMessages: Record<number, string> = {
    401: "Erreur d'authentification. Vérifiez votre clé d'API Supabase.",
    403: "Accès refusé. Vérifiez les permissions de la fonction Edge.",
    404: "Fonction Edge non trouvée. Vérifiez que 'anthropic-ai' est correctement déployée."
  };
  
  const errorMsg = statusMessages[aiResponse.status] || 
                  (errorData?.error || errorData?.response || 
                  `Statut HTTP ${aiResponse.status}`);
                  
  toast.error(`Erreur API: ${errorMsg}`, {
    description: `Endpoint: ${apiEndpoint.split('/').slice(-2).join('/')}`,
    duration: 7000
  });
  
  // Retourner le message d'erreur
  return { 
    retry: false,
    response: { 
      response: `Erreur: ${errorMsg}. Vérifiez la console pour plus de détails.` 
    }
  };
};

/**
 * Parse AI response with better error handling
 */
export const parseAiResponse = async (
  aiResponse: Response
): Promise<{ response: string; image_processed?: boolean }> => {
  try {
    const responseData = await aiResponse.json();
    console.log("[Assistant] Structure de la réponse:", Object.keys(responseData).join(', '));
    if (!responseData.response && !responseData.generatedText) {
      console.error("[Assistant] Format de réponse inattendu:", responseData);
      toast.error("Format de réponse inattendu", {
        description: "L'API a renvoyé une réponse dans un format non reconnu"
      });
      return { 
        response: "Erreur: Format de réponse inattendu de l'API. Veuillez vérifier les journaux."
      };
    }
    
    // Compatibilité avec différents formats de réponse
    return {
      response: responseData.response || responseData.generatedText || "Réponse vide",
      image_processed: !!responseData.image_processed
    };
  } catch (jsonError) {
    console.error("[Assistant] Échec d'analyse de la réponse JSON:", jsonError);
    toast.error("Erreur de format de réponse", {
      description: "La réponse n'est pas au format JSON attendu"
    });
    try {
      // Tenter de lire le corps de la réponse comme texte
      const textResponse = await aiResponse.text();
      console.error("[Assistant] Réponse brute non-JSON:", textResponse);
    } catch (e) {
      console.error("[Assistant] Impossible de lire le corps de la réponse");
    }
    return { response: `Erreur: La réponse du serveur n'est pas au format JSON attendu.` };
  }
};

/**
 * Log network error details
 */
export const logNetworkError = (error: TypeError): void => {
  console.error("[Assistant] Détails de l'erreur réseau:", {
    navigator: {
      onLine: navigator.onLine,
      userAgent: navigator.userAgent,
    },
    connection: {
      effectiveType: (navigator as any).connection?.effectiveType,
      downlink: (navigator as any).connection?.downlink,
      rtt: (navigator as any).connection?.rtt,
      saveData: (navigator as any).connection?.saveData
    },
    error: error.toString(),
    stack: error.stack
  });
};
