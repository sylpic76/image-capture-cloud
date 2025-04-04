
import { Json } from '@/integrations/supabase/types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type ImageProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

// Function to convert Message objects to JSON-compatible format
export const convertMessagesToJson = (messages: Message[]): Json => {
  return messages.map(message => ({
    ...message,
    timestamp: message.timestamp.toISOString() // Convert Date to ISO string
  })) as Json;
};

// Helper function to convert JSON messages back to Message objects
export const convertJsonToMessages = (jsonMessages: any): Message[] => {
  if (!Array.isArray(jsonMessages)) {
    return [];
  }
  
  return jsonMessages.map(msg => ({
    id: msg.id || '',
    role: msg.role || 'user',
    content: msg.content || '',
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
  }));
};
