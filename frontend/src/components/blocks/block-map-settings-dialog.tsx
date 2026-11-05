import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, Map as MapIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  formatPlanSize,
  PlanImageDropzone,
} from '@/components/blocks/plan-image-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBlockPlanImage } from '@/hooks/blocks/use-block-plan-image';
import {
  blockDetailQueryKey,
  blocksListQueryKey,
  uploadBlockPlanImage,
} from '@/services/blocks/block.service';
import type { BlockDetail } from '@/types/block';

type BlockMapSettingsDialogProps = {
  block: BlockDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlockMapSettingsDialog({
  block,
  open,
  onOpenChange,
}: BlockMapSettingsDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const currentImage = useBlockPlanImage(block.blockPlanImage);

  useEffect(() => {
    if (!open) {
      setFile(null);
    }
  }, [open]);

  const uploadMutation = useMutation({
    mutationFn: (selected: File) => uploadBlockPlanImage(block.id, selected),
    onSuccess: (updated) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      void queryClient.invalidateQueries({ queryKey: blocksListQueryKey });
      toast.success('Mapa do bloco atualizado.');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 sm:max-w-2xl sm:px-8 sm:py-10">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="size-5 text-muted-foreground" />
            Configurar mapa
          </DialogTitle>
          <DialogDescription>
            A planta é o fundo onde as máquinas do {block.name} serão posicionadas.
          </DialogDescription>
        </DialogHeader>

        <PlanImageDropzone
          file={file}
          onFileChange={setFile}
          currentSrc={file ? null : currentImage.src}
          currentLoading={Boolean(block.blockPlanImage) && currentImage.isLoading}
          alt={`Planta do ${block.name}`}
          className="min-h-64"
          imageClassName="max-h-[50vh]"
        />

        <p className="min-h-5 text-sm text-muted-foreground">
          {file
            ? `${file.name} · ${formatPlanSize(file.size)}`
            : block.blockPlanImage
              ? `Atual: ${block.blockPlanImage.originalName ?? 'planta'}${
                  block.blockPlanImage.size
                    ? ` · ${formatPlanSize(block.blockPlanImage.size)}`
                    : ''
                }`
              : 'Nenhuma planta enviada.'}
        </p>

        <DialogFooter className="gap-2 border-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!file || uploadMutation.isPending}
            onClick={() => file && uploadMutation.mutate(file)}
          >
            {uploadMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Salvar mapa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
