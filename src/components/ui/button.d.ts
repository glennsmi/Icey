import * as React from "react";

declare module "../components/ui/button" {
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    asChild?: boolean;
  }
  
  export const Button: React.FC<ButtonProps>;
  
  export const buttonVariants: (props: { 
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"; 
    size?: "default" | "sm" | "lg" | "icon"; 
    className?: string;
  }) => string;
} 