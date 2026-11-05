import { useQuery } from '@tanstack/react-query';
import { fetchWebSession, webSessionQueryKey } from '@/services/auth/auth.service';

type UseWebSessionOptions = {
  refetchOnMount?: boolean | 'always';
};

export function useWebSession(options?: UseWebSessionOptions) {
  return useQuery({
    queryKey: webSessionQueryKey,
    queryFn: fetchWebSession,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: options?.refetchOnMount ?? false,
    retry: false,
  });
}
