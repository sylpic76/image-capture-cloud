
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { Message, convertMessagesToJson } from '@/types/assistant';

/**
 * Save the current conversation to Supabase
 */
export const saveConversation = async (messages: Message[], projectName: string = 'Default Project'): Promise<void> => {
  if (messages.length === 0) {
    toast.info("Aucune conversation à sauvegarder.");
    return;
  }
  
  try {
    console.log("Attempting to save conversation to Supabase:", messages.length, "messages");
    
    // Use the conversion function to make messages JSON-compatible
    const { error } = await supabase
      .from('conversations')
      .insert({
        messages: convertMessagesToJson(messages),
        project_name: projectName
      });

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }
    toast.success("Conversation sauvegardée avec succès!");
    console.log("Conversation saved successfully to Supabase");
  } catch (error) {
    console.error('Erreur de sauvegarde complète:', error);
    toast.error("Impossible de sauvegarder la conversation.");
  }
};

/**
 * Send a message to the AI with retry mechanism
 */
export const sendMessageToAI = async (
  input: string,
  screenshotBase64: string | null,
  projectName: string = 'Default Project'
): Promise<{ response: string; image_processed?: boolean }> => {
  // Vérifiez que les variables d'environnement sont définies
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.error("Variables d'environnement manquantes:");
    console.error(`VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? "OK" : "MANQUANTE"}`);
    console.error(`VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? "OK" : "MANQUANTE"}`);
    
    toast.error("Configuration incomplète", {
      description: "Vérifiez les variables d'environnement dans votre fichier .env",
      duration: 7000
    });
    
    return {
      response: "Erreur de configuration: Variables d'environnement manquantes. Veuillez vérifier le fichier .env."
    };
  }
  
  // Construire l'URL de l'API
  const apiEndpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`;
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
      
      // Création de l'objet Request pour plus de détails dans les logs
      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({
          message: input.trim(),
          screenshot: screenshotBase64,
          projectName: projectName
        }),
        cache: 'no-store'
      };
      
      // Masquer les informations sensibles dans les logs
      const safeHeadersLog = { ...requestInit.headers };
      delete (safeHeadersLog as any).Authorization;
      delete (safeHeadersLog as any).apikey;
      
      console.log("[Assistant] En-têtes de requête:", safeHeadersLog);
      console.log("[Assistant] Taille du payload:", 
        Math.round((requestInit.body as string).length / 1024), 
        "KB (message:", input.trim().length, "caractères",
        screenshotBase64 ? ", screenshot: ~" + Math.round(screenshotBase64.length / 1024) + "KB)" : ", pas de screenshot)");
      
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
          retryCount++;
          continue;
        }
        
        // Erreur CORS possible
        if (aiResponse.type === 'opaque' || aiResponse.status === 0) {
          console.error("[Assistant] Possible erreur CORS ou problème réseau");
          toast.error("Erreur de communication", {
            description: "Problème de CORS ou de connexion à la fonction Edge",
            duration: 7000
          });
          return { 
            response: `Erreur réseau: Problème de CORS ou de connexion. Vérifiez que la fonction Edge "anthropic-ai" est correctement déployée et configurée.` 
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
          response: `Erreur: ${errorMsg}. Vérifiez la console pour plus de détails.` 
        };
      }
      
      // Analyser la réponse JSON
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
        return { response: `Erreur: La réponse du serveur n'est pas au format JSON attendu.` };
      }
      
    } catch (error) {
      console.error("[Assistant] Erreur lors de l'envoi du message:", error);
      
      // Détailler l'erreur réseau
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error("[Assistant] Détails de l'erreur réseau:", {
          navigator: {
            onLine: navigator.onLine,
            userAgent: navigator.userAgent,
          },
          error: error.toString(),
          stack: error.stack
        });
        
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
