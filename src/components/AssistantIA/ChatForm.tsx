
import React, { useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';

interface ChatFormProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

const ChatForm: React.FC<ChatFormProps> = ({ input, setInput, handleSubmit, isLoading }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle textarea height
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto resize textarea (limited to 5 rows)
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-4 flex gap-2 items-end">
      <div className="relative flex-grow">
        <Textarea
          ref={textareaRef}
          placeholder="Posez votre question technique..."
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          className="resize-none min-h-[50px] py-3 pr-12 overflow-auto"
          disabled={isLoading}
        />
        <Button 
          type="submit"
          size="sm"
          className="absolute right-2 bottom-2"
          disabled={isLoading || !input.trim()}
          variant="ghost"
        >
          <Send size={18} />
        </Button>
      </div>
    </form>
  );
};

export default ChatForm;
