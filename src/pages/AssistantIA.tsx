
import React, { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { Camera, Send, Settings, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from '@/components/AssistantIA/ChatMessage';
import ChatOptions from '@/components/AssistantIA/ChatOptions';
import { supabase } from "@/integrations/supabase/client";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const AssistantIA = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useScreenshots, setUseScreenshots] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch the latest screenshot
  const { data: latestScreenshot, refetch: refetchScreenshot } = useQuery({
    queryKey: ['latestScreenshot'],
    queryFn: async () => {
      if (!useScreenshots) return null;

      try {
        const response = await fetch('https://mvuccsplodgeomzqnwjs.supabase.co/functions/v1/latest', {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération de la capture d'écran: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Erreur de capture d\'écran:', error);
        return null;
      }
    },
    enabled: useScreenshots,
    refetchInterval: 10000, // Refresh every 10 seconds when screenshots are enabled
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages]);

  // Focus the textarea when the component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get the latest screenshot if enabled
      let screenshotBase64 = null;
      if (useScreenshots && latestScreenshot) {
        try {
          const response = await fetch(latestScreenshot);
          const blob = await response.blob();
          
          // Convert blob to base64
          screenshotBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
      
      // Send message and screenshot to DeepSeek AI
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          screenshot: screenshotBase64,
        }),
      });
      
      if (!aiResponse.ok) {
        throw new Error(`Erreur lors de la communication avec l'IA: ${aiResponse.status}`);
      }
      
      const responseData = await aiResponse.json();
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseData.response || "Désolé, je n'ai pas pu traiter votre demande.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Une erreur est survenue lors de la communication avec l'IA.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save conversation
  const saveConversation = async () => {
    if (messages.length === 0) {
      toast.info("Aucune conversation à sauvegarder.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('conversations')
        .insert({
          messages: messages,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Conversation sauvegardée avec succès!");
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      toast.error("Impossible de sauvegarder la conversation.");
    }
  };

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="h-[80vh] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Assistant IA</CardTitle>
              <CardDescription>
                Un assistant spécialisé en développement web et mobile
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOptionsOpen(true)}
                title="Options"
              >
                <Settings size={18} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveConversation}
                title="Sauvegarder la conversation"
              >
                <Save size={18} />
              </Button>
              <div className="flex items-center gap-2">
                <Camera size={18} className={useScreenshots ? "text-primary" : "text-muted-foreground"} />
                <Switch
                  checked={useScreenshots}
                  onCheckedChange={setUseScreenshots}
                  aria-label="Activer/désactiver l'analyse des captures d'écran"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <ScrollArea className="flex-grow pr-4" ref={scrollAreaRef}>
              <div className="py-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Posez une question à l'Assistant IA.</p>
                    <p className="text-sm mt-2">
                      {useScreenshots 
                        ? "L'IA analysera aussi vos captures d'écran pour un contexte enrichi."
                        : "L'analyse des captures d'écran est désactivée."}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))
                )}
                {isLoading && (
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 animate-pulse">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            </ScrollArea>

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
          </div>
        </CardContent>
      </Card>

      <ChatOptions 
        open={isOptionsOpen} 
        onOpenChange={setIsOptionsOpen}
        useScreenshots={useScreenshots}
        setUseScreenshots={setUseScreenshots}
      />
    </div>
  );
};

export default AssistantIA;
