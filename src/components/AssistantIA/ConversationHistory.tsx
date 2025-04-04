
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HistoryIcon, TrashIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/assistant';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ConversationItem = {
  id: string;
  created_at: string;
  messages: any[];
  project_name: string;
};

interface ConversationHistoryProps {
  loadConversation: (messages: Message[]) => void;
  setCurrentProject: (project: string) => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  loadConversation,
  setCurrentProject
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        toast.error('Impossible de charger l\'historique des conversations');
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  const handleLoadConversation = (conversation: ConversationItem) => {
    try {
      // Convertir le format JSON en objets Message
      const messages = conversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      // Définir le projet courant
      if (conversation.project_name) {
        setCurrentProject(conversation.project_name);
      }
      
      // Charger les messages
      loadConversation(messages);
      setOpen(false);
      toast.success('Conversation chargée avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      toast.error('Impossible de charger cette conversation');
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Mise à jour de la liste des conversations
      setConversations(conversations.filter(conv => conv.id !== id));
      toast.success('Conversation supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Impossible de supprimer cette conversation');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy à HH:mm', { locale: fr });
    } catch {
      return 'Date inconnue';
    }
  };

  const getFirstMessage = (messages: any[]) => {
    if (!messages || messages.length === 0) return 'Conversation vide';
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages.length > 0 
      ? userMessages[0].content.substring(0, 80) + (userMessages[0].content.length > 80 ? '...' : '')
      : 'Aucun message utilisateur';
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setOpen(true)}
          className="flex gap-2"
        >
          <HistoryIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Historique</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>Historique des conversations</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>Aucune conversation sauvegardée</p>
          </div>
        ) : (
          <div className="space-y-4 mt-4 pr-2 max-h-[calc(100vh-10rem)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projet</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow 
                    key={conversation.id}
                    className="cursor-pointer hover:bg-muted/80"
                    onClick={() => handleLoadConversation(conversation)}
                  >
                    <TableCell className="font-medium">
                      {conversation.project_name || 'Projet par défaut'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(conversation.created_at)}
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1 pr-4">
                        {getFirstMessage(conversation.messages)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleDeleteConversation(conversation.id, e)}
                              className="h-7 w-7"
                            >
                              <TrashIcon className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Supprimer cette conversation</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ConversationHistory;
