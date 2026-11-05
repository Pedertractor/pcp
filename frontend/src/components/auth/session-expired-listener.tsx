import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { setWebCsrfToken } from '@/lib/http-client';
import { onSessionExpired } from '@/lib/session-expired';
import { clearWebSessionCache } from '@/services/auth/auth.service';

export function SessionExpiredListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    return onSessionExpired(() => {
      setWebCsrfToken(null);
      clearWebSessionCache(queryClient);

      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    });
  }, [navigate, queryClient]);

  return null;
}
