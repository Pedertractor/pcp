import { cn } from '@/lib/utils';

export function productionProgressPercent(produced: number, planned: number) {
  if (planned <= 0) {
    return produced > 0 ? 100 : 0;
  }
  return Math.round((produced / planned) * 100);
}

function productionBarFillPercent(produced: number, planned: number) {
  if (planned <= 0) {
    return produced > 0 ? 100 : 0;
  }
  return Math.min(100, (produced / planned) * 100);
}

export function ProducedPlannedProgressBar({
  produced,
  planned,
  variant = 'default',
  className,
}: {
  produced: number;
  planned: number;
  variant?: 'default' | 'on-primary';
  className?: string;
}) {
  const percent = productionProgressPercent(produced, planned);
  const width = productionBarFillPercent(produced, planned);
  const complete = planned > 0 && produced >= planned;
  const inProgress = produced > 0 && !complete;

  return (
    <div
      className={cn(
        'h-1.5 overflow-hidden rounded-full',
        variant === 'on-primary' ? 'bg-white/25' : 'bg-muted',
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% do planejado`}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-300 ease-out',
          variant === 'on-primary'
            ? complete
              ? 'bg-white'
              : inProgress
                ? 'bg-white/95'
                : 'bg-white/35'
            : complete
              ? 'bg-brand'
              : inProgress
                ? 'bg-primary'
                : 'bg-muted-foreground/35',
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
