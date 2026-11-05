import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return (
    trimmed.charAt(0).toLocaleUpperCase('pt-BR') +
    trimmed.slice(1).toLocaleLowerCase('pt-BR')
  );
}
