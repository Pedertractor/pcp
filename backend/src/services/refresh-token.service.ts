import { randomBytes, randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { hashToken } from '../utils/token-hash.js';

type TokenStore = PrismaClient | Prisma.TransactionClient;

export class RefreshTokenService {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(userId: number): Promise<{
    refreshToken: string;
    familyId: string;
  }> {
    const familyId = randomUUID();
    const refreshToken = await this.insertToken(userId, familyId);
    return { refreshToken, familyId };
  }

  async rotate(rawToken: string): Promise<{
    userId: number;
    familyId: string;
    refreshToken: string;
  }> {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new AppError('Token inválido ou expirado', 401);
    }

    if (existing.expiresAt < new Date()) {
      await this.revokeFamily(existing.familyId);
      throw new AppError('Token inválido ou expirado', 401);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: existing.userId, deletedAt: null },
    });

    if (!user || !user.status) {
      await this.revokeFamily(existing.familyId);
      throw new AppError('Token inválido ou expirado', 401);
    }

    const refreshToken = await this.prisma.$transaction(async (tx) => {
      const created = await this.insertTokenWithClient(
        tx,
        existing.userId,
        existing.familyId,
      );

      await tx.refreshToken.update({
        where: { id: existing.id },
        data: {
          revokedAt: new Date(),
          replacedById: created.id,
        },
      });

      return created.rawToken;
    });

    return {
      userId: existing.userId,
      familyId: existing.familyId,
      refreshToken,
    };
  }

  async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamilyByRawToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      return;
    }

    await this.revokeFamily(existing.familyId);
  }

  async revokeAllForUser(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async insertToken(userId: number, familyId: string) {
    const created = await this.insertTokenWithClient(
      this.prisma,
      userId,
      familyId,
    );
    return created.rawToken;
  }

  private async insertTokenWithClient(
    client: TokenStore,
    userId: number,
    familyId: string,
  ): Promise<{ id: string; rawToken: string }> {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000,
    );

    const created = await client.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    return { id: created.id, rawToken };
  }
}
