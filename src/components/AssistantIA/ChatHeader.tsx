
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookIcon, 
  SaveIcon, 
  TrashIcon, 
  Settings2Icon, 
  CameraIcon, 
  WifiIcon,
  WifiOffIcon,
  HelpCircleIcon 
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ConversationHistory from './ConversationHistory';
import { Message } from '@/types/assistant';

interface ChatHeaderProps {
  setIsOptionsOpen: (isOpen: boolean) => void;
  saveConversation: () => void;
  clearConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
  loadConversation?: (messages: Message[], projectName?: string) => void;
  currentProject?: string;
  setCurrentProject?: (project: string) => void;
  networkStatus?: 'online' | 'offline' | 'uncertain';
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  setIsOptionsOpen,
  saveConversation,
  clearConversation,
  useScreenshots,
  setUseScreenshots,
  loadConversation,
  currentProject = 'Default Project',
  setCurrentProject,
  networkStatus = 'uncertain'
}) => {
  const [editingProject, setEditingProject] = useState(false);
  const [projectName, setProjectName] = useState(currentProject);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleProjectSave = () => {
    if (setCurrentProject && projectName.trim()) {
      setCurrentProject(projectName);
    }
    setEditingProject(false);
  };

  const renderNetworkStatus = () => {
    switch (networkStatus) {
      case 'online':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <WifiIcon className="h-3 w-3" /> Connecté
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
            <WifiOffIcon className="h-3 w-3" /> Déconnecté
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1">
            <WifiIcon className="h-3 w-3" /> État réseau incertain
          </Badge>
        );
    }
  };

  return (
    <div className="border-b p-3 flex justify-between items-center bg-card">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-primary"
          disabled
        >
          <BookIcon className="h-5 w-5" />
        </Button>
        
        {editingProject ? (
          <div className="flex gap-2 items-center">
            <Input
              className="h-8 w-[180px]"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleProjectSave()}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleProjectSave}
            >
              Enregistrer
            </Button>
          </div>
        ) : (
          <div 
            className="font-medium hover:underline cursor-pointer"
            onClick={() => setCurrentProject && setEditingProject(true)}
          >
            {currentProject}
          </div>
        )}
        
        {useScreenshots && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
            <CameraIcon className="h-3 w-3" /> Captures activées
          </Badge>
        )}
        
        {renderNetworkStatus()}
      </div>
      
      <div className="flex items-center gap-2">
        {loadConversation && setCurrentProject && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHistoryOpen(true)}
              className="flex gap-2"
            >
              <BookIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </Button>
            
            <ConversationHistory
              isOpen={isHistoryOpen}
              onOpenChange={setIsHistoryOpen}
              loadConversation={loadConversation}
              setCurrentProject={setCurrentProject}
            />
          </>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={saveConversation}
          className="flex gap-2"
        >
          <SaveIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Sauvegarder</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearConversation}
          className="flex gap-2"
        >
          <TrashIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Effacer</span>
        </Button>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsOptionsOpen(true)}
        >
          <Settings2Icon className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
            >
              <HelpCircleIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium">Assistant IA</h4>
              <p className="text-sm text-muted-foreground">
                Posez des questions à l'IA pour obtenir de l'aide avec votre code, vos projets ou d'autres interrogations techniques.
              </p>
              <div className="text-xs text-muted-foreground mt-2">
                <p className="font-medium">Raccourcis:</p>
                <ul className="space-y-1 mt-1">
                  <li><span className="bg-muted rounded px-1">Entrée</span> - Envoyer le message</li>
                  <li><span className="bg-muted rounded px-1">Shift + Entrée</span> - Nouvelle ligne</li>
                </ul>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ChatHeader;
