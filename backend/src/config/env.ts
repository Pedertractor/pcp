import 'dotenv/config';
import { z } from 'zod';
import { parseDurationToSeconds } from './duration.js';

const durationSchema = z.string().regex(/^\d+[smhd]$/);

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(9091),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  JWT_SECRET: z.string().min(16),
  COOKIE_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5174'),
  ACCESS_TOKEN_TTL: durationSchema.default('15m'),
  REFRESH_TOKEN_TTL: durationSchema.default('7d'),
  URL_BASE_API: z.string().min(1),
  NAME_APPLICATION: z.string().min(1),
  KEY: z.string().min(1),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Variáveis de ambiente inválidas',
    z.treeifyError(parsed.error),
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  cookieSecure:
    parsed.data.COOKIE_SECURE !== undefined
      ? parsed.data.COOKIE_SECURE === 'true'
      : parsed.data.NODE_ENV === 'production',
  ACCESS_TOKEN_TTL_SECONDS: parseDurationToSeconds(
    parsed.data.ACCESS_TOKEN_TTL,
  ),
  REFRESH_TOKEN_TTL_SECONDS: parseDurationToSeconds(
    parsed.data.REFRESH_TOKEN_TTL,
  ),
};
