
import { useState } from 'react';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus, NetworkStatus } from './useNetworkStatus';
import { toast } from 'sonner';
import { fetchLatestScreenshot } from '@/utils/screenshotUtils';
import { sendMessageToAI } from '@/utils/conversationUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  
  // Network status monitoring
  const networkStatus = useNetworkStatus();
  
  // Conversation state management
  const {
    messages,
    input,
    setInput,
    currentProject,
    setCurrentProject,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    saveConversation,
    clearConversation
  } = useConversationState();
  
  /**
   * Handle form submission to send a message to the assistant
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Pre-check network connectivity
    if (networkStatus !== 'online') {
      toast.error("Connexion instable ou hors-ligne. Impossible de communiquer avec l'assistant.");
      return;
    }
    
    // Add user message to chat
    addUserMessage(input);
    setInput('');
    setIsLoading(true);

    try {
      let screenshotData = null;
      
      // Only fetch screenshot if enabled
      if (useScreenshots) {
        setImageProcessingStatus('processing');
        
        try {
          // Use the utility to get the latest screenshot
          screenshotData = await fetchLatestScreenshot(setImageProcessingStatus);
          
          if (screenshotData) {
            setImageProcessingStatus('success');
          } else {
            console.warn("Screenshot fetched but returned null or empty");
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
          setImageProcessingStatus('error');
          toast.error('Erreur lors du traitement de la capture d\'écran. L\'assistant continuera sans image.');
        }
      }

      // Send message to AI service
      const aiResponseData = await sendMessageToAI(input, screenshotData, currentProject);
      
      // Add assistant response to the messages
      addAssistantMessage(aiResponseData.response);
      
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      
      // Add error message
      addErrorMessage(error);
      
      // Create network message string separately
      let networkMessage = '';
      
      // Vérification corrigée pour éviter l'erreur de typage
      if (networkStatus === 'offline') {
        networkMessage = 'Vérifiez votre connexion internet.';
      }
      
      toast.error(`Erreur de communication avec l'assistant. ${networkMessage}`);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
    }
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
    currentProject,
    setCurrentProject,
    networkStatus
  };
};
