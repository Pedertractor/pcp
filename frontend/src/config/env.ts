function resolveApiUrl(): string {
  if (import.meta.env.DEV) {
    return '/api';
  }

  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    const origin = configured.replace(/\/$/, '');
    return origin.endsWith('/api') ? origin : `${origin}/api`;
  }

  return '/api';
}

export const env = {
  apiUrl: resolveApiUrl(),
} as const;
