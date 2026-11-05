import { useQuery } from '@tanstack/react-query';
import { Boxes, Loader2Icon } from 'lucide-react';

import { BlockCard } from '@/components/blocks/block-card';
import { CreateBlockDialog } from '@/components/blocks/create-block-dialog';
import { blocksListQueryKey, listBlocks } from '@/services/blocks/block.service';

export function BlocksPage() {
  const blocksQuery = useQuery({
    queryKey: blocksListQueryKey,
    queryFn: listBlocks,
  });

  const blocks = blocksQuery.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Carregando blocos…
        </p>
      ) : null}

      {blocksQuery.isError ? (
        <p className="text-sm text-destructive">{blocksQuery.error.message}</p>
      ) : null}

      {blocksQuery.isSuccess && blocks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
          <Boxes className="size-8 text-muted-foreground" />
          <p className="font-medium">Nenhum bloco cadastrado</p>
          <p className="text-sm text-muted-foreground">
            Crie o primeiro bloco com os centros de custo que ele acompanha.
          </p>
        </div>
      ) : null}

      {blocks.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
