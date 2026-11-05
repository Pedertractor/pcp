import axios, { type AxiosRequestConfig } from 'axios';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export class BaseApiError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message, statusCode);
  }
}

/** Cliente HTTP da API base interna (headers nameapplication e key). */
export const baseApi = axios.create({
  baseURL: env.URL_BASE_API.replace(/\/$/, ''),
  timeout: 10000,
  headers: {
    nameapplication: env.NAME_APPLICATION,
    key: env.KEY,
  },
});

type BaseApiResult<T> = {
  status: number;
  data: T;
};

export async function getFromBaseApi<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<BaseApiResult<T>> {
  try {
    const response = await baseApi.get<T>(path, {
      ...config,
      validateStatus: (status) => status === 200 || status === 404,
    });

    return { status: response.status, data: response.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        'Base API error:',
        error.code,
        error.message,
        error.response?.status,
        error.response?.data,
      );

      throw new BaseApiError(
        'Não foi possível consultar a API base. Verifique a conexão e as variáveis URL_BASE_API, NAME_APPLICATION e KEY.',
      );
    }

    console.error('Unexpected base API error:', error);
    throw new BaseApiError('Falha inesperada ao consultar a API base.');
  }
}
