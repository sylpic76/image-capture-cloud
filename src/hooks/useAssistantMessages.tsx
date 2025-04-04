
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ImageProcessingStatus, Message } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus } from './useNetworkStatus';
import { handleMessageSubmission } from '@/utils/messageHandlingUtils';
import { getApiEndpoint, checkRequiredEnvironmentVars } from '@/utils/networkUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  // Récupération de l'état du réseau
  const networkStatus = useNetworkStatus();
  
  // Vérification des variables d'environnement au chargement
  useEffect(() => {
    // Vérifier si les variables d'environnement critiques sont présentes
    checkRequiredEnvironmentVars();
    
    if (getApiEndpoint()) {
      console.log(`[Assistant] URL API: ${getApiEndpoint()}`);
    }
  }, []);

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
    loadConversation,
    clearConversation
  } = useConversationState();

  // Enhanced version to also handle the project name
  const handleLoadConversation = (loadedMessages: Message[], projectName?: string) => {
    loadConversation(loadedMessages);
    
    // If a project name is provided, update it
    if (projectName) {
      setCurrentProject(projectName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    const currentInput = input;
    setInput('');
    
    await handleMessageSubmission({
      input: currentInput,
      currentProject,
      addUserMessage,
      addAssistantMessage,
      addErrorMessage,
      setIsLoading,
      setImageProcessingStatus,
      networkStatus,
      useScreenshots
    });
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSubmit,
    saveConversation,
    loadConversation: handleLoadConversation,
    clearConversation,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    networkStatus
  };
};
