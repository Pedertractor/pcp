import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWebSession } from '@/hooks/auth/use-web-session';

export function RequireAuth() {
  const { data, isLoading, isError } = useWebSession();

  if (isLoading) {
    return (
      <main
        className="flex min-h-svh items-center justify-center bg-background"
        aria-busy="true"
        aria-live="polite"
        aria-label="Verificando sessão"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Verificando sua sessão…
          </p>
        </div>
      </main>
    );
  }

  if (!data || isError) {
    return <Navigate to="/login" replace />;
  }

  if (data.firstLogin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
