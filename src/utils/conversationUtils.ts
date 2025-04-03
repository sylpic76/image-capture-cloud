
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
 * Send a message to the Google Gemini API with retry mechanism
 */
export const sendMessageToAI = async (
  input: string,
  screenshotBase64: string | null,
  projectName: string = 'Default Project'
): Promise<{ response: string; image_processed?: boolean }> => {
  console.log("Calling Gemini with screenshot:", screenshotBase64 ? "Yes (base64 data available)" : "None");
  console.log("Using endpoint:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`);
  
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount + 1}/${maxRetries}`);
      }
      
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`, {
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
      });
      
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => null);
        console.error("AI Response error:", aiResponse.status, errorData);
        
        // Server errors (5xx) are retriable
        if (aiResponse.status >= 500 && retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          continue;
        }
        
        // Return the error message
        return { 
          response: `Erreur: ${errorData?.error || errorData?.response || JSON.stringify(errorData) || `Statut HTTP ${aiResponse.status}`}` 
        };
      }
      
      const responseData = await aiResponse.json();
      return responseData;
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      
      // Network errors should be retried
      if (error.message.includes('Failed to fetch') && retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      // Return the error message
      return { response: `Erreur de connexion: ${error.message}. Vérifiez votre connexion internet et réessayez.` };
    }
  }
  
  // If we've exhausted all retries
  return { response: `Erreur: Impossible de contacter le serveur après ${maxRetries} tentatives. Vérifiez votre connexion et réessayez plus tard.` };
};
