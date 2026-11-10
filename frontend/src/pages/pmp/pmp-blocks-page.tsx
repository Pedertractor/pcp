import { useQuery } from '@tanstack/react-query';
import { ChartGantt, Loader2Icon } from 'lucide-react';

import { PmpBlockCard } from '@/components/pmp/pmp-block-card';
import { PmpBlockUpsertDialog } from '@/components/pmp/pmp-block-upsert-dialog';
import { cn } from '@/lib/utils';
import { pmpBlocksListQueryKey, listPmpBlocks } from '@/services/pmp/pmp-block.service';

const pmpPageEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);

const CARD_STAGGER_DELAYS = [
  'motion-safe:delay-75',
  'motion-safe:delay-100',
  'motion-safe:delay-150',
  'motion-safe:delay-200',
] as const;

export function PmpBlocksPage() {
  const blocksQuery = useQuery({
    queryKey: pmpBlocksListQueryKey,
    queryFn: listPmpBlocks,
  });

  const blocks = blocksQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
          pmpPageEnter,
          'motion-safe:slide-in-from-bottom-3',
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Plano Mestre de Produção
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Blocos com centros de custo e operações para metas semanais.
          </p>
        </div>
        <PmpBlockUpsertDialog />
      </div>

      {blocksQuery.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Carregando blocos PMP…
        </p>
      ) : null}

      {blocksQuery.isError ? (
        <p className="text-sm text-destructive">{blocksQuery.error.message}</p>
      ) : null}

      {blocksQuery.isSuccess && blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <ChartGantt className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum bloco PMP</p>
          <p className="text-sm text-muted-foreground">
            Crie um bloco e vincule os centros de custo da API base.
          </p>
        </div>
      ) : null}

      {blocks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={cn(
                pmpPageEnter,
                'motion-safe:slide-in-from-bottom-2 motion-safe:zoom-in-[0.98]',
                CARD_STAGGER_DELAYS[index % CARD_STAGGER_DELAYS.length],
              )}
            >
              <PmpBlockCard block={block} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
