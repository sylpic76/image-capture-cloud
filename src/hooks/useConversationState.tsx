
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '@/types/assistant';
import { toast } from 'sonner';
import { saveConversation as saveConversationToSupabase } from '@/utils/conversationUtils';

/**
 * Hook to manage conversation state
 */
export function useConversationState(initialProjectName: string = 'Default Project') {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentProject, setCurrentProject] = useState(initialProjectName);
  
  /**
   * Add a new user message to the conversation
   */
  const addUserMessage = (content: string): Message => {
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    return userMessage;
  };
  
  /**
   * Add a new assistant message to the conversation
   */
  const addAssistantMessage = (content: string): Message => {
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, assistantMessage]);
    return assistantMessage;
  };
  
  /**
   * Add an error message from the assistant
   */
  const addErrorMessage = (error: Error | string): Message => {
    const errorMessage = typeof error === 'string' 
      ? error 
      : `Erreur: ${error.message || 'Une erreur est survenue'}. Veuillez réessayer.`;
      
    return addAssistantMessage(errorMessage);
  };
  
  /**
   * Save the current conversation to Supabase
   */
  const saveConversation = async () => {
    try {
      if (messages.length === 0) {
        toast.info('Aucune conversation à sauvegarder.');
        return;
      }
      
      await saveConversationToSupabase(messages, currentProject);
      toast.success('Conversation sauvegardée avec succès');
    } catch (error) {
      console.error('Error saving conversation:', error);
      toast.error('Erreur lors de la sauvegarde de la conversation');
    }
  };
  
  /**
   * Load an existing conversation
   */
  const loadConversation = (loadedMessages: Message[]) => {
    setMessages(loadedMessages);
  };
  
  /**
   * Clear the current conversation
   */
  const clearConversation = () => {
    setMessages([]);
    toast.success('Conversation effacée');
  };
  
  return {
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
  };
}
