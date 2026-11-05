import {
  Boxes,
  Loader2Icon,
  Map as MapIcon,
  Paintbrush,
  Plus,
  Receipt,
} from 'lucide-react';

import {
  formatPlanSize,
  PlanImageDropzone,
} from '@/components/blocks/plan-image-dropzone';
import { SectorPicker } from '@/components/blocks/sector-picker';
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
import { useCreateBlock } from '@/hooks/blocks/use-create-block';
import { cn } from '@/lib/utils';
import { BLOCK_SECTORS, BLOCK_SECTOR_LABELS } from '@/types/block';

export function CreateBlockDialog() {
  const {
    openDialog,
    setOpenDialog,
    register,
    errors,
    sector,
    setValue,
    sectors,
    sectorsLoading,
    sectorsError,
    refetchSectors,
    selectedSectorIds,
    selectedSectors,
    toggleSector,
    planFile,
    setPlanFile,
    handleSubmit,
    isSubmitting,
  } = useCreateBlock();

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus />
          Novo bloco
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto px-6 py-8 sm:max-w-[min(72rem,calc(100vw-4rem))] sm:px-8 lg:h-[calc(100dvh-2rem)] lg:overflow-hidden">
        <DialogHeader className="pr-8">
          <DialogTitle>Novo bloco</DialogTitle>
          <DialogDescription>
            Os centros de custo ligam as OFs e os processos a este bloco.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-6 py-2"
          onSubmit={handleSubmit}
        >
          <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-8">
            <div className="flex min-h-0 flex-col gap-6">
              <div className="grid gap-3">
                <Label
                  htmlFor="create-block-name"
                  className="flex items-center gap-2"
                >
                  <Boxes className="size-4 text-muted-foreground" />
                  Nome
                </Label>
                <Input
                  id="create-block-name"
                  autoComplete="off"
                  placeholder="Ex.: Bloco F"
                  className="h-10"
                  {...register('name')}
                />
                {errors.name ? (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3">
                <Label
                  id="create-block-sector"
                  className="flex items-center gap-2"
                >
                  <Paintbrush className="size-4 text-muted-foreground" />
                  Setor
                </Label>
                <div
                  role="radiogroup"
                  aria-labelledby="create-block-sector"
                  className="flex flex-wrap gap-2"
                >
                  {BLOCK_SECTORS.map((item) => {
                    const selected = sector === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={cn(
                          'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground',
                        )}
                        onClick={() =>
                          setValue('sector', item, { shouldValidate: true })
                        }
                      >
                        {BLOCK_SECTOR_LABELS[item]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <Label className="flex items-center gap-2">
                  <Receipt className="size-4 text-muted-foreground" />
                  Centros de custo
                </Label>
                <SectorPicker
                  sectors={sectors}
                  selectedIds={selectedSectorIds}
                  selectedSectors={selectedSectors}
                  loading={sectorsLoading}
                  error={sectorsError}
                  className="min-h-0 flex-1"
                  listClassName="lg:max-h-none"
                  onToggle={toggleSector}
                  onRetry={refetchSectors}
                />
                {errors.sectorIds ? (
                  <p className="text-sm text-destructive">
                    {errors.sectorIds.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-3">
              <Label className="flex items-center gap-2">
                <MapIcon className="size-4 text-muted-foreground" />
                Planta do bloco
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <PlanImageDropzone
                file={planFile}
                onFileChange={setPlanFile}
                alt="Planta do novo bloco"
                className="min-h-72 lg:min-h-0"
                imageClassName="max-h-[55vh] lg:max-h-none lg:min-h-0 lg:flex-1"
              />
              <p className="min-h-5 text-sm text-muted-foreground">
                {planFile
                  ? `${planFile.name} · ${formatPlanSize(planFile.size)}`
                  : 'Você também pode enviar depois, dentro do bloco.'}
              </p>
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenDialog(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Criar bloco
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
