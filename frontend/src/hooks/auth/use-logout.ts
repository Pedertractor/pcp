import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HttpClientError } from '@/lib/http-client';
import { resetSessionExpiredGate } from '@/lib/session-expired';
import {
  clearWebSessionCache,
  logout as logoutRequest,
} from '@/services/auth/auth.service';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setErrorMessage(null);
    setIsLoggingOut(true);
    try {
      await logoutRequest();
      resetSessionExpiredGate();
      clearWebSessionCache(queryClient);
      navigate('/login', { replace: true });
    } catch (error) {
      const message =
        error instanceof HttpClientError
          ? error.message
          : 'Não foi possível encerrar a sessão. Tente novamente.';
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }, [navigate, queryClient]);

  return { logout, isLoggingOut, errorMessage };
}
