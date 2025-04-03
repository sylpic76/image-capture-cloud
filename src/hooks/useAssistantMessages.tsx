
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { convertMessagesToJson, ImageProcessingStatus, Message } from '@/types/assistant';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  
  // Nouveau state pour le nom du projet
  const [currentProject, setCurrentProject] = useState('Default Project');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to the chat
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    
    // Update messages state with the new user message
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let screenshotData = null;
      
      // Only fetch screenshot if enabled
      if (useScreenshots) {
        setImageProcessingStatus('processing');
        
        try {
          // Attempt to get the latest screenshot
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/latest`, {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          });

          if (!response.ok) {
            throw new Error(`Error fetching screenshot: ${response.status}`);
          }

          const blob = await response.blob();
          screenshotData = await blobToBase64(blob);
          setImageProcessingStatus('success');
        } catch (error) {
          console.error('Error processing screenshot:', error);
          setImageProcessingStatus('error');
          toast.error('Erreur lors du traitement de la capture d\'écran');
        }
      }

      // Call the AI function with the message and optional screenshot
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          screenshot: screenshotData,
          projectName: currentProject // Envoyer le nom du projet
        }),
      });
      
      if (!aiResponse.ok) {
        throw new Error(`AI service responded with ${aiResponse.status}`);
      }
      
      const data = await aiResponse.json();
      
      // Add assistant response to the messages
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response || 'Je n\'ai pas pu générer de réponse. Veuillez réessayer.',
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, assistantMessage]);
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `Erreur: ${error.message || 'Une erreur est survenue'}. Veuillez réessayer.`,
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      toast.error('Erreur lors de la communication avec l\'assistant');
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
    }
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Could not convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const saveConversation = async () => {
    try {
      if (messages.length === 0) return;
      
      // Log this operation to check if it's being called
      console.log('Saving conversation to Supabase:', messages);
      
      const { error } = await supabase.from('conversations').insert({
        messages: convertMessagesToJson(messages)
      });
      
      if (error) throw error;
      
      toast.success('Conversation sauvegardée avec succès');
    } catch (error) {
      console.error('Error saving conversation:', error);
      toast.error('Erreur lors de la sauvegarde de la conversation');
    }
  };
  
  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation effacée');
  };
  
  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    clearConversation,
    imageProcessingStatus,
    currentProject,    // Exposer le projet courant
    setCurrentProject  // Permet de modifier le projet courant
  };
};
