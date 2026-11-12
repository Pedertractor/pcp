import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  ImageUp,
  Layers,
  Loader2Icon,
  Plus,
  Receipt,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SectorPicker } from '@/components/blocks/sector-picker';
import {
  MAX_CLASSES_PER_BLOCK,
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
import { cn } from '@/lib/utils';
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

type UpsertStep = 'general' | 'costCenters' | 'series';

const STEPS: Array<{ id: UpsertStep; title: string; icon: typeof Boxes }> = [
  { id: 'general', title: 'Nome e imagem temática', icon: Boxes },
  { id: 'costCenters', title: 'Centros de custo', icon: Receipt },
  { id: 'series', title: 'Classe', icon: Layers },
];

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
  const [sectorIds, setSectorIds] = useState<string[]>(
    () => block?.costCenters.map((cc) => cc.sectorIdApi) ?? [],
  );
  const [seriesDrafts, setSeriesDrafts] = useState<PmpSeriesDraft[]>(() =>
    toSeriesDrafts(block?.series ?? []),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState<UpsertStep | null>(null);
  const [step, setStep] = useState<UpsertStep>('general');
  const [themeFile, setThemeFile] = useState<File | null>(null);

  const themePreview = usePmpBlockThemeImage(block?.themeImage ?? null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (block) {
      setName(block.name);
      setSectorIds(block.costCenters.map((cc) => cc.sectorIdApi));
      setSeriesDrafts(toSeriesDrafts(block.series));
    } else {
      setName('');
      setSectorIds([]);
      setSeriesDrafts([]);
      setThemeFile(null);
    }
    setFormError(null);
    setErrorStep(null);
    setStep('general');
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
              linkedPmpBlock: block ? { id: block.id, name: block.name } : null,
            }
          : undefined;
      })
      .filter((item): item is SectorOption => Boolean(item));
  }, [sectors, sectorIds, block]);

  function toggleSector(id: string) {
    setSectorIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const mutation = useMutation({
    mutationFn: async (values: CreatePmpBlockFormValues) => {
      const costCenters = values.sectorIds.map((sectorIdApi) => ({ sectorIdApi }));
      const series = toSeriesInput(seriesDrafts);
      let saved;
      if (isEdit && block) {
        saved = await updatePmpBlock(block.id, {
          name: values.name,
          costCenters,
          series,
        });
      } else {
        saved = await createPmpBlock({
          name: values.name,
          costCenters,
          series,
        });
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
      // Prefixo cobre detalhe, semanas, metas semanais e metas diárias do bloco.
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

  function validateStep(target: UpsertStep): string | null {
    if (target === 'general') {
      return name.trim() ? null : 'Informe o nome do bloco.';
    }
    if (target === 'costCenters') {
      return sectorIds.length > 0
        ? null
        : 'Selecione ao menos um centro de custo.';
    }
    if (seriesDrafts.length === 0) {
      return 'Cadastre a classe e as peças + operações (CONCATENAR) que o PMP balanceado vai considerar.';
    }
    if (seriesDrafts.length > MAX_CLASSES_PER_BLOCK) {
      return 'O bloco aceita somente uma classe.';
    }
    if (seriesDrafts.some((item) => !item.name.trim())) {
      return 'Informe o nome da classe.';
    }
    const emptySeries = seriesDrafts.find(
      (item) => item.parts.length === 0,
    );
    if (emptySeries) {
      return `Informe ao menos uma peça + operação na classe "${emptySeries.name.trim()}".`;
    }
    return null;
  }

  function showStepError(target: UpsertStep, message: string) {
    setStep(target);
    setErrorStep(target);
    setFormError(message);
  }

  function goToNextStep() {
    const message = validateStep(step);
    if (message) {
      showStepError(step, message);
      return;
    }
    setFormError(null);
    setErrorStep(null);
    const index = STEPS.findIndex((item) => item.id === step);
    setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]!.id);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isEdit && !isLastStep) {
      goToNextStep();
      return;
    }
    for (const item of STEPS) {
      const message = validateStep(item.id);
      if (message) {
        showStepError(item.id, message);
        return;
      }
    }
    const parsed = createPmpBlockFormSchema.safeParse({ name, sectorIds });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    setFormError(null);
    setErrorStep(null);
    mutation.mutate(parsed.data);
  }

  const partCodesCount = seriesDrafts.reduce(
    (total, item) => total + item.parts.length,
    0,
  );
  const stepSummary: Record<UpsertStep, string> = {
    general: name.trim() || 'Sem nome',
    costCenters: `${sectorIds.length} ${sectorIds.length === 1 ? 'centro de custo' : 'centros de custo'}`,
    series: `${seriesDrafts[0]?.name.trim() ? `Classe ${seriesDrafts[0].name.trim()}` : 'Sem classe'} · ${partCodesCount} ${partCodesCount === 1 ? 'peça' : 'peças'}`,
  };
  const isLastStep = step === STEPS[STEPS.length - 1]!.id;

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
          <DialogTitle>
            {isEdit ? 'Editar bloco PMP' : 'Novo bloco PMP'}
          </DialogTitle>
          <DialogDescription>
            Defina o bloco, os centros de custo e as peças + operações da
            classe que o PMP balanceado vai considerar.
          </DialogDescription>
        </DialogHeader>

        <nav
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          aria-label="Etapas do bloco PMP"
        >
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const active = item.id === step;
            const hasError = errorStep === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  active
                    ? 'border-foreground bg-muted'
                    : 'border-border/60 hover:bg-muted/50',
                  hasError && 'border-destructive',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    active
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">{item.title}</span>
                  </span>
                  <span
                    className={cn(
                      'block truncate text-xs',
                      hasError ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {stepSummary[item.id]}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <form className="flex flex-col gap-6 py-2" onSubmit={handleSubmit}>
          {step === 'general' ? (
            <>
              <div className="grid gap-3">
                <Label
                  htmlFor="pmp-block-name"
                  className="flex items-center gap-2"
                >
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
            </>
          ) : null}

          {step === 'costCenters' ? (
            <>
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
                      ? (sectorsQuery.error?.message ??
                        'Erro ao carregar setores')
                      : null
                  }
                  currentBlockId={block?.id}
                  linkedField="linkedPmpBlock"
                  listClassName="max-h-48"
                  onToggle={toggleSector}
                  onRetry={() => void sectorsQuery.refetch()}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A operação de cada peça vem da classe (CONCATENAR: código da peça + operação).
              </p>
            </>
          ) : null}

          {step === 'series' ? (
            <div className="grid gap-3">
              <Label className="flex items-center gap-2">
                <Layers className="size-4 text-muted-foreground" />
                Classe
              </Label>
              <p className="-mt-1 text-xs text-muted-foreground">
                Informe a classe (uma por bloco) e as peças com a operação de cada uma (o
                CONCATENAR da planilha: código da peça + operação). O bloco só
                aceita metas desses CONCATENAR.
              </p>
              <PmpSeriesEditor
                value={seriesDrafts}
                onChange={setSeriesDrafts}
              />
            </div>
          ) : null}

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
            {!isEdit && !isLastStep ? (
              <Button type="button" onClick={goToNextStep}>
                Próximo
              </Button>
            ) : (
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {isEdit ? 'Salvar' : 'Criar bloco'}
              </Button>
            )}
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
