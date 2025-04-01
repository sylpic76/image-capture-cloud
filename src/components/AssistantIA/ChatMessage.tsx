
import React from 'react';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[85%] p-4 rounded-lg",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-muted rounded-tl-none"
      )}>
        <div className="text-sm mb-1">
          {isUser ? 'Vous' : 'Assistant IA'}
          <span className="text-xs opacity-70 ml-2">
            {format(new Date(message.timestamp), 'HH:mm')}
          </span>
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
};

export default ChatMessage;
