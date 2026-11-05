import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Cog,
  ImageOff,
  ImageUp,
  Loader2Icon,
  Package,
  Paintbrush,
  Pencil,
  Receipt,
  Rows3,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BlockCostCentersDialog } from '@/components/blocks/block-cost-centers-dialog';
import { BlockMapSettingsDialog } from '@/components/blocks/block-map-settings-dialog';
import { PlanZoomViewport } from '@/components/blocks/plan-zoom-viewport';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBlockPlanImage } from '@/hooks/blocks/use-block-plan-image';
import { blockDetailQueryKey, getBlock } from '@/services/blocks/block.service';
import { BLOCK_SECTOR_LABELS, type BlockDetail } from '@/types/block';

const BLOCKS_PATH = '/controle-produtivo';

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
      className="absolute right-3 bottom-3 z-10 inline-flex items-center gap-2 rounded-lg border-2 border-primary bg-card px-3 py-1.5 text-sm font-semibold capitalize sm:right-4 sm:bottom-4"
    >
      <CalendarDays className="size-4 text-brand" aria-hidden />
      {todayFormatter.format(now)}
    </time>
  );
}

const piecesFormatter = new Intl.NumberFormat('pt-BR');

function BlockMachinesColumn({ block }: { block: BlockDetail }) {
  const machines = block.lines.flatMap((line) =>
    line.machines.map((machine) => ({ ...machine, lineCode: line.code })),
  );

  return (
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col gap-3 lg:h-full">
      <section className="flex min-h-64 flex-1 flex-col rounded-2xl border border-border/60 bg-card p-4 lg:min-h-0">
        <h2 className="flex items-center justify-between gap-2 border-b border-border/60 pb-3 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Cog className="size-4 text-brand" />
            Máquinas
          </span>
          <span className="text-muted-foreground">{machines.length}</span>
        </h2>

        {machines.length === 0 ? (
          <p className="pt-3 text-sm text-muted-foreground">
            Nenhuma máquina ainda. Elas são criadas pela sincronização das OFs.
          </p>
        ) : (
          <ul className="-mr-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pt-3 pr-2">
            {machines.map((machine) => (
              <li
                key={machine.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{machine.code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Linha {machine.lineCode}
                  </p>
                </div>
                <span
                  className="shrink-0 text-xs font-semibold tabular-nums"
                  title="Peças esperadas hoje"
                >
                  {piecesFormatter.format(machine.expectedPiecesToday)} pç
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="shrink-0 rounded-2xl border-2 border-primary bg-card p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="size-4 text-brand" aria-hidden />
          Peças esperadas hoje
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
          {piecesFormatter.format(block.expectedPiecesToday)}
        </p>
      </section>
    </aside>
  );
}

function BlockPlanView({
  block,
  onConfigure,
}: {
  block: BlockDetail;
  onConfigure: () => void;
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
        <img
          src={planImage.src}
          alt={`Planta do ${block.name}`}
          className="size-full object-contain"
          draggable={false}
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
      <aside className="flex min-h-0 min-w-0 shrink-0 flex-col rounded-2xl border border-border/60 bg-card p-4 sm:p-5 lg:h-full">
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
          <BlockInfoItem icon={Rows3} label="Linhas" value={block.linesCount} />
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

          <section className="grid gap-3">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Rows3 className="size-4 text-muted-foreground" />
              Linhas
            </h2>
            {block.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                As linhas e máquinas serão criadas pela sincronização das OFs.
              </p>
            ) : (
              <ul className="grid gap-2">
                {block.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{line.code}</span>
                    <span className="text-muted-foreground">
                      {line.machines.length} máquinas
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>

      <main className="relative flex min-h-[60dvh] min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-3 sm:p-4 lg:h-full lg:min-h-0">
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
          />
        </div>
        <TodayBadge />
      </main>

      <BlockMachinesColumn block={block} />

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
