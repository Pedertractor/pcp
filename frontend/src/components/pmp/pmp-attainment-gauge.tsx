import { cn } from '@/lib/utils';

const PRODUCED_COLOR = '#6cc070';
const REMAINING_COLOR = '#f87171';
const LABEL_COLOR = '#18181b';

const CX = 150;
const CY = 150;
const OUTER_RADIUS = 140;
const INNER_RADIUS = 72;
const LABEL_RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;
/** Fatias menores que isso não têm espaço para o número dentro. */
const MIN_LABEL_FRACTION = 0.07;

const piecesFormatter = new Intl.NumberFormat('pt-BR');

function polar(radius: number, fraction: number) {
  const angle = Math.PI * (1 - fraction);
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function slicePath(from: number, to: number) {
  const outerStart = polar(OUTER_RADIUS, from);
  const outerEnd = polar(OUTER_RADIUS, to);
  const innerEnd = polar(INNER_RADIUS, to);
  const innerStart = polar(INNER_RADIUS, from);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

type SliceProps = {
  from: number;
  to: number;
  color: string;
  value: number;
};

function Slice({ from, to, color, value }: SliceProps) {
  if (to - from <= 0) {
    return null;
  }
  const label = polar(LABEL_RADIUS, (from + to) / 2);
  return (
    <g>
      <path d={slicePath(from, to)} fill={color} stroke="currentColor" strokeOpacity={0.15} />
      {to - from >= MIN_LABEL_FRACTION ? (
        <text
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={LABEL_COLOR}
          className="text-[15px] font-bold tabular-nums"
        >
          {piecesFormatter.format(value)}
        </text>
      ) : null}
    </g>
  );
}

type PmpAttainmentGaugeProps = {
  produced: number;
  planned: number;
  className?: string;
};

/** Meia rosca com realizado (verde) e saldo a produzir (vermelho); percentual no centro. */
export function PmpAttainmentGauge({ produced, planned, className }: PmpAttainmentGaugeProps) {
  const remaining = Math.max(planned - produced, 0);
  const fraction = planned > 0 ? Math.min(produced / planned, 1) : 0;
  const percent = planned > 0 ? Math.round((produced / planned) * 100) : 0;

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <svg
        viewBox="0 0 300 160"
        className="w-full max-w-sm"
        role="img"
        aria-label={`Realizado ${produced} de ${planned} peças (${percent}%)`}
      >
        {planned > 0 ? (
          <>
            <Slice from={0} to={fraction} color={PRODUCED_COLOR} value={produced} />
            <Slice from={fraction} to={1} color={REMAINING_COLOR} value={remaining} />
          </>
        ) : (
          <path d={slicePath(0, 1)} fill="currentColor" fillOpacity={0.12} />
        )}
        <text
          x={CX}
          y={CY - 18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          className="text-[34px] font-bold tabular-nums"
        >
          {percent}%
        </text>
      </svg>
      <div className="flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: PRODUCED_COLOR }} />
          Realizado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: REMAINING_COLOR }} />
          Saldo a produzir
        </span>
      </div>
    </div>
  );
}
