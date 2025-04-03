
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
      badgeVariant = 'outline';
      break;
    case 'offline':
      icon = <WifiOff size={14} />;
      tooltipText = 'Mode hors ligne';
      badgeVariant = 'secondary';
      break;
    case 'uncertain':
    default:
      icon = <AlertTriangle size={14} />;
      tooltipText = 'Connexion instable';
      badgeVariant = 'secondary';
      break;
  }
  
  // Simplification de l'affichage - juste l'icône pour tous les états
  const displayContent = icon;
  
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
