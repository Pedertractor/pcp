import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ImageUp, Layers, Loader2Icon, Plus, Receipt } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SectorPicker } from '@/components/blocks/sector-picker';
import { PmpCostCenterOperationsEditor } from '@/components/pmp/pmp-cost-center-operations-editor';
import {
  PmpSeriesEditor,
  toSeriesDrafts,
  toSeriesInput,
  type PmpSeriesDraft,
} from '@/components/pmp/pmp-series-editor';
import { PmpThemeImageDropzone } from '@/components/pmp/pmp-theme-image-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWebSession } from '@/hooks/auth/use-web-session';
import { usePmpBlockThemeImage } from '@/hooks/pmp/use-pmp-block-theme-image';
import { canAccessUserManagement } from '@/lib/role-access';
import {
  createPmpBlockFormSchema,
  type CreatePmpBlockFormValues,
} from '@/schemas/create-pmp-block.schema';
import {
  createPmpBlock,
  pmpBlockDetailQueryKey,
  pmpBlocksListQueryKey,
  updatePmpBlock,
  uploadPmpBlockThemeImage,
} from '@/services/pmp/pmp-block.service';
import {
  listSectors,
  sectorsListQueryKey,
} from '@/services/sectors/sector.service';
import type { PmpBlockSummary } from '@/types/pmp-block';
import type { SectorOption } from '@/types/sector';

function buildOperationsMap(block: PmpBlockSummary): Record<string, number[]> {
  return Object.fromEntries(
    block.costCenters.map((cc) => [
      cc.sectorIdApi,
      cc.operations.map((op) => op.operation),
    ]),
  );
}

type PmpBlockUpsertDialogProps = {
  block?: PmpBlockSummary;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function PmpBlockUpsertDialog({
  block,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  showTrigger = true,
}: PmpBlockUpsertDialogProps) {
  const isEdit = Boolean(block);
  const { data: user, isPending: isSessionPending } = useWebSession();
  const canManage = canAccessUserManagement(user?.role);
  const queryClient = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [name, setName] = useState(block?.name ?? '');
  const [sectorIds, setSectorIds] = useState<string[]>(() =>
    block?.costCenters.map((cc) => cc.sectorIdApi) ?? [],
  );
  const [operationsBySector, setOperationsBySector] = useState<
    Record<string, number[]>
  >(() => (block ? buildOperationsMap(block) : {}));
  const [seriesDrafts, setSeriesDrafts] = useState<PmpSeriesDraft[]>(() =>
    toSeriesDrafts(block?.series ?? []),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [themeFile, setThemeFile] = useState<File | null>(null);

  const themePreview = usePmpBlockThemeImage(block?.themeImage ?? null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (block) {
      setName(block.name);
      setSectorIds(block.costCenters.map((cc) => cc.sectorIdApi));
      setOperationsBySector(buildOperationsMap(block));
      setSeriesDrafts(toSeriesDrafts(block.series));
    } else {
      setName('');
      setSectorIds([]);
      setOperationsBySector({});
      setSeriesDrafts([]);
      setThemeFile(null);
    }
    setFormError(null);
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
      block?.costCenters.map((cc) => [cc.sectorIdApi, cc]) ?? [],
    );

    return sectorIds
      .map((id): SectorOption | undefined => {
        const sector = byId.get(id);
        if (sector) {
          return sector;
        }
        const linked = linkedById.get(id);
        return linked
          ? {
              id,
              name: linked.sectorName ?? linked.costCenter,
              costCenter: linked.costCenter,
              normalizedName: '',
              operationId: null,
              linkedBlock: null,
              linkedPmpBlock: block
                ? { id: block.id, name: block.name }
                : null,
            }
          : undefined;
      })
      .filter((item): item is SectorOption => Boolean(item));
  }, [sectors, sectorIds, block]);

  function toggleSector(id: string) {
    const sector = sectors.find((item) => item.id === id);
    if (sectorIds.includes(id)) {
      setSectorIds((prev) => prev.filter((item) => item !== id));
      setOperationsBySector((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setSectorIds((prev) => [...prev, id]);
    setOperationsBySector((prev) => ({
      ...prev,
      [id]:
        prev[id] ??
        (sector?.operationId != null ? [sector.operationId] : []),
    }));
  }

  const mutation = useMutation({
    mutationFn: async (values: CreatePmpBlockFormValues) => {
      const costCenters = values.sectorIds.map((sectorIdApi) => ({
        sectorIdApi,
        operations: operationsBySector[sectorIdApi] ?? [],
      }));
      const series = toSeriesInput(seriesDrafts);
      let saved;
      if (isEdit && block) {
        saved = await updatePmpBlock(block.id, {
          name: values.name,
          costCenters,
          series,
        });
      } else {
        saved = await createPmpBlock({ name: values.name, costCenters, series });
      }
      if (themeFile) {
        try {
          return await uploadPmpBlockThemeImage(saved.id, themeFile);
        } catch (error) {
          toast.error(
            `Bloco salvo, mas a imagem não foi enviada: ${(error as Error).message}`,
          );
          return saved;
        }
      }
      return saved;
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: pmpBlocksListQueryKey });
      await queryClient.invalidateQueries({
        queryKey: pmpBlockDetailQueryKey(saved.id),
      });
      await queryClient.invalidateQueries({ queryKey: sectorsListQueryKey });
      toast.success(isEdit ? 'Bloco PMP atualizado.' : 'Bloco PMP criado.');
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createPmpBlockFormSchema.safeParse({ name, sectorIds });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    const seriesNames = seriesDrafts.map((item) => item.name.trim().toLocaleUpperCase('pt-BR'));
    if (seriesNames.some((item) => !item)) {
      setFormError('Informe o nome de todas as séries.');
      return;
    }
    if (new Set(seriesNames).size !== seriesNames.length) {
      setFormError('Há séries com o mesmo nome.');
      return;
    }
    setFormError(null);
    mutation.mutate(parsed.data);
  }

  if (isSessionPending || !canManage) {
    return null;
  }

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button type="button">
            <Plus />
            {isEdit ? 'Editar bloco' : 'Novo bloco'}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto px-6 py-8 sm:max-w-[min(72rem,calc(100vw-4rem))] sm:px-8">
        <DialogHeader className="pr-8">
          <DialogTitle>{isEdit ? 'Editar bloco PMP' : 'Novo bloco PMP'}</DialogTitle>
          <DialogDescription>
            Vincule centros de custo da API base e defina as operações de cada um.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-6 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <Label htmlFor="pmp-block-name" className="flex items-center gap-2">
              <Boxes className="size-4 text-muted-foreground" />
              Nome
            </Label>
            <Input
              id="pmp-block-name"
              autoComplete="off"
              placeholder="Ex.: Pintura — programa semanal"
              className="h-10"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <Label className="flex items-center gap-2">
              <ImageUp className="size-4 text-muted-foreground" />
              Imagem temática do bloco
            </Label>
            <PmpThemeImageDropzone
              file={themeFile}
              onFileChange={setThemeFile}
              currentSrc={themeFile ? null : themePreview.src}
              currentLoading={!themeFile && themePreview.isLoading}
              alt={name.trim() || 'Imagem temática do bloco PMP'}
            />
          </div>

          <div className="grid min-h-0 gap-3">
            <Label className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              Centros de custo
            </Label>
            <SectorPicker
              sectors={sectors}
              selectedIds={sectorIds}
              selectedSectors={selectedSectors}
              loading={sectorsQuery.isLoading}
              error={
                sectorsQuery.isError
                  ? (sectorsQuery.error?.message ?? 'Erro ao carregar setores')
                  : null
              }
              currentBlockId={block?.id}
              linkedField="linkedPmpBlock"
              listClassName="max-h-48"
              onToggle={toggleSector}
              onRetry={() => void sectorsQuery.refetch()}
            />
          </div>

          {selectedSectors.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Operações por centro de custo</p>
              {selectedSectors.map((sector) => (
                <PmpCostCenterOperationsEditor
                  key={sector.id}
                  costCenter={sector.costCenter}
                  sectorName={sector.name}
                  operations={operationsBySector[sector.id] ?? []}
                  onChange={(next) =>
                    setOperationsBySector((prev) => ({
                      ...prev,
                      [sector.id]: next,
                    }))
                  }
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3">
            <Label className="flex items-center gap-2">
              <Layers className="size-4 text-muted-foreground" />
              Séries de peças
            </Label>
            <p className="-mt-1 text-xs text-muted-foreground">
              O bloco só aceita metas de peças cujo código está em alguma série.
            </p>
            <PmpSeriesEditor value={seriesDrafts} onChange={setSeriesDrafts} />
          </div>

          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {isEdit ? 'Salvar' : 'Criar bloco'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (isEdit && !showTrigger) {
    return dialog;
  }

  return dialog;
}
