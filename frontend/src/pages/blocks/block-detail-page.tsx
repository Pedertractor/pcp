import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpDown,
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
  Receipt,
  Settings,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BlockLinkPaintColorsButton } from '@/components/blocks/block-link-paint-colors-dialog';
import { BlockCostCentersDialog } from '@/components/blocks/block-cost-centers-dialog';
import { BlockMapSettingsDialog } from '@/components/blocks/block-map-settings-dialog';
import {
  BlockPlanMachineEditor,
  type MachineMapToolbarActions,
} from '@/components/blocks/block-plan-machine-editor';
import { PlanZoomViewport } from '@/components/blocks/plan-zoom-viewport';
import { isMachineOnMap } from '@/lib/machine-map';
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
import { blockDetailQueryKey, getBlock } from '@/services/blocks/block.service';
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

function BlockInfoItem({ icon: Icon, label, value }: BlockInfoItemProps) {
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

function TodayBadge() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now.toLocaleDateString('sv-SE')}
      className="absolute right-3 bottom-3 z-10 inline-flex items-center gap-2 rounded-lg  border-primary bg-card px-3 py-1.5 text-sm font-semibold capitalize sm:right-4 sm:bottom-4"
    >
      <CalendarDays className="size-4 text-brand" aria-hidden />
      {todayFormatter.format(now)}
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
}: {
  block: BlockDetail;
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string | null) => void;
  mapToolbarActions: MachineMapToolbarActions | null;
  onOpenProductionOrders: () => void;
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
        title="Ver OFs do bloco"
        className={cn(
          'shrink-0 rounded-2xl border-2 border-primary bg-primary p-4 text-left transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          blockSummaryCardEnter,
        )}
      >
        <span className="flex gap-2 text-sm text-white">
          <Package className="size-4 text-white" aria-hidden />
          Produzido / planejado
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
      </button>
    </aside>
  );
}

function BlockPlanView({
  block,
  onConfigure,
  selectedMachineId,
  onToolbarActionsChange,
}: {
  block: BlockDetail;
  onConfigure: () => void;
  selectedMachineId: string | null;
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
          selectedMachineId={selectedMachineId}
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
  const { blockId = '' } = useParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [costCentersOpen, setCostCentersOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null,
  );
  const [mapToolbarActions, setMapToolbarActions] =
    useState<MachineMapToolbarActions | null>(null);

  const blockQuery = useQuery({
    queryKey: blockDetailQueryKey(blockId),
    queryFn: () => getBlock(blockId),
    enabled: blockId.length > 0,
  });

  const block = blockQuery.data;
  const goBack = () => navigate(BLOCKS_PATH);

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
    <div className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)_minmax(13rem,calc(100vw/6))] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
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

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 py-5 text-sm">
          <BlockInfoItem
            icon={Paintbrush}
            label="Setor"
            value={BLOCK_SECTOR_LABELS[block.sector]}
          />
          <BlockInfoItem
            icon={Cog}
            label="Máquinas"
            value={block.machinesCount}
          />
          <BlockInfoItem
            icon={ClipboardList}
            label="OFs"
            value={block.productionOrdersCount}
          />
        </dl>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto border-t border-border/60 pt-4">
          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Receipt className="size-4 text-muted-foreground" />
                Centros de custo
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setCostCentersOpen(true)}
              >
                <Pencil />
                Editar
              </Button>
            </div>
            <ul className="grid gap-2">
              {block.costCenters.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{item.sectorName}</span>
                  <Badge variant="outline">{item.costCenter}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {block.sector === 'PAINT' ? (
          <div className="mt-4 shrink-0 border-t border-border/60 pt-4">
            <BlockLinkPaintColorsButton block={block} prominent />
          </div>
        ) : null}
      </aside>

      <main
        className={cn(
          'relative flex min-h-[60dvh] min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-3 sm:p-4 lg:h-full lg:min-h-0',
          blockPanelFromBottom,
        )}
      >
        <span className="pointer-events-none absolute top-4 left-4 z-10 text-sm font-semibold text-brand sm:top-5 sm:left-5">
          Mapa do bloco
        </span>
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
        <div className="min-h-0 flex-1 pt-10 pb-12">
          <BlockPlanView
            block={block}
            onConfigure={() => setSettingsOpen(true)}
            selectedMachineId={selectedMachineId}
            onToolbarActionsChange={setMapToolbarActions}
          />
        </div>
        <TodayBadge />
      </main>

      <BlockMachinesColumn
        block={block}
        selectedMachineId={selectedMachineId}
        onSelectMachine={setSelectedMachineId}
        mapToolbarActions={mapToolbarActions}
        onOpenProductionOrders={() =>
          navigate(`${BLOCKS_PATH}/${block.id}/ofs`)
        }
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
