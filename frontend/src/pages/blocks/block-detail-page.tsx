import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  CalendarDays,
  Check,
  ClipboardList,
  Cog,
  ImageOff,
  ImageUp,
  Loader2Icon,
  MapPin,
  MapPinOff,
  Package,
  Paintbrush,
  Pencil,
  Plus,
  Receipt,
  Rows3,
  Settings,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BlockLinkPaintColorsButton } from '@/components/blocks/block-link-paint-colors-dialog';
import { BlockCostCentersDialog } from '@/components/blocks/block-cost-centers-dialog';
import { BlockCreateLineDialog } from '@/components/blocks/block-create-line-dialog';
import { LineLabelAnchorPicker } from '@/components/blocks/line-label-anchor-picker';
import { BlockLinesDialog } from '@/components/blocks/block-lines-dialog';
import { BlockMapSettingsDialog } from '@/components/blocks/block-map-settings-dialog';
import {
  BlockPlanMachineEditor,
  type MachineMapToolbarActions,
} from '@/components/blocks/block-plan-machine-editor';
import { PlanZoomViewport } from '@/components/blocks/plan-zoom-viewport';
import { isLineOnMap, isMachineOnMap } from '@/lib/machine-map';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBlockPlanImage } from '@/hooks/blocks/use-block-plan-image';
import {
  blockDetailQueryKey,
  blockProductionOrdersQueryKey,
  getBlock,
  listBlockProductionOrders,
} from '@/services/blocks/block.service';
import { BLOCK_SECTOR_LABELS, type BlockDetail } from '@/types/block';
import { cn } from '@/lib/utils';

const BLOCKS_PATH = '/controle-produtivo';

/** Entrada suave ao abrir o bloco (respeita prefers-reduced-motion via motion-safe). */
const blockCardEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both',
);

const blockPanelFromLeft = cn(
  blockCardEnter,
  'motion-safe:slide-in-from-left-3 motion-safe:delay-75',
);
const blockPanelFromBottom = cn(
  blockCardEnter,
  'motion-safe:slide-in-from-bottom-3 motion-safe:delay-150',
);
const blockPanelFromRight = cn(
  blockCardEnter,
  'motion-safe:slide-in-from-right-3 motion-safe:delay-100',
);

const blockMachineRowEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);

const blockSummaryCardEnter = cn(
  blockCardEnter,
  'motion-safe:slide-in-from-right-4 motion-safe:zoom-in-[0.98] motion-safe:delay-200',
);

type BlockInfoItemProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
};

function BlockInfoItem({
  icon: Icon,
  label,
  value,
  compact = false,
}: BlockInfoItemProps & { compact?: boolean }) {
  if (compact) {
    return (
      <div className="min-w-0 text-center">
        <dt className="flex items-center justify-center gap-1 text-[10px] leading-none text-muted-foreground">
          <Icon className="size-3 shrink-0 text-brand" aria-hidden />
          {label}
        </dt>
        <dd className="mt-1 truncate text-xs font-semibold tabular-nums">{value}</dd>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="truncate font-medium">{value}</dd>
      </div>
    </div>
  );
}

const todayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function MapDateTab() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now.toLocaleDateString('sv-SE')}
      className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize sm:text-sm"
    >
      <CalendarDays className="size-3.5 shrink-0 text-brand sm:size-4" aria-hidden />
      <span className="whitespace-nowrap">{todayFormatter.format(now)}</span>
    </time>
  );
}

const piecesFormatter = new Intl.NumberFormat('pt-BR');
const areaFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type BlockMachineItem = BlockDetail['machines'][number];

type MachineSort =
  | 'code-asc'
  | 'code-desc'
  | 'pieces-desc'
  | 'pieces-asc'
  | 'on-map-first'
  | 'off-map-first';

const MACHINE_SORT_OPTIONS: { value: MachineSort; label: string }[] = [
  { value: 'code-asc', label: 'Código (crescente)' },
  { value: 'code-desc', label: 'Código (decrescente)' },
  { value: 'pieces-desc', label: 'Mais peças hoje' },
  { value: 'pieces-asc', label: 'Menos peças hoje' },
  { value: 'on-map-first', label: 'No mapa primeiro' },
  { value: 'off-map-first', label: 'Sem posição primeiro' },
];

function byCode(a: BlockMachineItem, b: BlockMachineItem) {
  return a.code.localeCompare(b.code, 'pt-BR', { numeric: true });
}

function onMapRank(machine: BlockMachineItem) {
  return isMachineOnMap(machine) ? 0 : 1;
}

const MACHINE_SORTERS: Record<
  MachineSort,
  (a: BlockMachineItem, b: BlockMachineItem) => number
> = {
  'code-asc': byCode,
  'code-desc': (a, b) => byCode(b, a),
  'pieces-desc': (a, b) =>
    b.expectedPiecesToday - a.expectedPiecesToday || byCode(a, b),
  'pieces-asc': (a, b) =>
    a.expectedPiecesToday - b.expectedPiecesToday || byCode(a, b),
  'on-map-first': (a, b) => onMapRank(a) - onMapRank(b) || byCode(a, b),
  'off-map-first': (a, b) => onMapRank(b) - onMapRank(a) || byCode(a, b),
};

function MachineMapActionsBelow({
  machine,
  mapToolbarActions,
}: {
  machine: BlockDetail['machines'][number];
  mapToolbarActions: MachineMapToolbarActions | null;
}) {
  const onMap = isMachineOnMap(machine);
  const mapMode =
    mapToolbarActions?.mapMode ?? (onMap ? 'idle' : 'draw');

  if (!mapToolbarActions) {
    return (
      <p className="text-xs text-muted-foreground">Carregando controles…</p>
    );
  }

  return (
    <div className="space-y-2">
      {mapMode === 'draw' ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Clique e arraste sobre a planta para desenhar a área (como no mapa de
          setores).
        </p>
      ) : mapMode === 'resize' ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Arraste as alças no mapa ou use o menu do botão direito na área.
        </p>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">
          Desenhe a área ou redimensione a posição já salva.
        </p>
      )}
      {mapToolbarActions.draftRect ? (
        <p className="text-xs tabular-nums text-muted-foreground">
          Área: {mapToolbarActions.draftRect.width.toFixed(1)}% ×{' '}
          {mapToolbarActions.draftRect.height.toFixed(1)}%
        </p>
      ) : null}
      {mapToolbarActions.onMachineLabelAnchorChange &&
      mapToolbarActions.machineLabelAnchor ? (
        <LineLabelAnchorPicker
          value={mapToolbarActions.machineLabelAnchor}
          disabled={mapToolbarActions.isPending}
          onChange={mapToolbarActions.onMachineLabelAnchorChange}
        />
      ) : null}
      <div className="flex w-full flex-col gap-1.5">
        <Button
          type="button"
          variant={mapToolbarActions.mapMode === 'draw' ? 'default' : 'outline'}
          size="sm"
          className="w-full"
          title="Desenhar área"
          disabled={
            mapToolbarActions.isPending ||
            mapToolbarActions.mapMode === 'resize'
          }
          onClick={mapToolbarActions.onStartDraw}
        >
          <span className="truncate">Desenhar área</span>
        </Button>
        <Button
          type="button"
          variant={
            mapToolbarActions.mapMode === 'resize' ? 'default' : 'outline'
          }
          size="sm"
          className="w-full"
          title="Redimensionar"
          disabled={
            mapToolbarActions.isPending ||
            mapToolbarActions.mapMode === 'draw' ||
            !onMap
          }
          onClick={mapToolbarActions.onStartResize}
        >
          <Pencil />
          <span className="truncate">Redimensionar</span>
        </Button>
        {mapToolbarActions.mapMode !== 'idle' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            title="Cancelar"
            disabled={mapToolbarActions.isPending}
            onClick={mapToolbarActions.onCancelEdit}
          >
            <span className="truncate">Cancelar</span>
          </Button>
        ) : null}
        {mapToolbarActions.canRemove ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            title="Remover"
            disabled={mapToolbarActions.isPending}
            onClick={mapToolbarActions.onRemove}
          >
            <Trash2 />
            <span className="truncate">Remover</span>
          </Button>
        ) : null}
        {mapToolbarActions.canConclude ? (
          <Button
            type="button"
            size="sm"
            className="w-full"
            title="Concluir posição"
            disabled={mapToolbarActions.isPending}
            onClick={mapToolbarActions.onConclude}
          >
            <Check />
            <span className="truncate">Concluir posição</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function BlockMachinesColumn({
  block,
  selectedMachineId,
  onSelectMachine,
  mapToolbarActions,
  onOpenProductionOrders,
  navigatingToProductionOrders,
}: {
  block: BlockDetail;
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string | null) => void;
  mapToolbarActions: MachineMapToolbarActions | null;
  onOpenProductionOrders: () => void;
  navigatingToProductionOrders: boolean;
}) {
  const [sortBy, setSortBy] = useState<MachineSort>('code-asc');
  const machines = useMemo(
    () => [...block.machines].sort(MACHINE_SORTERS[sortBy]),
    [block.machines, sortBy],
  );

  return (
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-3 lg:h-full">
      <section
        className={cn(
          'flex min-h-64 flex-1 flex-col rounded-2xl border border-border/60 bg-card p-4 lg:min-h-0',
          blockPanelFromRight,
        )}
      >
        <h2 className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Cog className="size-4 text-brand" />
            Máquinas
          </span>
          <span className="text-muted-foreground">{machines.length}</span>
        </h2>

        {machines.length > 0 ? (
          <div className="flex items-center gap-2 pt-3">
            <ArrowUpDown
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as MachineSort)}
            >
              <SelectTrigger aria-label="Ordenar máquinas" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[110]">
                {MACHINE_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {machines.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">
            Nenhuma máquina ainda. Elas são criadas pela sincronização das OFs.
          </p>
        ) : (
          <ul className="-mr-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pt-3 pr-2">
            {machines.map((machine, index) => {
              const selected = machine.id === selectedMachineId;
              const onMap = isMachineOnMap(machine);
              return (
                <li
                  key={machine.id}
                  className={cn(
                    blockMachineRowEnter,
                    selected &&
                      'rounded-lg border border-primary/30 bg-primary/5 p-1',
                  )}
                  style={{
                    animationDelay:
                      index > 0 ? `${Math.min(index, 16) * 35}ms` : undefined,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSelectMachine(selected ? null : machine.id)
                    }
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selected
                        ? 'bg-primary/15 ring-1 ring-primary'
                        : 'bg-muted hover:bg-muted/80',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {onMap ? (
                          <MapPin
                            className="size-3.5 shrink-0 text-brand"
                            aria-label="Com posição no mapa"
                          />
                        ) : (
                          <MapPinOff
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Sem posição no mapa"
                          />
                        )}
                        <span className="truncate">{machine.code}</span>
                      </p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end text-xs tabular-nums">
                      <span
                        className="font-semibold"
                        title="Peças: produzidas hoje / esperadas (processos finalizados hoje)"
                      >
                        {piecesFormatter.format(machine.producedPiecesToday)} /{' '}
                        {piecesFormatter.format(machine.expectedPiecesToday)} pç
                      </span>
                      <span
                        className="text-muted-foreground"
                        title="m²: produzido hoje / esperado (área × qtd. do processo ou da OF)"
                      >
                        {areaFormatter.format(machine.producedAreaToday)} /{' '}
                        {areaFormatter.format(machine.expectedAreaToday)} m²
                      </span>
                    </span>
                  </button>
                  {selected ? (
                    <div
                      className="mt-2 space-y-2 border-t border-primary/20 px-2 pb-2 pt-2"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <MachineMapActionsBelow
                        machine={machine}
                        mapToolbarActions={mapToolbarActions}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={onOpenProductionOrders}
        disabled={navigatingToProductionOrders}
        aria-busy={navigatingToProductionOrders}
        title="Ver OFs do bloco"
        className={cn(
          'group shrink-0 flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-primary p-4 text-left transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-90',
          blockSummaryCardEnter,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex gap-2 text-sm text-white">
            <Package className="size-4 shrink-0 text-white" aria-hidden />
            Produzido / planejado (hoje)
          </span>
          <span
            className="mt-2 block text-2xl font-bold leading-tight tracking-tight tabular-nums text-white sm:text-3xl"
            title="Peças: apontadas em processos finalizados hoje / planejamento atual do bloco"
          >
            {piecesFormatter.format(block.producedPiecesToday)} /{' '}
            {piecesFormatter.format(block.expectedPiecesToday)} pç
          </span>
          <span
            className="mt-1 block text-base font-semibold tabular-nums text-white/90 sm:text-lg"
            title="m²: soma (m² por peça × qtd. do processo) para processos finalizados hoje / esperado do planejamento"
          >
            {areaFormatter.format(block.producedAreaToday)} /{' '}
            {areaFormatter.format(block.expectedAreaToday)} m²
          </span>
        </span>
        {navigatingToProductionOrders ? (
          <Loader2Icon
            className="size-6 shrink-0 animate-spin text-white"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="size-6 shrink-0 text-white/95 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        )}
      </button>
    </aside>
  );
}

function BlockPlanView({
  block,
  onConfigure,
  selectedMachineId,
  selectedLineId,
  onToolbarActionsChange,
}: {
  block: BlockDetail;
  onConfigure: () => void;
  selectedMachineId: string | null;
  selectedLineId: string | null;
  onToolbarActionsChange: (actions: MachineMapToolbarActions | null) => void;
}) {
  const planImage = useBlockPlanImage(block.blockPlanImage);

  if (!block.blockPlanImage) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ImageOff className="size-6" />
        </div>
        <div>
          <p className="font-medium">Planta do bloco</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie a imagem da planta para montar o mapa das máquinas.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onConfigure}>
          <ImageUp />
          Adicionar planta
        </Button>
      </div>
    );
  }

  if (planImage.src) {
    return (
      <PlanZoomViewport>
        <BlockPlanMachineEditor
          block={block}
          imageSrc={planImage.src}
          selectedMachineId={selectedLineId ? null : selectedMachineId}
          selectedLineId={selectedLineId}
          onToolbarActionsChange={onToolbarActionsChange}
        />
      </PlanZoomViewport>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      {planImage.isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar a planta.
        </p>
      ) : (
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

export function BlockDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { blockId = '' } = useParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigatingToProductionOrders, setNavigatingToProductionOrders] =
    useState(false);
  const [costCentersOpen, setCostCentersOpen] = useState(false);
  const [linesOpen, setLinesOpen] = useState(false);
  const [createLineOpen, setCreateLineOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null,
  );
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [mapToolbarActions, setMapToolbarActions] =
    useState<MachineMapToolbarActions | null>(null);

  const blockQuery = useQuery({
    queryKey: blockDetailQueryKey(blockId),
    queryFn: () => getBlock(blockId),
    enabled: blockId.length > 0,
  });

  const block = blockQuery.data;
  const goBack = () => navigate(BLOCKS_PATH);

  const openProductionOrders = useCallback(() => {
    if (!block || navigatingToProductionOrders) {
      return;
    }
    setNavigatingToProductionOrders(true);
    void queryClient.prefetchQuery({
      queryKey: blockProductionOrdersQueryKey(block.id),
      queryFn: () => listBlockProductionOrders(block.id),
    });
    startTransition(() => {
      navigate(`${BLOCKS_PATH}/${block.id}/ofs`);
    });
  }, [block, navigate, navigatingToProductionOrders, queryClient]);

  if (blockQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blockQuery.isError || !block) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-sm text-destructive">
          {blockQuery.error?.message ?? 'Não foi possível carregar o bloco.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={goBack}>
            Voltar aos blocos
          </Button>
          <Button type="button" onClick={() => void blockQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)_minmax(17rem,calc(100vw/4.8))] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      <aside
        className={cn(
          'flex min-h-0 min-w-0 shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-4 sm:p-5 lg:h-full',
          blockPanelFromLeft,
        )}
      >
        <header className="flex items-start gap-3 border-b border-border/60 pb-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={goBack}
            aria-label="Voltar aos blocos"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {block.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Controle produtivo por bloco
            </p>
          </div>
        </header>

        <div className="shrink-0 space-y-2 border-b border-border/60 py-3">
          <dl className="grid grid-cols-4 gap-1">
            <BlockInfoItem
              compact
              icon={Paintbrush}
              label="Setor"
              value={BLOCK_SECTOR_LABELS[block.sector]}
            />
            <BlockInfoItem
              compact
              icon={Cog}
              label="Máquinas"
              value={block.machinesCount}
            />
            <BlockInfoItem
              compact
              icon={Rows3}
              label="Linhas"
              value={block.lines?.length ?? 0}
            />
            <BlockInfoItem
              compact
              icon={ClipboardList}
              label="OFs"
              value={block.productionOrdersCount}
            />
          </dl>

          <div className="flex items-start gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5">
            <Receipt
              className="mt-0.5 size-3 shrink-0 text-brand"
              aria-hidden
            />
            <div className="min-h-0 min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Centros de custo
              </p>
              <ul className="mt-1 max-h-14 space-y-0.5 overflow-y-auto">
                {block.costCenters.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 text-[11px] leading-tight"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {item.sectorName}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-4 shrink-0 px-1 py-0 text-[10px] tabular-nums"
                    >
                      {item.costCenter}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              aria-label="Editar centros de custo"
              onClick={() => setCostCentersOpen(true)}
            >
              <Pencil className="size-3" />
            </Button>
          </div>
        </div>

        <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-3">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-medium">
              <Rows3 className="size-3.5 text-muted-foreground" />
              Linhas de produção
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setLinesOpen(true)}
            >
              <Pencil className="size-3.5" />
              Editar
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full shrink-0"
            onClick={() => {
              if (!block.blockPlanImage) {
                setSettingsOpen(true);
                return;
              }
              setCreateLineOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova linha
          </Button>
          <ul className="-mr-1 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {(block.lines ?? []).length === 0 ? (
              <li className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhuma linha. Clique em Nova linha para começar.
              </li>
            ) : (
              (block.lines ?? []).map((line) => (
                <li key={line.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      selectedLineId === line.id
                        ? 'bg-primary/15 font-semibold ring-1 ring-primary/35'
                        : 'bg-muted/70 hover:bg-muted',
                    )}
                    onClick={() => {
                      setSelectedMachineId(null);
                      setSelectedLineId(line.id);
                    }}
                  >
                    <span className="min-w-0 truncate">{line.code}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {line.machineIds.length} máq.
                      </span>
                      {isLineOnMap(line) ? (
                        <MapPin
                          className="size-3.5 text-brand"
                          aria-label="Com área no mapa"
                        />
                      ) : (
                        <MapPinOff
                          className="size-3.5 opacity-60"
                          aria-label="Sem área no mapa"
                        />
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        {block.sector === 'PAINT' ? (
          <div className="mt-4 shrink-0 border-t border-border/60 pt-4">
            <BlockLinkPaintColorsButton block={block} prominent />
          </div>
        ) : null}
      </aside>

      <main
        className={cn(
          'relative flex min-h-[60dvh] min-w-0 flex-col lg:h-full lg:min-h-0',
          blockPanelFromBottom,
        )}
      >
        {/* Aba (“dedo”): a borda sobe, vira à direita e fecha no canto do card. */}
        <div className="relative z-10 flex shrink-0 justify-end">
          <div className="relative mb-[-1px] rounded-t-2xl border border-b-0 border-border/60 bg-card px-3 py-2 sm:px-4 bg-primary">
            <MapDateTab />
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl rounded-tr-none border border-border/60 bg-card p-3 sm:p-4">
          <span className="pointer-events-none absolute top-3 left-3 z-10 text-sm font-semibold text-brand sm:top-4 sm:left-4">
            Mapa do bloco
          </span>
          {selectedLineId ? (
            <div
              className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-brand/40 bg-card/95 px-3 py-1 text-xs font-medium shadow-sm sm:top-4"
            >
              Mapeando linha{' '}
              {(block.lines ?? []).find((line) => line.id === selectedLineId)?.code ??
                '…'}
              <Button
                type="button"
                variant="link"
                className="ml-2 h-auto p-0 text-xs"
                onClick={() => setSelectedLineId(null)}
              >
                Cancelar
              </Button>
            </div>
          ) : null}
          <div className="absolute top-2 right-2 z-10 sm:top-3 sm:right-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Configurar mapa"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configurar mapa</TooltipContent>
            </Tooltip>
          </div>
          <div className="min-h-0 flex-1 pt-9">
            <BlockPlanView
              block={block}
              onConfigure={() => setSettingsOpen(true)}
              selectedMachineId={selectedMachineId}
              selectedLineId={selectedLineId}
              onToolbarActionsChange={setMapToolbarActions}
            />
          </div>
          {selectedLineId && mapToolbarActions ? (
            <div className="flex flex-col gap-3 border-t border-border/60 p-3 sm:flex-row sm:flex-wrap sm:items-end">
              {mapToolbarActions.onLineLabelAnchorChange &&
              mapToolbarActions.lineLabelAnchor ? (
                <LineLabelAnchorPicker
                  className="w-full sm:w-auto sm:min-w-[11rem]"
                  value={mapToolbarActions.lineLabelAnchor}
                  disabled={mapToolbarActions.isPending}
                  onChange={mapToolbarActions.onLineLabelAnchorChange}
                />
              ) : null}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    mapToolbarActions.mapMode === 'draw' ? 'default' : 'outline'
                  }
                  onClick={mapToolbarActions.onStartDraw}
                >
                  Desenhar área
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    !mapToolbarActions.canConclude || mapToolbarActions.isPending
                  }
                  onClick={mapToolbarActions.onConclude}
                >
                  Salvar no mapa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    !mapToolbarActions.canRemove || mapToolbarActions.isPending
                  }
                  onClick={mapToolbarActions.onRemove}
                >
                  Remover do mapa
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      <BlockMachinesColumn
        block={block}
        selectedMachineId={selectedLineId ? null : selectedMachineId}
        onSelectMachine={(id) => {
          setSelectedLineId(null);
          setSelectedMachineId(id);
        }}
        mapToolbarActions={selectedLineId ? null : mapToolbarActions}
        navigatingToProductionOrders={navigatingToProductionOrders}
        onOpenProductionOrders={openProductionOrders}
      />

      <BlockCreateLineDialog
        block={block}
        open={createLineOpen}
        onOpenChange={setCreateLineOpen}
        onStartMapping={(lineId) => {
          setSelectedMachineId(null);
          setSelectedLineId(lineId);
        }}
      />

      <BlockLinesDialog
        block={block}
        open={linesOpen}
        onOpenChange={setLinesOpen}
        onMapLine={(lineId) => {
          setSelectedMachineId(null);
          setSelectedLineId(lineId);
        }}
        onLineDeleted={(lineId) => {
          if (selectedLineId === lineId) {
            setSelectedLineId(null);
          }
        }}
      />

      <BlockMapSettingsDialog
        block={block}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      <BlockCostCentersDialog
        block={block}
        open={costCentersOpen}
        onOpenChange={setCostCentersOpen}
      />
    </div>
  );
}
