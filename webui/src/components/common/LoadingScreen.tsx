import { Loader2 } from 'lucide-react';

export function LoadingScreen({ label = 'Loading your workspace...' }: { label?: string }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
