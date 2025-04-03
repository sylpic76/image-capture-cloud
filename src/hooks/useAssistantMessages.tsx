
import { useState } from 'react';
import { toast } from 'sonner';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus } from './useNetworkStatus';
import { handleMessageSubmission } from '@/utils/messageHandlingUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  // On récupère l'état du réseau mais on ne bloque pas l'envoi des messages
  const networkStatus = useNetworkStatus();
  
  // Vérification des variables d'environnement au chargement
  useState(() => {
    // Vérifier si les variables d'environnement critiques sont présentes
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error("Variables d'environnement manquantes pour l'assistant IA");
      toast.error("Configuration incomplète", {
        description: "Vérifiez les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY",
        duration: 10000
      });
    }
  });

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
