
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { convertMessagesToJson, ImageProcessingStatus, Message } from '@/types/assistant';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { fetchLatestScreenshot } from '@/utils/screenshotUtils';
import { checkNetworkConnectivity } from '@/utils/projectUtils';

export const useAssistantMessages = (useScreenshots: boolean = false) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageProcessingStatus, setImageProcessingStatus] = useState<ImageProcessingStatus>('idle');
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'uncertain'>('uncertain');
  
  // Nouveau state pour le nom du projet
  const [currentProject, setCurrentProject] = useState('Default Project');
  
  // Check network status on mount and periodically
  useEffect(() => {
    const checkNetwork = async () => {
      const isConnected = await checkNetworkConnectivity();
      setNetworkStatus(isConnected ? 'online' : 'offline');
    };
    
    // Check immediately on mount
    checkNetwork();
    
    // Then check every 30 seconds
    const interval = setInterval(checkNetwork, 30000);
    
    // Listen to browser's online/offline events
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Pre-check network connectivity
    if (networkStatus !== 'online') {
      toast.error("Connexion instable ou hors-ligne. Impossible de communiquer avec l'assistant.");
      return;
    }
    
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
          // Use the utility to get the latest screenshot
          screenshotData = await fetchLatestScreenshot(setImageProcessingStatus);
          
          if (screenshotData) {
            setImageProcessingStatus('success');
          } else {
            // If screenshot is null but no error was thrown, it's a silent failure
            console.warn("Screenshot fetched but returned null or empty");
            setImageProcessingStatus('error');
          }
        } catch (error) {
          console.error('Error processing screenshot:', error);
          setImageProcessingStatus('error');
          // Continue without screenshot rather than aborting the entire operation
          toast.error('Erreur lors du traitement de la capture d\'écran. L\'assistant continuera sans image.');
        }
      }

      // Retry logic for API call
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      let aiResponseData;
      
      while (retryCount < maxRetries && !success) {
        try {
          if (retryCount > 0) {
            // Let the user know we're retrying
            toast.info(`Tentative ${retryCount + 1}/${maxRetries} de connexion à l'assistant...`);
          }
          
          // Call the AI function with the message and optional screenshot
          const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-ai`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
              message: input,
              screenshot: screenshotData,
              projectName: currentProject // Send project name
            }),
          });
          
          if (!aiResponse.ok) {
            const errorData = await aiResponse.json().catch(() => null);
            console.error(`AI Response error (${aiResponse.status}):`, errorData);
            
            // Server errors (5xx) are retriable
            if (aiResponse.status >= 500 && retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            
            throw new Error(`AI service responded with ${aiResponse.status}: ${errorData?.error || 'Unknown error'}`);
          }
          
          aiResponseData = await aiResponse.json();
          success = true;
          
        } catch (error) {
          console.error('Error in API call:', error);
          
          // For network errors, retry
          if (error.message?.includes('Failed to fetch') && retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            continue;
          }
          
          throw error;
        }
      }
      
      // Add assistant response to the messages
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponseData?.response || 'Je n\'ai pas pu générer de réponse. Veuillez réessayer.',
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
      
      // Fix the network status check to avoid type comparison issues
      let networkMessage = '';
      if (networkStatus === 'offline') {
        networkMessage = 'Vérifiez votre connexion internet.';
      }
      
      toast.error(`Erreur de communication avec l'assistant. ${networkMessage}`);
    } finally {
      setIsLoading(false);
      setImageProcessingStatus('idle');
    }
  };
  
  const saveConversation = async () => {
    try {
      if (messages.length === 0) return;
      
      // Log this operation to check if it's being called
      console.log('Saving conversation to Supabase:', messages);
      
      const { error } = await supabase.from('conversations').insert({
        messages: convertMessagesToJson(messages),
        project_name: currentProject
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
    currentProject,
    setCurrentProject,
    networkStatus
  };
};
