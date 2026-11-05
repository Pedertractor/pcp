import axios, { isAxiosError } from 'axios';
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { notifySessionExpired } from '@/lib/session-expired';
import type { CsrfTokenResponse } from '@/types/user';

const SKIP_REFRESH_ON_401_PATHS = new Set([
  '/users/login',
  '/users/refresh',
  '/users/logout',
]);

type RequestConfigWithRetry = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _csrfRetry?: boolean;
};

function pathOnly(url: string | undefined): string {
  if (!url) {
    return '';
  }
  const noQuery = url.split('?')[0] ?? '';
  return noQuery.replace(/\/$/, '') || '';
}

function isAuthEndpointPath(path: string): boolean {
  for (const skip of SKIP_REFRESH_ON_401_PATHS) {
    if (path === skip || path.endsWith(skip)) {
      return true;
    }
  }
  return false;
}

function shouldAttemptRefreshOn401(config: RequestConfigWithRetry): boolean {
  if (config._retry) {
    return false;
  }
  const path = pathOnly(config.url);
  if (!path || isAuthEndpointPath(path)) {
    return false;
  }
  return true;
}

function shouldForceLoginOn401(config: RequestConfigWithRetry): boolean {
  if (!config._retry) {
    return false;
  }
  const path = pathOnly(config.url);
  if (!path || isAuthEndpointPath(path)) {
    return false;
  }
  return true;
}

function shouldAttemptCsrfSyncOn403(config: RequestConfigWithRetry): boolean {
  if (config._csrfRetry) {
    return false;
  }
  const path = pathOnly(config.url);
  return path !== '/csrf' && !path.endsWith('/csrf');
}

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  code?: string;
};

type HttpClientRequestConfig = Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'data'
>;

type HttpClientErrorParams = {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
};

export class HttpClientError extends Error {
  readonly statusCode?: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor({ message, statusCode, code, details }: HttpClientErrorParams) {
    super(message);
    this.name = 'HttpClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

const axiosClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

let csrfToken: string | null = null;

export function setWebCsrfToken(token: string | null): void {
  csrfToken = token?.trim() ? token.trim() : null;
}

export function getWebCsrfToken(): string | null {
  return csrfToken;
}

let refreshPromise: Promise<void> | null = null;
let csrfSyncPromise: Promise<void> | null = null;

function getMessageFromPayload(
  payload: ApiErrorPayload | undefined,
): string | undefined {
  if (!payload) {
    return undefined;
  }

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  return undefined;
}

function isInvalidCsrfPayload(payload: ApiErrorPayload | undefined): boolean {
  const message = getMessageFromPayload(payload)?.toLowerCase() ?? '';
  if (message.includes('invalid csrf token')) {
    return true;
  }
  return payload?.code === 'EBADCSRFTOKEN';
}

function ensureWebCsrfSynced(): Promise<void> {
  if (!csrfSyncPromise) {
    csrfSyncPromise = (async () => {
      const csrfRes = await axiosClient.get<CsrfTokenResponse>('/csrf');
      const token = csrfRes.data?.csrfToken;
      if (typeof token === 'string' && token.length > 0) {
        setWebCsrfToken(token);
      }
    })().finally(() => {
      csrfSyncPromise = null;
    });
  }
  return csrfSyncPromise;
}

function ensureSessionRefreshed(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      await ensureWebCsrfSynced();
      await axiosClient.post('/users/refresh', {});
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function getStatusFallbackMessage(statusCode?: number): string {
  if (statusCode === 401) {
    return 'Credenciais inválidas.';
  }

  if (statusCode === 403) {
    return 'Você não tem permissão para esta ação.';
  }

  if (statusCode === 404) {
    return 'Recurso não encontrado.';
  }

  if (statusCode && statusCode >= 500) {
    return 'Erro interno do servidor.';
  }

  return 'Falha ao processar a requisição.';
}

function toHttpClientError(error: unknown): HttpClientError {
  if (error instanceof HttpClientError) {
    return error;
  }

  if (!isAxiosError<ApiErrorPayload>(error)) {
    return new HttpClientError({
      message: 'Falha inesperada na requisição.',
      details: error,
    });
  }

  if (error.code === 'ECONNABORTED') {
    return new HttpClientError({
      message: 'Tempo limite da requisição excedido.',
      code: error.code,
    });
  }

  if (!error.response) {
    return new HttpClientError({
      message: 'Não foi possível conectar ao servidor.',
      code: error.code,
    });
  }

  const payload = error.response.data;
  const statusCode = payload?.statusCode ?? error.response.status;
  const message =
    getMessageFromPayload(payload) ?? getStatusFallbackMessage(statusCode);

  return new HttpClientError({
    message,
    statusCode,
    code: error.code,
    details: payload,
  });
}

async function request<TResponse>(
  config: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await axiosClient.request<TResponse>(config);
    return response.data;
  } catch (error) {
    throw toHttpClientError(error);
  }
}

function shouldAttachCsrfToken(method: string | undefined): boolean {
  const normalizedMethod = method?.toLowerCase();
  return (
    normalizedMethod === 'post' ||
    normalizedMethod === 'put' ||
    normalizedMethod === 'patch' ||
    normalizedMethod === 'delete'
  );
}

axiosClient.interceptors.request.use((config) => {
  if (shouldAttachCsrfToken(config.method)) {
    const token = getWebCsrfToken();
    if (token) {
      config.headers['x-csrf-token'] = token;
    }
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const config = error.config as RequestConfigWithRetry;
    const payload = error.response?.data as ApiErrorPayload | undefined;

    if (
      status === 403 &&
      isInvalidCsrfPayload(payload) &&
      shouldAttemptCsrfSyncOn403(config)
    ) {
      config._csrfRetry = true;

      try {
        await ensureWebCsrfSynced();
      } catch (csrfSyncError) {
        return Promise.reject(csrfSyncError);
      }

      return axiosClient.request(config);
    }

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (shouldAttemptRefreshOn401(config)) {
      config._retry = true;

      try {
        await ensureSessionRefreshed();
      } catch (refreshError) {
        notifySessionExpired();
        return Promise.reject(refreshError);
      }

      return axiosClient.request(config);
    }

    if (shouldForceLoginOn401(config)) {
      notifySessionExpired();
    }

    return Promise.reject(error);
  },
);

export const httpClient = {
  get<TResponse>(
    url: string,
    config?: HttpClientRequestConfig,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...config,
      url,
      method: 'get',
    });
  },
  post<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: HttpClientRequestConfig,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...config,
      url,
      method: 'post',
      data: body,
    });
  },
  patch<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: HttpClientRequestConfig,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...config,
      url,
      method: 'patch',
      data: body,
    });
  },
  put<TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: HttpClientRequestConfig,
  ): Promise<TResponse> {
    return request<TResponse>({
      ...config,
      url,
      method: 'put',
      data: body,
    });
  },
};

export { ensureWebCsrfSynced };
