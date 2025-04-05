import * as React from "react";

declare module "../components/ui/dialog" {
  export const Dialog: React.FC<{
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }>;
  
  export const DialogTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  
  export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode;
  }>;
  
  export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  
  export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  
  export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>>;
  
  export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>>;
} 