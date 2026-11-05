const DURATION_MULTIPLIERS = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
} as const;

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);

  if (!match) {
    throw new Error(`Duração inválida: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as keyof typeof DURATION_MULTIPLIERS;

  return amount * DURATION_MULTIPLIERS[unit];
}
