
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/assistant';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Json } from '@/integrations/supabase/types';

interface ConversationItem {
  id: string;
  created_at: string;
  messages: Message[];
  project_name: string;
}

// Type for raw data from Supabase
interface RawConversationData {
  id: string;
  created_at: string;
  messages: Json;
  project_name?: string;
}

interface ConversationHistoryProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  loadConversation: (messages: Message[], projectName?: string) => void;
  setCurrentProject: (project: string) => void;
}

const ConversationHistory = ({ 
  isOpen, 
  onOpenChange, 
  loadConversation,
  setCurrentProject 
}: ConversationHistoryProps) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch conversations from Supabase
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: sortDirection === 'asc' });
      
      if (error) {
        throw error;
      }
      
      // Map data to include correct project_name and cast messages
      const conversationsWithProject = (data as RawConversationData[]).map(item => ({
        id: item.id,
        created_at: item.created_at,
        messages: Array.isArray(item.messages) 
          ? item.messages.map((msg: any) => ({
              id: msg.id || '',
              role: msg.role || 'user',
              content: msg.content || '',
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
            }))
          : [],
        project_name: item.project_name || 'Default Project'
      }));
      
      setConversations(conversationsWithProject);
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      toast.error('Impossible de charger les conversations');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a conversation
  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Remove from local state
      setConversations(prevConversations => 
        prevConversations.filter(conversation => conversation.id !== id)
      );
      
      toast.success('Conversation supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Impossible de supprimer la conversation');
    }
  };

  // Load a conversation
  const handleLoadConversation = (conversation: ConversationItem) => {
    loadConversation(conversation.messages, conversation.project_name);
    setCurrentProject(conversation.project_name);
    onOpenChange(false);
    toast.success('Conversation chargée');
  };

  // Toggle sorting
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Fetch conversations when the dialog opens or sort changes
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, sortDirection]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Historique des conversations</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSortDirection}
                className="flex items-center gap-1"
              >
                <ArrowUpDown size={16} />
                {sortDirection === 'desc' ? 'Plus récent' : 'Plus ancien'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConversations}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Actualiser
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            Aucune conversation sauvegardée
          </div>
        ) : (
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {conversations.map(conversation => {
              const firstMessage = conversation.messages[0]?.content || '';
              const messageCount = conversation.messages.length;
              const date = new Date(conversation.created_at);
              
              return (
                <div 
                  key={conversation.id} 
                  className="p-4 border rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {conversation.project_name || 'Projet par défaut'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                        {' • '}
                        {messageCount} message{messageCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteConversation(conversation.id)}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                  
                  <p className="text-sm line-clamp-2 text-muted-foreground mb-3">
                    {firstMessage.substring(0, 150)}
                    {firstMessage.length > 150 ? '...' : ''}
                  </p>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleLoadConversation(conversation)}
                  >
                    Reprendre cette conversation
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConversationHistory;
