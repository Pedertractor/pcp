import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, Receipt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SectorPicker } from '@/components/blocks/sector-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  blockDetailQueryKey,
  blocksListQueryKey,
  updateBlockCostCenters,
} from '@/services/blocks/block.service';
import {
  listSectors,
  sectorsListQueryKey,
} from '@/services/sectors/sector.service';
import type { BlockDetail } from '@/types/block';
import type { SectorOption } from '@/types/sector';

type BlockCostCentersDialogProps = {
  block: BlockDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function currentSectorIds(block: BlockDetail): string[] {
  return block.costCenters.map((item) => item.sectorIdBaseApi);
}

export function BlockCostCentersDialog({
  block,
  open,
  onOpenChange,
}: BlockCostCentersDialogProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    currentSectorIds(block),
  );

  useEffect(() => {
    if (open) {
      setSelectedIds(currentSectorIds(block));
    }
  }, [open, block]);

  const sectorsQuery = useQuery({
    queryKey: sectorsListQueryKey,
    queryFn: listSectors,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const sectors = useMemo(() => sectorsQuery.data ?? [], [sectorsQuery.data]);

  const selectedSectors = useMemo(() => {
    const byId = new Map(sectors.map((item) => [item.id, item]));
    const linkedById = new Map(
      block.costCenters.map((item) => [item.sectorIdBaseApi, item]),
    );

    return selectedIds
      .map((id): SectorOption | undefined => {
        const sector = byId.get(id);
        if (sector) {
          return sector;
        }
        const linked = linkedById.get(id);
        return linked
          ? {
              id,
              name: linked.sectorName,
              costCenter: linked.costCenter,
              normalizedName: '',
              operationId: null,
              linkedBlock: { id: block.id, name: block.name },
            }
          : undefined;
      })
      .filter((item): item is SectorOption => Boolean(item));
  }, [sectors, selectedIds, block]);

  const { addedCount, removedCount } = useMemo(() => {
    const current = new Set(currentSectorIds(block));
    const next = new Set(selectedIds);
    return {
      addedCount: selectedIds.filter((id) => !current.has(id)).length,
      removedCount: [...current].filter((id) => !next.has(id)).length,
    };
  }, [block, selectedIds]);

  const hasChanges = addedCount > 0 || removedCount > 0;

  function toggleSector(id: string): void {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  }

  const saveMutation = useMutation({
    mutationFn: (sectorIds: string[]) =>
      updateBlockCostCenters(block.id, sectorIds),
    onSuccess: (updated) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      void queryClient.invalidateQueries({ queryKey: blocksListQueryKey });
      void queryClient.invalidateQueries({ queryKey: sectorsListQueryKey });
      toast.success('Centros de custo atualizados.');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const changesText = [
    addedCount > 0 ? `${addedCount} a adicionar` : null,
    removedCount > 0 ? `${removedCount} a remover` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 sm:max-w-xl sm:px-8 sm:py-10">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-muted-foreground" />
            Centros de custo
          </DialogTitle>
          <DialogDescription>
            As OFs desses centros de custo passam a ser do {block.name}.
          </DialogDescription>
        </DialogHeader>

        <SectorPicker
          sectors={sectors}
          selectedIds={selectedIds}
          selectedSectors={selectedSectors}
          loading={sectorsQuery.isLoading}
          error={sectorsQuery.isError ? sectorsQuery.error.message : null}
          currentBlockId={block.id}
          onToggle={toggleSector}
          onRetry={() => void sectorsQuery.refetch()}
        />

        <p className="min-h-5 text-sm">
          {selectedIds.length === 0 ? (
            <span className="text-destructive">
              O bloco precisa de pelo menos um centro de custo.
            </span>
          ) : (
            <span className="text-muted-foreground">{changesText}</span>
          )}
        </p>

        <DialogFooter className="gap-2 border-0 bg-transparent p-0 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              !hasChanges || selectedIds.length === 0 || saveMutation.isPending
            }
            onClick={() => saveMutation.mutate(selectedIds)}
          >
            {saveMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
