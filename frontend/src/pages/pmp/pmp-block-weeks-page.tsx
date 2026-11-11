import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2Icon,
  Package,
  Pencil,
  Plus,
  Target,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ProducedPlannedProgressBar,
  productionProgressPercent,
} from '@/components/blocks/produced-planned-progress';
import { NOTCH_CUT, NotchedPanelShape } from '@/components/notched-panel-shape';
import { PmpBlockUpsertDialog } from '@/components/pmp/pmp-block-upsert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWebSession } from '@/hooks/auth/use-web-session';
import { usePmpBlockThemeImage } from '@/hooks/pmp/use-pmp-block-theme-image';
import { canAccessUserManagement } from '@/lib/role-access';
import logoSystem from '@/public/logo-system.png';
import dashPmpImage from '@/public/pmp/dash-pmp.png';
import {
  formatIsoWeekParam,
  formatIsoWeekRange,
  getIsoWeek,
  getIsoWeekFromKey,
  isoWeeksInYear,
  isoWeekStartKey,
  parseIsoWeekParam,
  shiftIsoWeek,
  type IsoWeek,
} from '@/lib/iso-week';
import {
  getPmpBlock,
  pmpBlockDetailQueryKey,
} from '@/services/pmp/pmp-block.service';
import {
  listPmpBlockWeeks,
  listPmpWeeklyGoals,
  pmpBlockWeeksQueryKey,
  pmpWeeklyGoalsQueryKey,
} from '@/services/pmp/pmp-goal.service';

const piecesFormatter = new Intl.NumberFormat('pt-BR');

export function PmpBlockWeeksPage() {
  const navigate = useNavigate();
  const { blockId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedWeek: IsoWeek =
    parseIsoWeekParam(searchParams.get('semana')) ?? getIsoWeek(new Date());
  const weekParam = formatIsoWeekParam(selectedWeek);
  const weekStart = isoWeekStartKey(selectedWeek);

  const setWeek = (week: IsoWeek) => {
    setSearchParams({ semana: formatIsoWeekParam(week) }, { replace: true });
  };

  const { data: user } = useWebSession();
  const canManage = canAccessUserManagement(user?.role);
  const [editOpen, setEditOpen] = useState(false);

  const blockQuery = useQuery({
    queryKey: pmpBlockDetailQueryKey(blockId),
    queryFn: () => getPmpBlock(blockId),
    enabled: blockId.length > 0,
  });

  const themeImage = usePmpBlockThemeImage(blockQuery.data?.themeImage ?? null);

  const weeksQuery = useQuery({
    queryKey: pmpBlockWeeksQueryKey(blockId),
    queryFn: () => listPmpBlockWeeks(blockId),
    enabled: blockId.length > 0,
  });

  const goalsQuery = useQuery({
    queryKey: pmpWeeklyGoalsQueryKey(blockId, weekStart),
    queryFn: () => listPmpWeeklyGoals(blockId, weekStart),
    enabled: blockId.length > 0,
  });

  const goalsCountByWeekStart = useMemo(
    () =>
      new Map(
        (weeksQuery.data ?? []).map((week) => [week.weekStart, week.goalsCount]),
      ),
    [weeksQuery.data],
  );

  const weekOptions = useMemo(() => {
    const total = isoWeeksInYear(selectedWeek.year);
    return Array.from({ length: total }, (_, index) => {
      const week = { year: selectedWeek.year, week: index + 1 };
      return {
        value: formatIsoWeekParam(week),
        week,
        goalsCount: goalsCountByWeekStart.get(isoWeekStartKey(week)) ?? 0,
      };
    });
  }, [selectedWeek.year, goalsCountByWeekStart]);

  const weeksWithGoals = useMemo(
    () =>
      (weeksQuery.data ?? []).map((week) => ({
        ...week,
        isoWeek: getIsoWeekFromKey(week.weekStart),
      })),
    [weeksQuery.data],
  );

  const goals = goalsQuery.data ?? [];
  const totals = useMemo(
    () =>
      goals.reduce(
        (total, goal) => ({
          planned: total.planned + goal.plannedQuantity,
          produced: total.produced + goal.producedQuantity,
        }),
        { planned: 0, produced: 0 },
      ),
    [goals],
  );

  const openGoal = (goalId: string) =>
    navigate(`/pmp/${blockId}/metas/${goalId}?semana=${weekParam}`);

  return (
    <div className="grid min-h-dvh gap-4 bg-background p-3 sm:gap-6 sm:p-6 lg:h-dvh lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
    <div className="flex min-w-0 flex-col gap-4 lg:min-h-0">
      <header className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => navigate('/pmp')}
          aria-label="Voltar aos blocos PMP"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            Metas semanais {blockQuery.data ? `— ${blockQuery.data.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione a semana para ver a meta de cada peça.
          </p>
        </div>
        {canManage && blockQuery.data ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" />
              Editar bloco
            </Button>
            <PmpBlockUpsertDialog
              block={blockQuery.data}
              open={editOpen}
              onOpenChange={setEditOpen}
              showTrigger={false}
            />
          </>
        ) : null}
      </header>

      <div className="sticky top-0 z-20 -mx-3 flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-background lg:px-0 lg:pt-0 lg:backdrop-blur-none">
        <CalendarRange className="size-4 text-brand" aria-hidden />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Semana anterior"
          onClick={() => setWeek(shiftIsoWeek(selectedWeek, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Select
          value={weekParam}
          onValueChange={(value) => {
            const parsed = parseIsoWeekParam(value);
            if (parsed) {
              setWeek(parsed);
            }
          }}
        >
          <SelectTrigger aria-label="Semana" className="h-9 w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-80">
            {weekOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>
                    <span className="font-medium">Semana {option.week.week}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {formatIsoWeekRange(option.week)}
                    </span>
                  </span>
                  {option.goalsCount > 0 ? (
                    <span className="text-xs text-brand tabular-nums">
                      {option.goalsCount} pç
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          aria-label="Próxima semana"
          onClick={() => setWeek(shiftIsoWeek(selectedWeek, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {selectedWeek.year}
        </span>
      </div>

      {goalsQuery.isPending ? (
        <div
          className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2Icon className="size-9 animate-spin text-brand" aria-hidden />
          <p>Carregando metas da semana…</p>
        </div>
      ) : null}

      {goalsQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{goalsQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void goalsQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {goalsQuery.isSuccess ? (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <span className="flex items-center gap-1.5">
              <Package className="size-4 text-brand" aria-hidden />
              <span className="font-semibold tabular-nums">
                {piecesFormatter.format(goals.length)}
              </span>
              peças
            </span>
            <span className="flex items-center gap-1.5">
              <Target className="size-4 text-brand" aria-hidden />
              <span className="font-semibold tabular-nums">
                {piecesFormatter.format(totals.produced)} /{' '}
                {piecesFormatter.format(totals.planned)}
              </span>
              produzido / meta
              {totals.planned > 0 ? (
                <span className="text-muted-foreground">
                  ({productionProgressPercent(totals.produced, totals.planned)}%)
                </span>
              ) : null}
            </span>
            {totals.planned > 0 ? (
              <ProducedPlannedProgressBar
                className="w-48"
                produced={totals.produced}
                planned={totals.planned}
              />
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border lg:min-h-0 lg:flex-1 [&_[data-slot=table-container]]:max-h-[70dvh] [&_[data-slot=table-container]]:overflow-auto lg:[&_[data-slot=table-container]]:h-full lg:[&_[data-slot=table-container]]:max-h-none">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>CC</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead className="text-right">Meta semanal</TableHead>
                  <TableHead className="text-right">Produzido</TableHead>
                  <TableHead className="w-40">Progresso</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Nenhuma meta cadastrada para a semana {selectedWeek.week} (
                      {formatIsoWeekRange(selectedWeek)}).
                    </TableCell>
                  </TableRow>
                ) : (
                  goals.map((goal) => (
                    <TableRow
                      key={goal.id}
                      className="cursor-pointer hover:bg-muted/45"
                      title="Ver meta por dia"
                      tabIndex={0}
                      role="button"
                      onClick={() => openGoal(goal.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openGoal(goal.id);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{goal.productCode}</TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {goal.productName ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{goal.costCenter}</span>
                      </TableCell>
                      <TableCell className="font-mono">OP {goal.operation}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {piecesFormatter.format(goal.plannedQuantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {piecesFormatter.format(goal.producedQuantity)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ProducedPlannedProgressBar
                            className="flex-1"
                            produced={goal.producedQuantity}
                            planned={goal.plannedQuantity}
                          />
                          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                            {productionProgressPercent(
                              goal.producedQuantity,
                              goal.plannedQuantity,
                            )}
                            %
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {goal.daysCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>

      <aside className="lg:h-full lg:min-h-0">
        <button
          type="button"
          onClick={() => navigate(`/pmp/${blockId}/dashboard?semana=${weekParam}`)}
          className="group relative flex h-full min-h-80 w-full flex-col items-center justify-center gap-8 rounded-2xl p-6 text-zinc-50 drop-shadow-sm transition-all hover:-translate-y-0.5 hover:drop-shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none xl:p-8"
        >
          <NotchedPanelShape corner="bottom-right" className="fill-zinc-500" />
          <img
            src={logoSystem}
            alt="PCP"
            className="pointer-events-none absolute right-0 bottom-0 object-contain p-3.5 dark:brightness-0 dark:invert"
            style={{ width: NOTCH_CUT, height: NOTCH_CUT }}
            draggable={false}
          />
          <span className="relative flex w-full items-center justify-center gap-3 xl:gap-4">
            <span className="flex aspect-square min-w-0 flex-1 items-center justify-center">
              <img
                src={dashPmpImage}
                alt=""
                className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                draggable={false}
              />
            </span>

            <Plus className="size-7 shrink-0" strokeWidth={2.5} aria-hidden />

            <span className="flex aspect-square min-w-0 flex-1 items-center justify-center">
              {themeImage.src ? (
                <img
                  src={themeImage.src}
                  alt=""
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
              ) : themeImage.isLoading && blockQuery.data?.themeImage ? (
                <span className="size-8 animate-pulse rounded-full bg-zinc-50/20" />
              ) : (
                <Boxes className="size-10 opacity-50" aria-hidden />
              )}
            </span>
          </span>

          <span className="relative flex flex-col items-center gap-2 text-center">
            <span className="text-3xl font-bold tracking-tight">Dashboard</span>
            <span className="text-sm opacity-70">
              {blockQuery.data
                ? `Indicadores do bloco ${blockQuery.data.name}`
                : 'Indicadores do bloco'}
            </span>
          </span>

          <span className="relative inline-flex h-11 items-center gap-2 rounded-full bg-zinc-100 px-6 text-sm font-medium text-zinc-900">
            Acessar dashboard
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </aside>
    </div>
  );
}
