
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Pause, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ScreenCaptureControlsProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
}

const ScreenCaptureControls = ({ status, countdown, toggleCapture }: ScreenCaptureControlsProps) => {
  const isActive = status === 'active';
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>LiveScreenUploader</span>
          <Button 
            variant={isActive ? "destructive" : "default"}
            onClick={toggleCapture}
            className="flex items-center gap-2"
          >
            {isActive ? <Pause size={18} /> : <Play size={18} />}
            {isActive ? "Pause la capture" : "Reprendre la capture"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Clock size={20} className="text-muted-foreground" />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">
                Prochain screenshot dans: <span className="font-bold">{countdown}s</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {status === 'active' 
                  ? "Capture active" 
                  : status === 'paused' 
                    ? "Capture en pause" 
                    : status === 'requesting-permission'
                      ? "Demande de permission..." 
                      : status === 'error'
                        ? "Erreur de permission" 
                        : "Inactif"}
              </span>
            </div>
            <Progress value={(countdown / 30) * 100} />
          </div>
        </div>
        {status === 'error' && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            <p className="font-medium">Erreur de permission</p>
            <p>Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité. Cliquez sur "Reprendre la capture" pour réessayer.</p>
          </div>
        )}
        {status === 'idle' && (
          <div className="mt-4 p-3 bg-primary/10 text-primary rounded-md text-sm">
            <p className="font-medium">Capture d'écran inactive</p>
            <p>Cliquez sur "Reprendre la capture" pour commencer à capturer votre écran. Cela nécessite votre permission.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScreenCaptureControls;
