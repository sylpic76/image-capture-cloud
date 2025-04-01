
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Link } from "lucide-react";
import { toast } from "sonner";

interface EndpointLinkProps {
  link: string;
  title?: string;
  description?: string;
}

const EndpointLink = ({ link, title = "API Endpoint", description }: EndpointLinkProps) => {
  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers !");
  };
  
  const openLink = () => {
    window.open(link, '_blank');
  };

  return (
    <Card className="modern-card overflow-hidden border border-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/80 to-primary/60 pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <div className="p-1 bg-white/20 rounded-full">
            <Link size={16} className="text-white" />
          </div>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-3">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input 
            value={link}
            readOnly
            className="font-mono text-sm border-primary/20 bg-primary/5 flex-grow"
          />
          <div className="flex gap-2 sm:w-auto w-full">
            <Button 
              variant="outline" 
              onClick={copyLink}
              className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/10"
            >
              <Copy size={16} className="mr-2"/>
              <span>Copier</span>
            </Button>
            <Button
              onClick={openLink}
              className="flex-1 sm:flex-none"
            >
              <ExternalLink size={16} className="mr-2"/>
              <span>Ouvrir</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EndpointLink;
