import type { FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

function cookieBaseOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: env.cookieSecure,
    signed: false,
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
) {
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieBaseOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
  });

  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieBaseOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  const options = cookieBaseOptions();
  reply.clearCookie(ACCESS_COOKIE, options);
  reply.clearCookie(REFRESH_COOKIE, options);
  reply.clearCookie('_csrf', {
    ...options,
    signed: true,
  });
}
