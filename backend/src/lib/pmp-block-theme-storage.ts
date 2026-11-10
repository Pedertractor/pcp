import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const PMP_BLOCK_THEME_MAX_BYTES = 15 * 1024 * 1024;

/** Apenas formatos com suporte a transparência. */
export const PMP_BLOCK_THEME_MIME_TYPES = {
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type PmpBlockThemeMimeType = keyof typeof PMP_BLOCK_THEME_MIME_TYPES;

export function isPmpBlockThemeMimeType(
  value: string,
): value is PmpBlockThemeMimeType {
  return value in PMP_BLOCK_THEME_MIME_TYPES;
}

const storageDir = path.resolve(
  process.cwd(),
  env.UPLOADS_DIR,
  'pmp-block-themes',
);

function resolveStoredFile(fileName: string): string {
  const resolved = path.resolve(storageDir, fileName);
  if (path.dirname(resolved) !== storageDir) {
    throw new Error('Nome de arquivo de imagem temática inválido');
  }
  return resolved;
}

export async function savePmpBlockThemeFile(
  buffer: Buffer,
  mimeType: PmpBlockThemeMimeType,
): Promise<string> {
  await mkdir(storageDir, { recursive: true });
  const fileName = `${randomUUID()}.${PMP_BLOCK_THEME_MIME_TYPES[mimeType]}`;
  await writeFile(resolveStoredFile(fileName), buffer);
  return fileName;
}

export async function removePmpBlockThemeFile(fileName: string): Promise<void> {
  await rm(resolveStoredFile(fileName), { force: true });
}

export async function openPmpBlockThemeFile(fileName: string) {
  const filePath = resolveStoredFile(fileName);
  const fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return { stream: createReadStream(filePath), size: fileStat.size };
}
