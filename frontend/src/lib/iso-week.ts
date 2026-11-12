export type IsoWeek = { year: number; week: number };

/** Semanas do PMP vão de segunda a sexta. */
export const WORKING_DAYS_PER_WEEK = 5;
/** Sábado (dia extra) a partir da segunda-feira da semana. */
export const EXTRA_DAY_OFFSET = 5;

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function dateKeyToUtc(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return utcDate(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToKey(key: string, days: number): string {
  const date = dateKeyToUtc(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function getIsoWeek(date: Date): IsoWeek {
  const target = utcDate(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = utcDate(target.getUTCFullYear(), 0, 1);
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return { year: target.getUTCFullYear(), week };
}

export function getIsoWeekFromKey(key: string): IsoWeek {
  const date = dateKeyToUtc(key);
  return getIsoWeek(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Segunda-feira da semana ISO, como chave AAAA-MM-DD. */
export function isoWeekStartKey({ year, week }: IsoWeek): string {
  const jan4 = utcDate(year, 0, 4);
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = utcDate(year, 0, 4 - jan4Day + 1 + (week - 1) * 7);
  return toDateKey(monday);
}

export function isoWeeksInYear(year: number): number {
  return getIsoWeek(new Date(year, 11, 28)).week;
}

export function shiftIsoWeek(value: IsoWeek, delta: number): IsoWeek {
  return getIsoWeekFromKey(addDaysToKey(isoWeekStartKey(value), delta * 7));
}

export function formatIsoWeekParam({ year, week }: IsoWeek): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function parseIsoWeekParam(value: string | null): IsoWeek | null {
  const match = value?.match(/^(\d{4})-W(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > isoWeeksInYear(year)) {
    return null;
  }
  return { year, week };
}

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  timeZone: 'UTC',
});

export function formatShortDateKey(key: string): string {
  return shortDateFormatter.format(dateKeyToUtc(key));
}

export function formatWeekdayKey(key: string): string {
  return weekdayFormatter.format(dateKeyToUtc(key));
}

export function formatIsoWeekRange(value: IsoWeek): string {
  const start = isoWeekStartKey(value);
  return `${formatShortDateKey(start)} – ${formatShortDateKey(addDaysToKey(start, WORKING_DAYS_PER_WEEK - 1))}`;
}
