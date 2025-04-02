
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

interface DiagnosticsTabProps {
  diagnostics: any | null;
  refreshDiagnostics: () => void;
}

const DiagnosticsTab = ({ diagnostics, refreshDiagnostics }: DiagnosticsTabProps) => {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-500';
      case 'error': return 'bg-red-500';
      case 'requesting-permission': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Diagnostics du système</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshDiagnostics}
        >
          <RefreshCw size={14} />
        </Button>
      </div>
      
      {diagnostics ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Badge className={`${getStatusColor(diagnostics.status)}`}>
              {diagnostics.status}
            </Badge>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Compte à rebours</div>
            <span>{diagnostics.countdown}s</span>
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Media Stream</div>
            {diagnostics.hasMediaStream ? (
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle2 size={14} className="mr-1" /> Actif
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500 text-red-500">
                <XCircle size={14} className="mr-1" /> Inactif
              </Badge>
            )}
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Captures</div>
            <div className="flex gap-2 items-center">
              <Badge variant="secondary">{diagnostics.captures}</Badge>
              <span className="text-xs text-green-500">✓ {diagnostics.successful}</span>
              <span className="text-xs text-red-500">✗ {diagnostics.failed}</span>
            </div>
          </div>
          
          {diagnostics.lastError && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Dernière erreur</div>
              <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-mono">
                {diagnostics.lastError}
              </div>
            </div>
          )}
          
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Navigateur</div>
            <div className="text-xs font-mono break-all">{diagnostics.browserInfo}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40">
          <span className="text-muted-foreground">Chargement des diagnostics...</span>
        </div>
      )}
    </div>
  );
};

export default DiagnosticsTab;
