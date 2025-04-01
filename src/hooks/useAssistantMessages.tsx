
import { useState } from 'react';
import { toast } from 'sonner';
import { Message } from '@/components/AssistantIA/ChatMessage';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';

export const useAssistantMessages = (useScreenshots: boolean = true) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  
  // Function to convert Message objects to JSON-compatible format
  const convertMessagesToJson = (messages: Message[]): Json => {
    return messages.map(message => ({
      ...message,
      timestamp: message.timestamp.toISOString() // Convert Date to ISO string
    })) as Json;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get the latest screenshot if enabled
      let screenshotBase64 = null;
      
      if (useScreenshots) {
        try {
          console.log("Attempting to fetch latest screenshot...");
          const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          });

          if (response.ok) {
            console.log("Screenshot fetched successfully, converting to base64...");
            const blob = await response.blob();
            
            // Convert blob to base64
            screenshotBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            
            console.log("Screenshot obtained and converted to base64");
            
            // Limit the size of the screenshot data to avoid API limits
            if (screenshotBase64 && screenshotBase64.length > 1000000) {
              console.log("Screenshot too large, disabling for this request");
              screenshotBase64 = null;
              toast.warning("Capture d'écran trop volumineuse, elle ne sera pas utilisée pour cette requête.");
            }
          } else {
            console.error("Failed to fetch screenshot:", response.status, response.statusText);
          }
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
          screenshotBase64 = null;
        }
      }
      
      // Send message and screenshot to DeepSeek AI
      console.log("Calling DeepSeek AI with screenshot:", screenshotBase64 ? "Yes (base64 data available)" : "None");
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          screenshot: screenshotBase64, // May be null if disabled or error occurred
        }),
      });
      
      if (!aiResponse.ok) {
        throw new Error(`Erreur lors de la communication avec l'IA: ${aiResponse.status}`);
      }
      
      const responseData = await aiResponse.json();
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseData.response || "Désolé, je n'ai pas pu traiter votre demande.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Une erreur est survenue lors de la communication avec l'IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async () => {
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

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation
  };
};
