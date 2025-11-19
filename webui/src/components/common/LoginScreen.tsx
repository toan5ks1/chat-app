import { LogIn } from 'lucide-react';
import { AUTH_URL } from '../../lib/api';
import { Button } from '../ui/button';

export function LoginScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-black/30 p-10 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Real-time chat platform</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign in with Google to start chatting with your team, share files instantly, and stay connected across devices.
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={() => (window.location.href = AUTH_URL)}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
