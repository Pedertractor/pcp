import { useQuery } from '@tanstack/react-query';
import { Boxes, Loader2Icon } from 'lucide-react';

import { BlockCard } from '@/components/blocks/block-card';
import { CreateBlockDialog } from '@/components/blocks/create-block-dialog';
import { cn } from '@/lib/utils';
import { blocksListQueryKey, listBlocks } from '@/services/blocks/block.service';

/** Entrada suave ao abrir a lista (respeita prefers-reduced-motion via motion-safe). */
const blocksPageEnter = cn(
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out motion-safe:fill-mode-both motion-reduce:animate-none',
);

const blocksPageHeaderRow = cn(
  blocksPageEnter,
  'motion-safe:slide-in-from-bottom-3',
);

const blocksPageMain = cn(
  blocksPageEnter,
  'motion-safe:slide-in-from-bottom-2 motion-safe:delay-100',
);

const CARD_STAGGER_DELAYS = [
  'motion-safe:delay-75',
  'motion-safe:delay-100',
  'motion-safe:delay-150',
  'motion-safe:delay-200',
  'motion-safe:delay-250',
] as const;

export function BlocksPage() {
  const blocksQuery = useQuery({
    queryKey: blocksListQueryKey,
    queryFn: listBlocks,
  });

  const blocks = blocksQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
          blocksPageHeaderRow,
        )}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Controle Produtivo por bloco
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione um bloco para acompanhar a produção.
          </p>
        </div>
        <CreateBlockDialog />
      </div>

      {blocksQuery.isLoading ? (
        <p
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground',
            blocksPageMain,
          )}
        >
          <Loader2Icon className="size-4 animate-spin" />
          Carregando blocos…
        </p>
      ) : null}

      {blocksQuery.isError ? (
        <p className={cn('text-sm text-destructive', blocksPageMain)}>
          {blocksQuery.error.message}
        </p>
      ) : null}

      {blocksQuery.isSuccess && blocks.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center',
            blocksPageMain,
          )}
        >
          <Boxes className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum bloco cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Crie o primeiro bloco com os centros de custo que ele acompanha.
          </p>
        </div>
      ) : null}

      {blocks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={cn(
                blocksPageEnter,
                'motion-safe:slide-in-from-bottom-2 motion-safe:zoom-in-[0.98]',
                CARD_STAGGER_DELAYS[index % CARD_STAGGER_DELAYS.length],
              )}
            >
              <BlockCard block={block} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
