
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ChatOptionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useScreenshots: boolean;
  setUseScreenshots: (use: boolean) => void;
}

const ChatOptions: React.FC<ChatOptionsProps> = ({
  open,
  onOpenChange,
  useScreenshots,
  setUseScreenshots,
}) => {
  const [aiVerbosity, setAiVerbosity] = useState('normal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Options de l'Assistant IA</DialogTitle>
          <DialogDescription>
            Personnalisez le comportement de votre Assistant IA
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Screenshots Option */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="screenshots">Analyse des captures d'écran</Label>
              <p className="text-sm text-muted-foreground">
                L'IA analysera vos captures d'écran pour fournir un contexte à ses réponses
              </p>
            </div>
            <Switch
              id="screenshots"
              checked={useScreenshots}
              onCheckedChange={setUseScreenshots}
            />
          </div>
          
          <Separator />
          
          {/* AI Verbosity Option */}
          <div className="space-y-3">
            <Label>Niveau de détail des réponses</Label>
            <div className="grid grid-cols-3 gap-2">
              {['concis', 'normal', 'détaillé'].map((option) => (
                <div
                  key={option}
                  className={`
                    cursor-pointer rounded-md border p-2 text-center text-sm
                    ${aiVerbosity === option 
                      ? 'border-primary bg-primary/10' 
                      : 'border-input hover:bg-accent'}
                  `}
                  onClick={() => setAiVerbosity(option)}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {aiVerbosity === 'concis' 
                ? 'Réponses courtes et directes.'
                : aiVerbosity === 'normal'
                ? 'Équilibre entre précision et concision.'
                : 'Réponses techniques détaillées et explicatives.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatOptions;
