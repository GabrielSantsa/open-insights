import { LucideIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ModuleEmptyState({ 
  icon: Icon = Users, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: ModuleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-xl bg-muted/10 p-8 text-center border-dashed animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
