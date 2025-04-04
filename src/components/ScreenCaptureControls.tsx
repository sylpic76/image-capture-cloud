
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, PauseCircle, Camera, Lock, Clock } from "lucide-react";
import ScreenCaptureDebugger from './ScreenCaptureDebugger';

interface ScreenCaptureControlsProps {
  status: string;
  countdown: number;
  toggleCapture: () => void;
  getDiagnostics?: () => any;
  sdkDisabled?: boolean;
}

const ScreenCaptureControls = ({ 
  status, 
  countdown, 
  toggleCapture,
  getDiagnostics,
  sdkDisabled = true
}: ScreenCaptureControlsProps) => {
  // Log status changes to help with debugging
  useEffect(() => {
    console.log("ScreenCaptureControls: status changed to", status);
  }, [status]);

  const renderStatus = () => {
    switch (status) {
      case 'idle':
        return <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>;
      case 'requesting-permission':
        return <Badge className="bg-blue-500">Demande de permission...</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Capture active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Capture en pause</Badge>;
      case 'error':
        return <Badge variant="destructive">Erreur</Badge>;
      default:
        return <Badge variant="outline">État inconnu: {status}</Badge>;
    }
  };

  const renderAction = () => {
    switch (status) {
      case 'idle':
      case 'error':
        return (
          <Button onClick={toggleCapture} className="w-full md:w-auto">
            <Camera className="mr-2 h-4 w-4" />
            Démarrer la capture
          </Button>
        );
      case 'active':
        return (
          <Button onClick={toggleCapture} variant="outline" className="w-full md:w-auto">
            <PauseCircle className="mr-2 h-4 w-4" />
            Arrêter
          </Button>
        );
      case 'paused':
        return (
          <Button onClick={toggleCapture} className="w-full md:w-auto">
            <PlayCircle className="mr-2 h-4 w-4" />
            Reprendre
          </Button>
        );
      case 'requesting-permission':
        return (
          <Button disabled className="w-full md:w-auto">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Demande en cours...
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-muted/40 shadow-sm">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera size={20} className="text-primary" />
            Capture d'écran
            {sdkDisabled && (
              <Badge variant="secondary" className="text-xs ml-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                SDK limité
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {renderStatus()}
            {getDiagnostics && <ScreenCaptureDebugger getDiagnostics={getDiagnostics} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            {status === 'active' ? (
              <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 rounded-md">
                <Clock className="text-primary h-5 w-5" />
                <span className="text-muted-foreground">Prochaine capture dans:</span>
                <span className="font-bold text-lg text-primary">{countdown}s</span>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {status === 'paused' 
                  ? "La capture d'écran est actuellement en pause" 
                  : status === 'error'
                    ? "Une erreur s'est produite lors de la capture d'écran"
                    : status === 'requesting-permission'
                      ? "Veuillez autoriser la capture d'écran dans la boîte de dialogue"
                      : "Cliquez sur le bouton pour autoriser la capture d'écran"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {renderAction()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenCaptureControls;
