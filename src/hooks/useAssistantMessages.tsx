
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ImageProcessingStatus } from '@/types/assistant';
import { useConversationState } from './useConversationState';
import { useNetworkStatus } from './useNetworkStatus';
import { handleMessageSubmission } from '@/utils/messageHandlingUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');

  // On récupère l'état du réseau
  const networkStatus = useNetworkStatus();
  
  // Vérification des variables d'environnement au chargement
  useEffect(() => {
    // Vérifier si les variables d'environnement critiques sont présentes
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error("Variables d'environnement manquantes pour l'assistant IA");
      toast.error("Configuration incomplète", {
        description: "Vérifiez les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY",
        duration: 10000
      });
    } else {
      console.log("[Assistant] Variables d'environnement vérifiées ✓");
      console.log(`[Assistant] URL API: ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`);
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
