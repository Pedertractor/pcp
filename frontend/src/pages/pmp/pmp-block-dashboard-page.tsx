import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Factory,
  Gauge,
  Loader2Icon,
  Package,
  Target,
  Workflow,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { PmpAttainmentGauge } from '@/components/pmp/pmp-attainment-gauge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  addDaysToKey,
  formatIsoWeekParam,
  formatIsoWeekRange,
  formatShortDateKey,
  formatWeekdayKey,
  getIsoWeek,
  isoWeekStartKey,
  parseIsoWeekParam,
  shiftIsoWeek,
  toDateKey,
  WORKING_DAYS_PER_WEEK,
} from '@/lib/iso-week';
import { NOTCH_CUT, NotchedPanelShape } from '@/components/notched-panel-shape';
import { usePmpBlockThemeImage } from '@/hooks/pmp/use-pmp-block-theme-image';
import { cn } from '@/lib/utils';
import logoSystem from '@/public/logo-system.png';
import { getPmpBlock, pmpBlockDetailQueryKey } from '@/services/pmp/pmp-block.service';
import {
  getPmpBlockDashboard,
  pmpBlockDashboardQueryKey,
} from '@/services/pmp/pmp-goal.service';

const piecesFormatter = new Intl.NumberFormat('pt-BR');
const PLANNED_COLOR = '#94a3b8';

function localTodayKey(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** "segunda-feira" → "Segunda", para caber no eixo do gráfico. */
function shortWeekday(dateKey: string): string {
  const [weekday] = formatWeekdayKey(dateKey).split('-');
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function attainmentPercent(produced: number, planned: number): number {
  return planned > 0 ? (produced / planned) * 100 : 0;
}

/** Entrada suave ao abrir a dashboard (respeita prefers-reduced-motion via motion-safe). */
const dashboardCardEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);
const dashboardPanelFromLeft = cn(
  dashboardCardEnter,
  'motion-safe:slide-in-from-left-3 motion-safe:delay-75',
);
const dashboardPanelFromTop = cn(
  dashboardCardEnter,
  'motion-safe:slide-in-from-top-3 motion-safe:delay-100',
);
const dashboardPanelFromBottom = cn(
  dashboardCardEnter,
  'motion-safe:slide-in-from-bottom-3 motion-safe:delay-150',
);
const dashboardPanelFromRight = cn(
  dashboardCardEnter,
  'motion-safe:slide-in-from-right-4 motion-safe:zoom-in-[0.98] motion-safe:delay-200',
);
const dashboardInfoRowEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);

const dailyChartConfig = {
  plannedQuantity: { label: 'Planejado', color: PLANNED_COLOR },
  producedQuantity: { label: 'Realizado', color: '#10b981' },
} satisfies ChartConfig;

const costCenterChartConfig = {
  plannedQuantity: { label: 'Planejado', color: PLANNED_COLOR },
  producedQuantity: { label: 'Realizado', color: '#10b981' },
} satisfies ChartConfig;

export function PmpBlockDashboardPage() {
  const navigate = useNavigate();
  const { blockId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedWeek = parseIsoWeekParam(searchParams.get('semana')) ?? getIsoWeek(new Date());
  const weekParam = formatIsoWeekParam(selectedWeek);
  const weekStart = isoWeekStartKey(selectedWeek);
  const todayKey = localTodayKey();

  const dashboardQuery = useQuery({
    queryKey: pmpBlockDashboardQueryKey(blockId, weekStart),
    queryFn: () => getPmpBlockDashboard(blockId, weekStart),
    enabled: blockId.length > 0,
  });

  const blockQuery = useQuery({
    queryKey: pmpBlockDetailQueryKey(blockId),
    queryFn: () => getPmpBlock(blockId),
    enabled: blockId.length > 0,
  });
  const block = blockQuery.data;
  const themeImage = usePmpBlockThemeImage(block?.themeImage ?? null);

  const dashboard = dashboardQuery.data;
  const goBack = () => navigate(`/pmp/${blockId}?semana=${weekParam}`);
  const changeWeek = (delta: number) =>
    setSearchParams({ semana: formatIsoWeekParam(shiftIsoWeek(selectedWeek, delta)) });

  const planned = dashboard?.totals.plannedQuantity ?? 0;
  const produced = dashboard?.totals.producedQuantity ?? 0;
  const dayByDate = new Map((dashboard?.days ?? []).map((day) => [day.date, day]));
  const dailyData = Array.from({ length: WORKING_DAYS_PER_WEEK }, (_, index) => {
    const date = addDaysToKey(weekStart, index);
    const day = dayByDate.get(date);
    const dayPlanned = day?.plannedQuantity ?? 0;
    const dayProduced = day?.producedQuantity ?? 0;
    return {
      date,
      plannedQuantity: dayPlanned,
      producedQuantity: dayProduced,
      percent: attainmentPercent(dayProduced, dayPlanned),
      percentLabel: dayPlanned > 0 ? `${Math.round(attainmentPercent(dayProduced, dayPlanned))}%` : '',
    };
  });
  const costCenterData = (dashboard?.costCenters ?? []).map((item) => ({
    ...item,
    percent: attainmentPercent(item.producedQuantity, item.plannedQuantity),
  }));

  const sortedSeries = [...(block?.series ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { numeric: true }),
  );
  const seriesNames = sortedSeries.map((series) => series.name);

  const blockInfo = [
    { icon: Factory, label: 'Centros de custo', value: block?.costCenters.length ?? 0 },
    {
      icon: Workflow,
      label: 'Operações',
      value: block?.costCenters.reduce((total, cc) => total + cc.operations.length, 0) ?? 0,
    },
    ...sortedSeries.map((series) => ({
        icon: Package,
        label: `Itens da classe ${series.name}`,
        value: series.parts.length,
      })),
    { icon: Target, label: 'Metas na semana', value: dashboard?.goalsCount ?? 0 },
    { icon: Factory, label: 'Centros com meta', value: costCenterData.length },
  ].map((item) => ({ ...item, value: piecesFormatter.format(item.value) }));

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
      <header className={cn('flex items-start gap-3', dashboardCardEnter)}>
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
            Dashboard {dashboard ? `— ${dashboard.blockName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana {selectedWeek.week} ({formatIsoWeekRange(selectedWeek)})
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Semana anterior"
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Próxima semana"
            onClick={() => changeWeek(1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      {dashboardQuery.isPending ? (
        <div
          className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2Icon className="size-9 animate-spin text-brand" aria-hidden />
          <p>Carregando dashboard…</p>
        </div>
      ) : null}

      {dashboardQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{dashboardQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void dashboardQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {dashboard && dashboard.goalsCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Target className="size-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Nenhuma meta cadastrada nesta semana.</p>
            <p className="text-sm text-muted-foreground">
              Escolha outra semana ou importe as metas do PMP.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {dashboard && dashboard.goalsCount > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card
              className={cn(
                'relative bg-brand text-brand-foreground ring-0 shadow-md lg:col-span-2',
                dashboardPanelFromLeft,
              )}
            >
              <div
                className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-foreground/5"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-brand-foreground/5"
                aria-hidden
              />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <span className="inline-flex size-9 items-center justify-center rounded-lg bg-brand-foreground/10">
                    <Gauge className="size-5" aria-hidden />
                  </span>
                  Atendimento PMP
                </CardTitle>
                <CardDescription className="text-brand-foreground/70">
                  Total realizado / planejado
                </CardDescription>
              </CardHeader>
              <CardContent className="relative flex flex-col gap-4">
                <PmpAttainmentGauge produced={produced} planned={planned} />
                <div className="grid grid-cols-2 divide-x divide-brand-foreground/15 rounded-xl bg-brand-foreground/10 text-center">
                  <div className="p-3">
                    <p className="text-xs text-brand-foreground/70">Realizado</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {piecesFormatter.format(produced)}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-brand-foreground/70">Planejado</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {piecesFormatter.format(planned)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cn('lg:col-span-3', dashboardPanelFromTop)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-brand" aria-hidden />
                  Realizado × planejado por dia
                </CardTitle>
                <CardDescription>Percentual de atingimento acima de cada dia</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ChartContainer config={dailyChartConfig} className="aspect-auto h-80 w-full">
                  <BarChart data={dailyData} margin={{ top: 24, left: 4, right: 4 }} barGap={6}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      interval={0}
                      tickFormatter={(date: string) =>
                        `${date === todayKey ? 'Hoje' : shortWeekday(date)} ${formatShortDateKey(date)}`
                      }
                    />
                    <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                    <ChartTooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const date = payload?.[0]?.payload?.date as string | undefined;
                            return date
                              ? `${formatWeekdayKey(date)} · ${formatShortDateKey(date)}`
                              : '';
                          }}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="plannedQuantity"
                      fill="var(--color-plannedQuantity)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="producedQuantity"
                      fill="var(--color-producedQuantity)"
                      radius={[6, 6, 0, 0]}
                    >
                      <LabelList
                        dataKey="percentLabel"
                        position="top"
                        offset={8}
                        className="fill-foreground text-xs font-semibold"
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card className={dashboardPanelFromBottom}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="size-5 text-brand" aria-hidden />
                Peças realizadas por centro de custo
              </CardTitle>
              <CardDescription>
                Realizado × planejado de cada centro de custo na semana
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ChartContainer
                config={costCenterChartConfig}
                className="aspect-auto w-full"
                style={{ height: Math.max(260, costCenterData.length * 44) }}
              >
                <BarChart
                  data={costCenterData}
                  layout="vertical"
                  margin={{ left: 4, right: 48 }}
                  barGap={2}
                  barCategoryGap="20%"
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="costCenter"
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    className="font-mono"
                  />
                  <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as
                            | (typeof costCenterData)[number]
                            | undefined;
                          if (!item) {
                            return '';
                          }
                          return `${item.costCenter}${item.sectorName ? ` · ${item.sectorName}` : ''} (${Math.round(item.percent)}%)`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="plannedQuantity"
                    fill="var(--color-plannedQuantity)"
                    radius={[0, 4, 4, 0]}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="producedQuantity"
                    fill="var(--color-producedQuantity)"
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList
                      dataKey="producedQuantity"
                      position="right"
                      offset={6}
                      className="fill-foreground text-xs font-semibold tabular-nums"
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          </div>

          <aside
            className={cn(
              'relative flex flex-col gap-6 px-5 pt-24 pb-6 text-brand-foreground drop-shadow-sm',
              dashboardPanelFromRight,
            )}
          >
            <NotchedPanelShape corner="top-right" className="fill-brand" />
            <img
              src={logoSystem}
              alt="PCP"
              className="pointer-events-none absolute top-0 right-0 object-contain p-3.5 dark:brightness-0 dark:invert"
              style={{ width: NOTCH_CUT, height: NOTCH_CUT }}
              draggable={false}
            />
            {seriesNames.length > 0 ? (
              <div className="absolute top-4 left-5 flex flex-col">
                <span className="text-xs font-medium tracking-wide text-brand-foreground/70 uppercase">
                  Classe
                </span>
                <span className="text-4xl leading-none font-bold tracking-tight">
                  {seriesNames.join(' · ')}
                </span>
              </div>
            ) : null}
            <div className="relative flex flex-1 flex-col gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="flex aspect-square w-full max-w-56 items-center justify-center rounded-2xl p-4">
                  {themeImage.src ? (
                    <img
                      src={themeImage.src}
                      alt={`Tema do bloco ${block?.name ?? ''}`}
                      className="max-h-full max-w-full object-contain"
                      draggable={false}
                    />
                  ) : themeImage.isLoading && block?.themeImage ? (
                    <span className="size-8 animate-pulse rounded-full bg-brand-foreground/20" />
                  ) : (
                    <Boxes className="size-10 opacity-50" aria-hidden />
                  )}
                </div>
                <p className="text-lg font-semibold">{dashboard.blockName}</p>
              </div>

              <dl className="flex flex-col divide-y divide-brand-foreground/15 rounded-xl bg-brand-foreground/10 text-sm">
                {blockInfo.map((item, index) => (
                  <div
                    key={item.label}
                    className={cn('flex items-center gap-3 px-4 py-3', dashboardInfoRowEnter)}
                    style={{ animationDelay: `${250 + Math.min(index, 16) * 35}ms` }}
                  >
                    <item.icon className="size-4 shrink-0 opacity-70" aria-hidden />
                    <dt className="flex-1 text-brand-foreground/80">{item.label}</dt>
                    <dd className="font-semibold tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
