
import { useState } from 'react';
import { toast } from 'sonner';
import { Message, ImageProcessingStatus } from '@/types/assistant';
import { fetchLatestScreenshot } from '@/utils/screenshotUtils';
import { saveConversation as saveChatConversation, sendMessageToAI } from '@/utils/conversationUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  
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
          screenshotBase64 = await fetchLatestScreenshot(setImageProcessingStatus);
        } catch (error) {
          console.error('Erreur lors de la récupération de la capture:', error);
          // On continue sans la capture d'écran
          toast.error("Impossible d'obtenir la capture d'écran. La question sera traitée sans image.");
        }
      }
      
      try {
        // Send message to DeepSeek AI
        const responseData = await sendMessageToAI(input.trim(), screenshotBase64);
        
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
        
        // Messages d'erreur spécifiques
        let errorMessage = "Désolé, une erreur s'est produite. Veuillez réessayer votre question, si possible sans capture d'écran.";
        
        if (error instanceof Error) {
          if (error.message === "INSUFFICIENT_BALANCE") {
            errorMessage = "Désolé, le service d'IA n'est pas disponible actuellement en raison d'un problème de crédit. Veuillez contacter l'administrateur du système pour recharger le compte DeepSeek.";
            toast.error("Service IA indisponible: crédit insuffisant");
          } else if (error.message === "IMAGE_TOO_LARGE") {
            errorMessage = "La capture d'écran est trop volumineuse. Veuillez réessayer sans capture d'écran ou avec une image de taille réduite.";
            toast.error("Image trop volumineuse");
          } else {
            toast.error("Une erreur est survenue lors de la communication avec l'IA.");
          }
        }
        
        // Add an error message to the chat
        const errorAssistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorAssistantMessage]);
      }
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
    }
  };

  // Wrap the saveConversation function to provide messages
  const saveConversation = async () => {
    await saveChatConversation(messages);
  };

  // Function to clear conversation history
  const clearConversation = () => {
    if (messages.length === 0) {
      toast.info("Aucune conversation à effacer.");
      return;
    }
    
    setMessages([]);
    toast.success("Conversation effacée avec succès!");
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    clearConversation,
    imageProcessingStatus
  };
};
