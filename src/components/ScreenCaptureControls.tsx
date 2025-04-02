
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
  const interval = 5; // Set this to match the 5 second interval
  
  return (
    <Card className="modern-card overflow-hidden">
      <CardHeader className="bg-gradient-primary pb-4">
        <CardTitle className="text-xl flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <div className="p-1 bg-white/20 rounded-full">
              <Clock size={18} className="text-white" />
            </div>
            <span>LiveScreenUploader</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-medium">
                  Prochain screenshot dans: <span className="font-bold">{countdown}s</span>
                </span>
                <span className="text-sm font-medium px-2 py-0.5 bg-secondary rounded-full text-xs">
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
              <Progress value={(countdown / interval) * 100} className="h-2" />
            </div>
          </div>
          
          <Button 
            variant={isActive ? "destructive" : "default"}
            onClick={toggleCapture}
            className="w-full flex items-center justify-center gap-2 py-6 shadow-md"
            size="lg"
          >
            <div className="flex items-center justify-center gap-2">
              {isActive ? <Pause size={18} /> : <Play size={18} />}
              <span className="font-medium">
                {isActive ? "Mettre en pause" : "Reprendre la capture"}
              </span>
            </div>
          </Button>
          
          {status === 'error' && (
            <div className="mt-2 p-4 bg-destructive/10 text-destructive rounded-lg text-sm border border-destructive/20">
              <p className="font-medium">Erreur de permission</p>
              <p>Veuillez autoriser la capture d'écran pour utiliser cette fonctionnalité.</p>
            </div>
          )}
          {status === 'idle' && (
            <div className="mt-2 p-4 bg-primary/10 text-primary rounded-lg text-sm border border-primary/20">
              <p className="font-medium">Capture d'écran inactive</p>
              <p>Cliquez sur "Reprendre la capture" pour commencer à capturer votre écran.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenCaptureControls;
