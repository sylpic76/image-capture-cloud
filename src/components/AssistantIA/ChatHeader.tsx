
import React, { useState } from 'react';
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardHeader } from "@/components/ui/card";
import StatusIndicator from "@/components/StatusIndicator";

interface ChatHeaderProps {
  setIsOptionsOpen: (isOpen: boolean) => void;
  saveConversation: () => void;
  clearConversation: () => void;
  useScreenshots?: boolean;
  setUseScreenshots?: (use: boolean) => void;
  currentProject?: string;
  setCurrentProject?: (project: string) => void;
  networkStatus?: 'online' | 'offline' | 'uncertain';
}

const ChatHeader = ({ 
  setIsOptionsOpen,
  saveConversation,
  clearConversation,
  currentProject = 'Default Project',
  setCurrentProject,
  networkStatus = 'uncertain'
}: ChatHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState(currentProject);

  const handleProjectNameSave = () => {
    if (setCurrentProject && projectName.trim()) {
      setCurrentProject(projectName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleProjectNameSave();
    }
  };

  return (
    <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        {isEditing ? (
          <div className="flex gap-2 items-center flex-1">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleProjectNameSave}
              onKeyDown={handleKeyDown}
              className="max-w-xs"
              autoFocus
            />
            <Button variant="ghost" size="sm" onClick={handleProjectNameSave}>
              Enregistrer
            </Button>
          </div>
        ) : (
          <div 
            className="font-semibold cursor-pointer hover:underline flex items-center gap-2" 
            onClick={() => setIsEditing(true)}
            title="Cliquer pour modifier le nom du projet"
          >
            <span>Projet: {currentProject}</span>
            {networkStatus && (
              <StatusIndicator status={networkStatus} className="ml-2" />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={saveConversation}>
          Enregistrer
        </Button>
        <Button variant="outline" size="sm" onClick={clearConversation}>
          Effacer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOptionsOpen(true)}
        >
          <Settings size={18} />
        </Button>
      </div>
    </CardHeader>
  );
};

export default ChatHeader;
