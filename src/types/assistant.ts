
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
