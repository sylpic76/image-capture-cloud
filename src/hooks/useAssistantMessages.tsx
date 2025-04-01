
import { useState } from 'react';
import { toast } from 'sonner';
import { Message } from '@/components/AssistantIA/ChatMessage';
import { supabase } from "@/integrations/supabase/client";
import { Json } from '@/integrations/supabase/types';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [imageProcessingStatus, setImageProcessingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  // Function to convert Message objects to JSON-compatible format
  const convertMessagesToJson = (messages: Message[]): Json => {
    return messages.map(message => ({
      ...message,
      timestamp: message.timestamp.toISOString() // Convert Date to ISO string
    })) as Json;
  };

  // Function to optimize and process a screenshot blob
  const processScreenshot = async (blob: Blob): Promise<string | null> => {
    try {
      console.log("Starting screenshot processing");
      
      // Create an image element to load the blob
      const img = document.createElement('img');
      
      // Convert blob to data URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = blobUrl;
      });
      
      console.log(`Original image dimensions: ${img.width}x${img.height}`);
      
      // Calculate new dimensions (max 1200px width/height)
      const MAX_DIMENSION = 1200;
      let newWidth = img.width;
      let newHeight = img.height;
      
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        if (img.width >= img.height) {
          newWidth = MAX_DIMENSION;
          newHeight = Math.round(img.height * (MAX_DIMENSION / img.width));
        } else {
          newHeight = MAX_DIMENSION;
          newWidth = Math.round(img.width * (MAX_DIMENSION / img.height));
        }
      }
      
      console.log(`Resizing to: ${newWidth}x${newHeight}`);
      
      // Create a canvas to resize the image
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw the image on the canvas with new dimensions
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Failed to get canvas context");
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to base64 with reduced quality
      const base64Data = canvas.toDataURL('image/jpeg', 0.8);
      
      // Log base64 preview and size
      console.log(`Base64 preview: ${base64Data.substring(0, 50)}...`);
      console.log(`Base64 format check: ${base64Data.startsWith('data:image/')}`);
      
      // Calculate size in MB
      const base64Size = Math.ceil((base64Data.length * 0.75) / (1024 * 1024));
      console.log(`Base64 size: ~${base64Size} MB`);
      
      // Clean up
      URL.revokeObjectURL(blobUrl);
      
      setImageProcessingStatus('success');
      return base64Data;
    } catch (error) {
      console.error('Error processing screenshot:', error);
      setImageProcessingStatus('error');
      toast.error("Erreur lors du traitement de la capture d'écran");
      return null;
    }
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
    setImageProcessingStatus('idle');

    try {
      // Get the latest screenshot if enabled
      let screenshotBase64 = null;
      
      if (useScreenshots) {
        try {
          console.log("Attempting to fetch latest screenshot...");
          setImageProcessingStatus('processing');
          
          const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
          });

          if (response.ok) {
            console.log("Screenshot fetched successfully");
            const blob = await response.blob();
            
            // Process and optimize the screenshot
            screenshotBase64 = await processScreenshot(blob);
            
            if (screenshotBase64) {
              console.log("Screenshot processed successfully");
            } else {
              console.log("Screenshot processing failed");
              toast.warning("Impossible de traiter la capture d'écran, envoi du message sans image.");
            }
          } else {
            console.error("Failed to fetch screenshot:", response.status, response.statusText);
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('Erreur lors du traitement de l\'image:', error);
          toast.error("Erreur lors de la récupération de la capture d'écran");
          screenshotBase64 = null;
          setImageProcessingStatus('error');
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
          screenshot: screenshotBase64,
        }),
      });
      
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => null);
        console.error("AI Response error:", aiResponse.status, errorData);
        
        if (aiResponse.status === 413 || aiResponse.status === 422) {
          // Specific handling for payload too large or validation errors
          toast.error("L'image est trop volumineuse. Réessayez sans capture d'écran.");
        } else {
          throw new Error(`Erreur lors de la communication avec l'IA: ${aiResponse.status}`);
        }
      }
      
      const responseData = await aiResponse.json();
      
      // Add feedback if image was processed
      let responseMessage = responseData.response || "Désolé, je n'ai pas pu traiter votre demande.";
      if (screenshotBase64 && responseData.image_processed) {
        responseMessage = `📷 _J'ai reçu votre capture d'écran, mais je ne peux pas l'analyser actuellement._ \n\n${responseMessage}`;
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Une erreur est survenue lors de la communication avec l'IA.");
      
      // Add an error message to the chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer votre question, si possible sans capture d'écran.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
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
    saveConversation,
    imageProcessingStatus
  };
};
