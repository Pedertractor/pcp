import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const BLOCK_PLAN_MAX_BYTES = 15 * 1024 * 1024;

export const BLOCK_PLAN_MIME_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const;

export type BlockPlanMimeType = keyof typeof BLOCK_PLAN_MIME_TYPES;

export function isBlockPlanMimeType(value: string): value is BlockPlanMimeType {
  return value in BLOCK_PLAN_MIME_TYPES;
}

const storageDir = path.resolve(process.cwd(), env.UPLOADS_DIR, 'block-plans');

function resolveStoredFile(fileName: string): string {
  const resolved = path.resolve(storageDir, fileName);
  if (path.dirname(resolved) !== storageDir) {
    throw new Error('Nome de arquivo de planta inválido');
  }
  return resolved;
}

export async function saveBlockPlanFile(
  buffer: Buffer,
  mimeType: BlockPlanMimeType,
): Promise<string> {
  await mkdir(storageDir, { recursive: true });
  const fileName = `${randomUUID()}.${BLOCK_PLAN_MIME_TYPES[mimeType]}`;
  await writeFile(resolveStoredFile(fileName), buffer);
  return fileName;
}

export async function removeBlockPlanFile(fileName: string): Promise<void> {
  await rm(resolveStoredFile(fileName), { force: true });
}

export async function openBlockPlanFile(fileName: string) {
  const filePath = resolveStoredFile(fileName);
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return { stream: createReadStream(filePath), size: fileStat.size };
}
