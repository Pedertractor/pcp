import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Check,
  Clock,
  Eye,
  Hourglass,
  Loader2Icon,
  MinusCircle,
  PlusCircle,
  Target,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  ProducedPlannedProgressBar,
  productionProgressPercent,
} from '@/components/blocks/produced-planned-progress';
import { PmpExtraDayDialog } from '@/components/pmp/pmp-extra-day-dialog';
import { PmpPartDetailsDialog } from '@/components/pmp/pmp-part-details-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  addDaysToKey,
  EXTRA_DAY_OFFSET,
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
  closePmpExtraDay,
  getPmpWeeklyGoal,
  pmpWeeklyGoalDetailQueryKey,
} from '@/services/pmp/pmp-goal.service';
import type { PmpDailyGoal } from '@/types/pmp-goal';

const piecesFormatter = new Intl.NumberFormat('pt-BR');
const monthShortFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

const goalPageEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);
const goalHeaderEnter = cn(goalPageEnter, 'motion-safe:slide-in-from-top-3');
const goalCardEnter = cn(
  goalPageEnter,
  'motion-safe:slide-in-from-bottom-3 motion-safe:zoom-in-[0.98]',
);
const SUMMARY_CARD_DELAYS = [
  'motion-safe:delay-75',
  'motion-safe:delay-150',
  'motion-safe:delay-200',
] as const;
const DAY_CARD_BASE_DELAY_MS = 250;
const DAY_CARD_STAGGER_MS = 70;

function localTodayKey(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

type DayTone = 'today' | 'done' | 'late' | 'upcoming' | 'empty';

const toneCellClass: Record<DayTone, string> = {
  today: 'bg-white text-zinc-950 dark:bg-zinc-50',
  late: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400',
  done: 'bg-emerald-50 dark:bg-emerald-500/10',
  upcoming: 'bg-muted/30',
  empty: 'bg-muted/40',
};

const toneStripClass: Record<DayTone, string> = {
  today: 'bg-zinc-900 dark:bg-zinc-300',
  late: 'bg-zinc-300 dark:bg-zinc-600',
  done: 'bg-emerald-500',
  upcoming: 'bg-border',
  empty: 'bg-border',
};

const toneFillClass: Record<DayTone, string> = {
  today: 'bg-zinc-900',
  late: 'bg-zinc-400',
  done: 'bg-emerald-500',
  upcoming: 'bg-muted-foreground/50',
  empty: 'bg-muted-foreground/35',
};

const toneGoalClass: Record<DayTone, string> = {
  today: 'text-zinc-950',
  late: 'text-zinc-500 dark:text-zinc-400',
  done: 'text-emerald-700 dark:text-emerald-300',
  upcoming: 'text-foreground',
  empty: 'text-muted-foreground',
};

const toneStatus: Record<
  Exclude<DayTone, 'empty'>,
  { label: string; legend: string; icon: LucideIcon; className: string }
> = {
  today: {
    label: 'Em produção hoje',
    legend: 'Hoje',
    icon: Hourglass,
    className: 'bg-white text-zinc-900 ring-1 ring-zinc-300 shadow-sm',
  },
  upcoming: {
    label: 'Próximo dia',
    legend: 'Próximo',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  late: {
    label: 'Meta não atingida',
    legend: 'Não atingida',
    icon: X,
    className: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300',
  },
  done: {
    label: 'Meta atingida',
    legend: 'Meta atingida',
    icon: Check,
    className: 'bg-emerald-500 text-white',
  },
};

const LEGEND_TONES = ['today', 'upcoming', 'late', 'done'] as const;

const monthYearFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function weekMonthLabel(startKey: string, endKey: string): string {
  const start = monthYearFormatter.format(new Date(`${startKey}T00:00:00.000Z`));
  const end = monthYearFormatter.format(new Date(`${endKey}T00:00:00.000Z`));
  if (start === end) {
    return start;
  }
  return `${start.replace(/ de \d{4}$/, '')} – ${end}`;
}

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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {LEGEND_TONES.map((tone) => (
        <span
          key={tone}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
        >
          <DayStatusMark tone={tone} size="sm" />
          {toneStatus[tone].legend}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span className="size-5 rounded-full bg-muted" aria-hidden />
        Sem meta
      </span>
    </div>
  );
}

function DayStatusMark({ tone, size = 'md' }: { tone: DayTone; size?: 'sm' | 'md' }) {
  if (tone === 'empty') {
    return null;
  }
  const { label, icon: Icon, className } = toneStatus[tone];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        size === 'sm' ? 'size-5' : 'size-10',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Icon
        className={cn(size === 'sm' ? 'size-3' : 'size-5', tone === 'today' && 'animate-pulse')}
        strokeWidth={2.5}
      />
    </span>
  );
}

type PmpDayCalendarCellProps = {
  dateKey: string;
  day: PmpDailyGoal | null;
  todayKey: string;
  isExtraDay?: boolean;
};

function PmpDayCalendarCell({
  dateKey,
  day,
  todayKey,
  isExtraDay = false,
}: PmpDayCalendarCellProps) {
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
        'relative flex h-full min-h-[24rem] flex-col transition-opacity',
        toneCellClass[tone],
        isToday && 'z-10 shadow-xl ring-2 ring-zinc-900 ring-inset dark:ring-zinc-300',
        tone === 'empty' && 'opacity-50',
        tone === 'late' && 'opacity-60 hover:opacity-100',
      )}
      aria-current={isToday ? 'date' : undefined}
    >
      <div className={cn('h-1.5 shrink-0', toneStripClass[tone])} aria-hidden />

      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium opacity-70">
          <span className="capitalize md:hidden">
            {weekday}
            {isExtraDay ? ' (extra)' : ''} ·
          </span>
          <span className="tabular-nums">
            {dayNumber} {monthLabel}
          </span>
          {isToday ? (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
              Hoje
            </span>
          ) : null}
        </p>
        <DayStatusMark tone={tone} />
      </div>

      {day ? (
        <div className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-4">
          <div className="py-2 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase opacity-60">
              Meta do dia
            </p>
            <p
              className={cn(
                'mt-1 text-6xl leading-none font-extrabold tracking-tight tabular-nums xl:text-7xl',
                toneGoalClass[tone],
              )}
            >
              {piecesFormatter.format(planned)}
            </p>
            <p className="mt-1 text-sm font-medium opacity-60">peças</p>
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
            <ProducedPlannedProgressBar
              produced={produced}
              planned={planned}
              className="h-2"
              fillClassName={toneFillClass[tone]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div
              className="rounded-md bg-background/70 px-2 py-1.5 ring-1 ring-border/50"
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
              className="rounded-md bg-background/70 px-2 py-1.5 ring-1 ring-border/50"
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

          <div className="mt-auto border-t border-border/60 pt-3">
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
        <div className="flex flex-1 items-center justify-center px-4 pb-6 text-sm font-medium text-muted-foreground">
          Sem meta
        </div>
      )}
    </article>
  );
}

type PmpWeekCalendarProps = {
  dayKeys: string[];
  dailyGoalByDate: Map<string, PmpDailyGoal>;
  todayKey: string;
  weekNumber: number;
  extraDayKey: string;
  actions?: ReactNode;
};

function PmpWeekCalendar({
  dayKeys,
  dailyGoalByDate,
  todayKey,
  weekNumber,
  extraDayKey,
  actions,
}: PmpWeekCalendarProps) {
  const firstKey = dayKeys[0] ?? todayKey;
  const lastKey = dayKeys[dayKeys.length - 1] ?? todayKey;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm',
        goalCardEnter,
        'motion-safe:delay-200',
      )}
      aria-label="Calendário da semana"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-bold tracking-tight capitalize sm:text-3xl">
              {weekMonthLabel(firstKey, lastKey)}
            </p>
            <p className="text-sm text-muted-foreground">
              Semana {weekNumber} · {formatShortDateKey(firstKey)} a {formatShortDateKey(lastKey)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          {actions}
          <PmpDayStatusLegend />
        </div>
      </header>

      <div
        className="hidden border-b border-border/70 bg-muted/40 md:grid"
        style={{ gridTemplateColumns: `repeat(${dayKeys.length}, minmax(0, 1fr))` }}
      >
        {dayKeys.map((dateKey) => (
          <p
            key={dateKey}
            className={cn(
              'border-r border-border/70 px-4 py-2.5 text-xs font-semibold tracking-widest uppercase last:border-r-0',
              dateKey === todayKey ? 'font-bold text-foreground' : 'text-muted-foreground',
            )}
          >
            {formatWeekdayKey(dateKey).replace('-feira', '')}
            {dateKey === extraDayKey ? (
              <span className="ml-1.5 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] tracking-wide text-brand">
                Extra
              </span>
            ) : null}
          </p>
        ))}
      </div>

      <div
        className="grid grid-cols-1 divide-y divide-border/70 md:divide-x md:divide-y-0 md:[grid-template-columns:var(--calendar-cols)]"
        style={{ '--calendar-cols': `repeat(${dayKeys.length}, minmax(0, 1fr))` } as CSSProperties}
      >
        {dayKeys.map((dateKey, index) => (
          <div
            key={dateKey}
            className={goalPageEnter}
            style={{
              animationDelay: `${DAY_CARD_BASE_DELAY_MS + index * DAY_CARD_STAGGER_MS}ms`,
            }}
          >
            <PmpDayCalendarCell
              dateKey={dateKey}
              day={dailyGoalByDate.get(dateKey) ?? null}
              todayKey={todayKey}
              isExtraDay={dateKey === extraDayKey}
            />
          </div>
        ))}
      </div>
    </section>
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
  const [partDetailsOpen, setPartDetailsOpen] = useState(false);
  const isoWeek = goal ? getIsoWeekFromKey(goal.weekStart) : null;
  const todayKey = localTodayKey();

  const goBack = () =>
    navigate(`/pmp/${blockId}${weekParam ? `?semana=${weekParam}` : ''}`);

  const dailyGoalByDate = new Map(
    (goal?.dailyGoals ?? []).map((day) => [day.date, day]),
  );
  const saturdayKey = goal ? addDaysToKey(goal.weekStart, EXTRA_DAY_OFFSET) : '';
  const fridayKey = goal ? addDaysToKey(goal.weekStart, WORKING_DAYS_PER_WEEK - 1) : '';
  const saturday = dailyGoalByDate.get(saturdayKey) ?? null;
  const isCurrentWeek = goal ? todayKey >= goal.weekStart && todayKey <= saturdayKey : false;
  const canCloseSaturday =
    saturday !== null &&
    todayKey <= fridayKey &&
    saturday.producedQuantity === 0 &&
    saturday.orders.length === 0;

  const weekDayKeys = goal
    ? [
        ...Array.from({ length: WORKING_DAYS_PER_WEEK }, (_, index) =>
          addDaysToKey(goal.weekStart, index),
        ),
        ...(saturday ? [saturdayKey] : []),
      ]
    : [];

  const [extraDayOpen, setExtraDayOpen] = useState(false);
  const queryClient = useQueryClient();
  const closeSaturdayMutation = useMutation({
    mutationFn: () => closePmpExtraDay(blockId, goalId),
    onSuccess: (updated) => {
      queryClient.setQueryData(pmpWeeklyGoalDetailQueryKey(blockId, goalId), updated);
      void queryClient.invalidateQueries({ queryKey: ['pmp', 'blocks', blockId] });
      toast.success('Sábado fechado: saldo devolvido aos dias úteis.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const extraDayActions = !isCurrentWeek ? null : saturday ? (
    <div className="flex items-center gap-2">
      <Badge className="gap-1 bg-brand/15 text-brand hover:bg-brand/15">
        <CalendarPlus className="size-3.5" aria-hidden />
        Sábado aberto
      </Badge>
      {canCloseSaturday ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={closeSaturdayMutation.isPending}
          onClick={() => closeSaturdayMutation.mutate()}
        >
          {closeSaturdayMutation.isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CalendarX className="size-4" />
          )}
          Fechar sábado
        </Button>
      ) : null}
    </div>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={() => setExtraDayOpen(true)}>
      <CalendarPlus className="size-4" />
      Abrir sábado
    </Button>
  );

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
      <header className={cn('flex items-start gap-3', goalHeaderEnter)}>
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
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {goal ? `Peça ${goal.productCode}` : 'Meta por dia'}
            </h1>
            {goal ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`Ver detalhes da peça ${goal.productCode}`}
                title="Ver detalhes da peça"
                onClick={() => setPartDetailsOpen(true)}
              >
                <Eye className="size-4" />
              </Button>
            ) : null}
          </div>
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

      {goal ? (
        <PmpPartDetailsDialog
          blockId={blockId}
          goalId={goalId}
          productCode={goal.productCode}
          productName={goal.productName}
          open={partDetailsOpen}
          onOpenChange={setPartDetailsOpen}
        />
      ) : null}

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
            <div
              className={cn(
                'rounded-xl border border-border/60 bg-card p-4',
                goalCardEnter,
                SUMMARY_CARD_DELAYS[0],
              )}
            >
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
            <div
              className={cn(
                'rounded-xl border border-border/60 bg-card p-4',
                goalCardEnter,
                SUMMARY_CARD_DELAYS[1],
              )}
            >
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Target className="size-3.5 text-brand" aria-hidden />
                Meta semanal
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {piecesFormatter.format(goal.plannedQuantity)} pç
              </p>
              <p className="text-xs text-muted-foreground">
                Saldo a produzir:{' '}
                {piecesFormatter.format(
                  Math.max(0, goal.plannedQuantity - goal.producedQuantity),
                )}{' '}
                pç
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border-2 border-primary bg-primary p-4 text-primary-foreground',
                goalCardEnter,
                SUMMARY_CARD_DELAYS[2],
              )}
            >
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
            <PmpWeekCalendar
              dayKeys={weekDayKeys}
              dailyGoalByDate={dailyGoalByDate}
              todayKey={todayKey}
              weekNumber={isoWeek?.week ?? 0}
              extraDayKey={saturdayKey}
              actions={extraDayActions}
            />
          )}

          {isCurrentWeek && !saturday ? (
            <PmpExtraDayDialog
              blockId={blockId}
              goal={goal}
              todayKey={todayKey}
              open={extraDayOpen}
              onOpenChange={setExtraDayOpen}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
