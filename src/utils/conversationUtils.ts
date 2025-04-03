
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
  console.log("Calling AI with screenshot:", screenshotBase64 ? "Yes (base64 data available)" : "None");
  console.log("Using endpoint:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`);
  
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount + 1}/${maxRetries}`);
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
      
      console.log("Request headers:", Object.fromEntries(
        Object.entries(requestInit.headers as Record<string, string>)
          .filter(([key]) => !['Authorization', 'apikey'].includes(key)) // Masquer les clés sensibles
      ));
      
      console.log("Request payload size:", 
        Math.round((requestInit.body as string).length / 1024), 
        "KB (message:", input.trim().length, "chars",
        screenshotBase64 ? ", screenshot: ~" + Math.round(screenshotBase64.length / 1024) + "KB)" : ", no screenshot)");
      
      // Mesurer le temps de la requête
      const startTime = performance.now();
      
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`, requestInit);
      
      const endTime = performance.now();
      console.log(`AI response received in ${Math.round(endTime - startTime)}ms with status: ${aiResponse.status}`);
      
      if (!aiResponse.ok) {
        // Tentative de récupération des détails de l'erreur si disponibles
        let errorData;
        try {
          errorData = await aiResponse.json();
          console.error("AI Response error details:", errorData);
        } catch (jsonError) {
          console.error("AI Response error (could not parse JSON):", await aiResponse.text().catch(() => null));
        }
        
        // Server errors (5xx) sont réessayables
        if (aiResponse.status >= 500 && retryCount < maxRetries - 1) {
          console.warn(`Server error ${aiResponse.status}, will retry (${retryCount + 1}/${maxRetries - 1})`);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Backoff exponentiel
          continue;
        }
        
        // Erreur CORS possible
        if (aiResponse.type === 'opaque' || aiResponse.status === 0) {
          console.error("Possible CORS error or network issue");
          return { 
            response: `Erreur réseau: Problème possible de CORS ou de connexion. Vérifiez le réseau et la configuration de l'API.` 
          };
        }
        
        // Erreurs spécifiques
        if (aiResponse.status === 413) {
          return { 
            response: `Erreur: Requête trop volumineuse. La capture d'écran est peut-être trop grande.` 
          };
        } else if (aiResponse.status === 429) {
          return { 
            response: `Erreur: Limite de requêtes dépassée. Veuillez réessayer dans quelques minutes.` 
          };
        }
        
        // Retourner le message d'erreur
        return { 
          response: `Erreur: ${errorData?.error || errorData?.response || JSON.stringify(errorData) || `Statut HTTP ${aiResponse.status}`}` 
        };
      }
      
      // Analyser la réponse JSON
      try {
        const responseData = await aiResponse.json();
        console.log("AI response structure:", Object.keys(responseData).join(', '));
        return responseData;
      } catch (jsonError) {
        console.error("Failed to parse AI response as JSON:", jsonError);
        return { response: `Erreur: La réponse du serveur n'est pas au format JSON attendu.` };
      }
      
    } catch (error) {
      console.error("Error sending message to AI:", error);
      
      // Détailler l'erreur réseau
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error("Network error details:", {
          navigator: {
            onLine: navigator.onLine,
            userAgent: navigator.userAgent,
          },
          error: error.toString(),
          stack: error.stack
        });
      }
      
      // Network errors should be retried
      if (error instanceof TypeError && error.message.includes('Failed to fetch') && retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      // Return the error message
      return { 
        response: `Erreur de connexion: ${error.message}. Vérifiez votre connexion internet et réessayez.` 
      };
    }
  }
  
  // If we've exhausted all retries
  return { 
    response: `Erreur: Impossible de contacter le serveur après ${maxRetries} tentatives. Vérifiez votre connexion et réessayez plus tard.` 
  };
};
