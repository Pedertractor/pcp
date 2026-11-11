import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Hourglass,
  Loader2Icon,
  MinusCircle,
  PlusCircle,
  Target,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  ProducedPlannedProgressBar,
  productionProgressPercent,
} from '@/components/blocks/produced-planned-progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  addDaysToKey,
  formatIsoWeekRange,
  formatShortDateKey,
  formatWeekdayKey,
  getIsoWeekFromKey,
  toDateKey,
  WORKING_DAYS_PER_WEEK,
} from '@/lib/iso-week';
import { cn } from '@/lib/utils';
import logoSystem from '@/public/logo-system.png';
import {
  getPmpWeeklyGoal,
  pmpWeeklyGoalDetailQueryKey,
} from '@/services/pmp/pmp-goal.service';
import type { PmpDailyGoal } from '@/types/pmp-goal';

const piecesFormatter = new Intl.NumberFormat('pt-BR');
const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

function localTodayKey(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

type DayTone = 'today' | 'done' | 'late' | 'upcoming' | 'empty';

const tonePanelClass: Record<DayTone, string> = {
  today: 'bg-zinc-900 text-white',
  late: 'bg-zinc-700 text-white',
  done: 'bg-zinc-500 text-white',
  upcoming: 'bg-zinc-300 text-zinc-900',
  empty: 'bg-zinc-100 text-zinc-500',
};

const toneSwatchClass: Record<DayTone, string> = {
  today: 'bg-zinc-900',
  late: 'bg-zinc-700',
  done: 'bg-zinc-500',
  upcoming: 'bg-zinc-300',
  empty: 'bg-zinc-100',
};

const toneDetailClass: Record<DayTone, string> = {
  today: 'text-foreground',
  late: 'text-foreground',
  done: 'text-foreground',
  upcoming: 'text-foreground',
  empty: 'text-muted-foreground',
};

function dayTone(dateKey: string, todayKey: string, day: PmpDailyGoal | null): DayTone {
  const planned = day?.plannedQuantity ?? 0;
  if (!day || planned === 0) {
    return 'empty';
  }
  if (day.producedQuantity >= planned) {
    return 'done';
  }
  if (dateKey === todayKey) {
    return 'today';
  }
  return dateKey < todayKey ? 'late' : 'upcoming';
}

function PmpDayStatusLegend() {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-x-5 gap-y-2">
      <LegendTag swatchClassName={toneSwatchClass.today} label="Hoje" />
      <LegendTag swatchClassName={toneSwatchClass.upcoming} label="Próximo" />
      <LegendTag swatchClassName={toneSwatchClass.late} label="Atrasado" />
      <LegendTag swatchClassName={toneSwatchClass.done} label="Meta atingida" />
      <LegendTag swatchClassName={cn(toneSwatchClass.empty, 'opacity-50')} label="Sem meta" />
    </div>
  );
}

function LegendTag({ label, swatchClassName }: { label: string; swatchClassName: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
      {label}
      <span
        className={cn('size-4 shrink-0 rounded-sm border-2 border-foreground/40', swatchClassName)}
        aria-hidden
      />
    </span>
  );
}

function DayStatusMark({ tone }: { tone: DayTone }) {
  if (tone === 'done') {
    return (
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
        aria-label="Meta atingida"
        title="Meta atingida"
      >
        <Check className="size-4" />
      </span>
    );
  }
  if (tone === 'late') {
    return (
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
        aria-label="Meta atrasada"
        title="Meta atrasada"
      >
        <AlertTriangle className="size-4" />
      </span>
    );
  }
  if (tone === 'today') {
    return (
      <Hourglass
        className="size-5 shrink-0 animate-pulse text-foreground"
        aria-label="Em produção hoje"
      />
    );
  }
  return null;
}

type PmpDayCalendarCellProps = {
  dateKey: string;
  day: PmpDailyGoal | null;
  todayKey: string;
};

function PmpDayCalendarCell({ dateKey, day, todayKey }: PmpDayCalendarCellProps) {
  const isToday = dateKey === todayKey;
  const planned = day?.plannedQuantity ?? 0;
  const produced = day?.producedQuantity ?? 0;
  const tone = dayTone(dateKey, todayKey, day);
  const weekday = formatWeekdayKey(dateKey).replace('-feira', '');
  const dayNumber = dateKey.slice(8, 10);
  const monthLabel = monthShortFormatter
    .format(new Date(`${dateKey}T00:00:00.000Z`))
    .replace('.', '');

  return (
    <article
      className={cn(
        'relative flex h-full min-h-[19.5rem] flex-col overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-border/60',
        isToday && 'ring-2 ring-zinc-900 dark:ring-zinc-300',
        tone === 'empty' && 'opacity-50',
      )}
      aria-current={isToday ? 'date' : undefined}
    >
      <div
        className={cn(
          'flex min-h-0 flex-1 items-center gap-3 rounded-b-2xl px-3 py-3',
          tonePanelClass[tone],
        )}
      >
        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-background leading-none text-foreground ring-1 ring-white/40">
          <span className="text-base font-bold tabular-nums">{dayNumber}</span>
          <span className="text-[10px] font-medium uppercase text-muted-foreground">
            {monthLabel}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide uppercase opacity-75">
            {isToday ? 'Hoje' : 'Dia'}
          </p>
          <p className="truncate text-sm font-semibold capitalize leading-snug">{weekday}</p>
          <p className="truncate text-xs tabular-nums opacity-85">
            {formatShortDateKey(dateKey)}
          </p>
        </div>
      </div>

      {day ? (
        <div className={cn('flex shrink-0 flex-col gap-3 px-3 pt-3 pb-4', toneDetailClass[tone])}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wide uppercase opacity-70">
                Meta do dia
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {piecesFormatter.format(planned)}
                <span className="ml-1 text-sm font-medium opacity-70">pç</span>
              </p>
            </div>
            <DayStatusMark tone={tone} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="opacity-70">Produzido</span>
              <span className="font-semibold tabular-nums">
                {piecesFormatter.format(produced)}
                <span className="ml-1 font-normal opacity-70">
                  ({productionProgressPercent(produced, planned)}%)
                </span>
              </span>
            </div>
            <ProducedPlannedProgressBar produced={produced} planned={planned} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className="rounded-md bg-muted/60 px-2 py-1.5"
              title="Excedente deste dia abatido do último dia produtivo"
            >
              <p className="flex items-center gap-1 text-muted-foreground">
                <PlusCircle className="size-3" aria-hidden />
                Antecipado
              </p>
              <p
                className={cn(
                  'font-semibold tabular-nums',
                  day.anticipatedQuantity > 0 ? 'text-brand' : 'text-muted-foreground',
                )}
              >
                {day.anticipatedQuantity > 0
                  ? `+${piecesFormatter.format(day.anticipatedQuantity)}`
                  : '—'}
              </p>
            </div>
            <div
              className="rounded-md bg-muted/60 px-2 py-1.5"
              title="Meta reduzida por antecipações de outros dias"
            >
              <p className="flex items-center gap-1 text-muted-foreground">
                <MinusCircle className="size-3" aria-hidden />
                Abatido
              </p>
              <p
                className={cn(
                  'font-semibold tabular-nums',
                  day.deductedQuantity > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                {day.deductedQuantity > 0
                  ? `−${piecesFormatter.format(day.deductedQuantity)}`
                  : '—'}
              </p>
            </div>
          </div>

          <div className="mt-auto border-t border-current/10 pt-2">
            <p className="mb-1 text-[11px] font-semibold tracking-wide uppercase opacity-70">
              OFs
            </p>
            {day.orders.length === 0 ? (
              <p className="text-xs opacity-80">Nenhuma OF alocada</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {day.orders.map((order) => (
                  <Badge
                    key={order.id}
                    variant="outline"
                    className="font-mono text-[11px] tabular-nums"
                    title={`OP ${order.operation}: produzido / alocado`}
                  >
                    {order.externalOrderId} · {piecesFormatter.format(order.producedQuantity)}/
                    {piecesFormatter.format(order.allocatedQuantity)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-3 pt-3 pb-4 text-muted-foreground">
          <p className="text-[11px] font-semibold tracking-wide uppercase opacity-70">
            Meta do dia
          </p>
          <p className="text-sm font-semibold">Sem meta</p>
        </div>
      )}
    </article>
  );
}

export function PmpWeeklyGoalDaysPage() {
  const navigate = useNavigate();
  const { blockId = '', goalId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const weekParam = searchParams.get('semana');

  const goalQuery = useQuery({
    queryKey: pmpWeeklyGoalDetailQueryKey(blockId, goalId),
    queryFn: () => getPmpWeeklyGoal(blockId, goalId),
    enabled: blockId.length > 0 && goalId.length > 0,
  });

  const goal = goalQuery.data;
  const isoWeek = goal ? getIsoWeekFromKey(goal.weekStart) : null;
  const todayKey = localTodayKey();

  const goBack = () =>
    navigate(`/pmp/${blockId}${weekParam ? `?semana=${weekParam}` : ''}`);

  const dailyPlannedTotal =
    goal?.dailyGoals.reduce((total, day) => total + day.plannedQuantity, 0) ?? 0;

  const weekDayKeys = goal
    ? Array.from({ length: WORKING_DAYS_PER_WEEK }, (_, index) =>
        addDaysToKey(goal.weekStart, index),
      )
    : [];
  const dailyGoalByDate = new Map(
    (goal?.dailyGoals ?? []).map((day) => [day.date, day]),
  );

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
      <header className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={goBack}
          aria-label="Voltar às metas da semana"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {goal ? `Peça ${goal.productCode}` : 'Meta por dia'}
          </h1>
          {goal && isoWeek ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {goal.blockName} · Semana {isoWeek.week} ({formatIsoWeekRange(isoWeek)})
              {goal.productName ? ` · ${goal.productName}` : ''}
            </p>
          ) : null}
        </div>
        <img
          src={logoSystem}
          alt="Logo do sistema"
          className="size-12 shrink-0 object-contain dark:brightness-0 dark:invert"
        />
      </header>

      {goalQuery.isPending ? (
        <div
          className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2Icon className="size-9 animate-spin text-brand" aria-hidden />
          <p>Carregando meta…</p>
        </div>
      ) : null}

      {goalQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{goalQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void goalQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {goal ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Centro de custo / operação
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="font-mono text-brand">{goal.costCenter}</span>
                <Badge variant="outline" className="font-mono">
                  OP {goal.operation}
                </Badge>
              </p>
              {goal.sectorName ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {goal.sectorName}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Target className="size-3.5 text-brand" aria-hidden />
                Meta semanal
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {piecesFormatter.format(goal.plannedQuantity)} pç
              </p>
              {dailyPlannedTotal !== goal.plannedQuantity ? (
                <p className="text-xs text-muted-foreground">
                  Soma das metas diárias: {piecesFormatter.format(dailyPlannedTotal)} pç
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border-2 border-primary bg-primary p-4 text-primary-foreground">
              <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
                Produzido na semana
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {piecesFormatter.format(goal.producedQuantity)} /{' '}
                {piecesFormatter.format(goal.plannedQuantity)} pç
                <span className="ml-1 text-base font-semibold text-primary-foreground/80">
                  ({productionProgressPercent(goal.producedQuantity, goal.plannedQuantity)}%)
                </span>
              </p>
              <ProducedPlannedProgressBar
                variant="on-primary"
                className="mt-2"
                produced={goal.producedQuantity}
                planned={goal.plannedQuantity}
              />
            </div>
          </div>

          {goal.dailyGoals.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-14 text-center text-sm text-muted-foreground">
              Meta semanal ainda não distribuída por dia.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <PmpDayStatusLegend />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                {weekDayKeys.map((dateKey) => (
                  <PmpDayCalendarCell
                    key={dateKey}
                    dateKey={dateKey}
                    day={dailyGoalByDate.get(dateKey) ?? null}
                    todayKey={todayKey}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
