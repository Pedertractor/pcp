import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveProxyTarget(viteApiUrl: string | undefined): string {
  const configured = viteApiUrl?.trim();
  if (configured && configured !== '/api') {
    return configured.replace(/\/api\/?$/, '');
  }
  return 'http://127.0.0.1:9091';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  const apiProxyTarget = resolveProxyTarget(env.VITE_API_URL);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
