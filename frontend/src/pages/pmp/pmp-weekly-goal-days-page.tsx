import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
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
import {
  getPmpWeeklyGoal,
  pmpWeeklyGoalDetailQueryKey,
} from '@/services/pmp/pmp-goal.service';
import type { PmpDailyGoal } from '@/types/pmp-goal';

const piecesFormatter = new Intl.NumberFormat('pt-BR');

function localTodayKey(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

type PmpDayCalendarCellProps = {
  dateKey: string;
  day: PmpDailyGoal | null;
  todayKey: string;
};

function PmpDayCalendarCell({ dateKey, day, todayKey }: PmpDayCalendarCellProps) {
  const isToday = dateKey === todayKey;
  const isPast = dateKey < todayKey;
  const planned = day?.plannedQuantity ?? 0;
  const produced = day?.producedQuantity ?? 0;
  const isDone = planned > 0 && produced >= planned;
  const isLate = isPast && planned > 0 && !isDone;
  const weekday = formatWeekdayKey(dateKey).replace('-feira', '');

  return (
    <article
      className={cn(
        'flex min-h-64 flex-col overflow-hidden rounded-xl border bg-card transition-shadow',
        isToday && 'border-primary shadow-md ring-1 ring-primary',
        !day && 'bg-muted/30',
        isDone && !isToday && 'border-emerald-500/50',
        isLate && !isToday && 'border-amber-500/50',
      )}
      aria-current={isToday ? 'date' : undefined}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-2 border-b px-3 py-2',
          isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50',
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold capitalize">{weekday}</p>
          <p
            className={cn(
              'text-xs tabular-nums',
              isToday ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {formatShortDateKey(dateKey)}
          </p>
        </div>
        {isToday ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            Hoje
          </Badge>
        ) : isDone ? (
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Meta atingida" />
        ) : null}
      </header>

      {day ? (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Meta do dia
            </p>
            <p className="text-2xl font-bold tabular-nums">
              {piecesFormatter.format(planned)}
              <span className="ml-1 text-sm font-medium text-muted-foreground">pç</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Produzido</span>
              <span className="font-semibold tabular-nums">
                {piecesFormatter.format(produced)}
                <span className="ml-1 font-normal text-muted-foreground">
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

          <div className="mt-auto border-t pt-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              OFs
            </p>
            {day.orders.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma OF alocada</p>
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
        <div className="flex flex-1 items-center justify-center p-3 text-xs text-muted-foreground">
          Sem meta
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
          )}
        </>
      ) : null}
    </div>
  );
}
