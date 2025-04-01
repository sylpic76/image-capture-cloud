
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { Message, convertMessagesToJson } from '@/types/assistant';

/**
 * Save the current conversation to Supabase
 */
export const saveConversation = async (messages: Message[]): Promise<void> => {
  if (messages.length === 0) {
    toast.info("Aucune conversation à sauvegarder.");
    return;
  }
  
  try {
    // Use the conversion function to make messages JSON-compatible
    const { error } = await supabase
      .from('conversations')
      .insert({
        messages: convertMessagesToJson(messages),
      });

    if (error) throw error;
    toast.success("Conversation sauvegardée avec succès!");
  } catch (error) {
    console.error('Erreur de sauvegarde:', error);
    toast.error("Impossible de sauvegarder la conversation.");
  }
};

/**
 * Send a message to the DeepSeek AI API
 */
export const sendMessageToAI = async (
  input: string,
  screenshotBase64: string | null
): Promise<{ response: string; image_processed?: boolean }> => {
  console.log("Calling DeepSeek AI with screenshot:", screenshotBase64 ? "Yes (base64 data available)" : "None");
  
  try {
    const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input.trim(),
        screenshot: screenshotBase64,
      }),
    });
    
    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => null);
      console.error("AI Response error:", aiResponse.status, errorData);
      
      // Traitement des erreurs spécifiques
      if (aiResponse.status === 402) {
        // Erreur de crédit insuffisant
        throw new Error("INSUFFICIENT_BALANCE");
      } else if (aiResponse.status === 413 || aiResponse.status === 422) {
        // Specific handling for payload too large or validation errors
        throw new Error("IMAGE_TOO_LARGE");
      } else {
        throw new Error(`Erreur lors de la communication avec l'IA: ${aiResponse.status}`);
      }
    }
    
    const responseData = await aiResponse.json();
    return responseData;
  } catch (error) {
    console.error("Error sending message to AI:", error);
    
    // Format d'erreur personnalisé pour mieux gérer les cas spécifiques
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_BALANCE") {
        throw new Error("INSUFFICIENT_BALANCE");
      } else if (error.message === "IMAGE_TOO_LARGE") {
        throw new Error("IMAGE_TOO_LARGE");
      }
    }
    
    // Erreur générique
    throw error;
  }
};
