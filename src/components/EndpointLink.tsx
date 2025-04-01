
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link } from "lucide-react";
import { toast } from "sonner";

interface EndpointLinkProps {
  link: string;
  title?: string;
}

const EndpointLink = ({ link, title = "API Endpoint" }: EndpointLinkProps) => {
  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success("Lien copié dans le presse-papiers !");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Link size={18} />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input 
            value={link}
            readOnly
            className="font-mono text-sm"
          />
          <Button variant="outline" onClick={copyLink}>
            <Copy size={18} />
            <span className="ml-2 hidden md:inline">Copier</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EndpointLink;
