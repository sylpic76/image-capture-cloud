
import { useState } from 'react';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus } from './useNetworkStatus';
import { handleMessageSubmission } from '@/utils/messageHandlingUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  // On récupère l'état du réseau mais on ne bloque pas l'envoi des messages
  const networkStatus = useNetworkStatus();

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
    clearConversation,
    imageProcessingStatus,
    currentProject,
    setCurrentProject,
    networkStatus
  };
};
