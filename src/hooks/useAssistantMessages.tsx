
import { useState } from 'react';
import { toast } from 'sonner';
import { Message } from '@/components/AssistantIA/ChatMessage';
import { supabase } from "@/integrations/supabase/client";

export const useAssistantMessages = (useScreenshots: boolean = true) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  
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
          const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          });

          if (response.ok) {
            const blob = await response.blob();
            
            // Convert blob to base64
            screenshotBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
      
      // Send message and screenshot to DeepSeek AI
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
      const { error } = await supabase
        .from('conversations')
        .insert({
          messages: messages,
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
