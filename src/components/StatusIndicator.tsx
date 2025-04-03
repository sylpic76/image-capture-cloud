
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
      badgeVariant = 'default';
      break;
    case 'offline':
      icon = <WifiOff size={14} />;
      tooltipText = 'Aucune connexion au serveur';
      badgeVariant = 'destructive';
      break;
    case 'uncertain':
    default:
      icon = <AlertTriangle size={14} />;
      tooltipText = 'État de la connexion incertain';
      badgeVariant = 'secondary';
      break;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={`inline-flex items-center gap-1 ${className}`}>
            {icon}
            <span>
              {status === 'online' ? 'En ligne' : 
               status === 'offline' ? 'Hors ligne' : 'Vérification...'}
            </span>
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
