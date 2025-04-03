
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'uncertain';
  className?: string;
}

const StatusIndicator = ({ status, className = '' }: StatusIndicatorProps) => {
  let icon;
  let tooltipText;
  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  
  switch (status) {
    case 'online':
      icon = <Wifi size={14} />;
      tooltipText = 'Connecté au serveur';
      badgeVariant = 'outline';  // Moins visible quand tout va bien
      break;
    case 'offline':
      icon = <WifiOff size={14} />;
      tooltipText = 'Mode hors ligne - la synchronisation sera effectuée dès que possible';
      badgeVariant = 'secondary';  // Moins alarmiste que destructive
      break;
    case 'uncertain':
    default:
      icon = <AlertTriangle size={14} />;
      tooltipText = 'Connexion instable - essaie de se reconnecter automatiquement';
      badgeVariant = 'secondary';
      break;
  }
  
  // Ne montre le texte qu'en cas de problème, sinon juste l'icône
  const displayContent = status !== 'online' ? (
    <>
      {icon}
      <span>
        {status === 'offline' ? 'Mode hors ligne' : 'Reconnexion...'}
      </span>
    </>
  ) : icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={`inline-flex items-center gap-1 ${className} ${status === 'online' ? 'opacity-50' : ''}`}>
            {displayContent}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default StatusIndicator;
