import { AlertCircle, FileQuestion, Loader2 } from "lucide-react";
import { Button } from "./button";

interface StateProps {
  title?: string;
  message?: string;
  className?: string;
}

interface ErrorStateProps extends StateProps {
  onRetry?: () => void;
}

export function LoadingState({ title = "Loading...", message, className }: StateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center space-y-3 h-full min-h-[120px] ${className || ""}`}>
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center space-y-4 h-full min-h-[120px] ${className || ""}`}>
      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title = "No Data", message, className }: StateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center space-y-3 h-full min-h-[120px] ${className || ""}`}>
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
        <FileQuestion className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
