
import React, { useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Image, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatFormProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  imageProcessingStatus?: 'idle' | 'processing' | 'success' | 'error';
}

const ChatForm: React.FC<ChatFormProps> = ({ 
  input, 
  setInput, 
  handleSubmit, 
  isLoading,
  imageProcessingStatus = 'idle'
}) => {
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
    <form onSubmit={handleSubmit} className="pt-4 space-y-2">
      {imageProcessingStatus === 'processing' && (
        <Alert className="bg-primary/5 text-primary border-primary/20 py-2">
          <AlertDescription className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            <span>Traitement de la capture d'écran en cours...</span>
          </AlertDescription>
        </Alert>
      )}
      
      {imageProcessingStatus === 'success' && (
        <Alert className="bg-green-50 text-green-700 border-green-200 py-2">
          <AlertDescription className="flex items-center gap-2">
            <Image size={14} />
            <span>Capture d'écran traitée avec succès</span>
          </AlertDescription>
        </Alert>
      )}
      
      {imageProcessingStatus === 'error' && (
        <Alert className="bg-amber-50 text-amber-700 border-amber-200 py-2">
          <AlertDescription className="flex items-center gap-2">
            <Image size={14} />
            <span>Impossible de traiter l'image, votre message sera envoyé sans capture d'écran</span>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex gap-2 items-end">
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
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ChatForm;
