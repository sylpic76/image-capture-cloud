
import React from 'react';
import { Settings, Save, Camera, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ChatHeaderProps {
  setIsOptionsOpen: (open: boolean) => void;
  saveConversation: () => void;
  clearConversation: () => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  setIsOptionsOpen,
  saveConversation,
  clearConversation,
  useScreenshots,
  setUseScreenshots
}) => {
  return (
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
            onClick={clearConversation}
            title="Effacer la conversation"
          >
            <Trash2 size={18} />
          </Button>
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
  );
};

export default ChatHeader;
