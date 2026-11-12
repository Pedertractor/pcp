import { useQuery } from '@tanstack/react-query';
import { ImageOff, Loader2Icon } from 'lucide-react';
import { useState } from 'react';

import { PlanZoomViewport } from '@/components/blocks/plan-zoom-viewport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPmpWeeklyGoalPartPreview,
  pmpWeeklyGoalPartPreviewQueryKey,
} from '@/services/pmp/pmp-goal.service';

type PmpPartDetailsDialogProps = {
  blockId: string;
  goalId: string;
  productCode: string;
  productName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PmpPartDetailsDialog({
  blockId,
  goalId,
  productCode,
  productName,
  open,
  onOpenChange,
}: PmpPartDetailsDialogProps) {
  const previewQuery = useQuery({
    queryKey: pmpWeeklyGoalPartPreviewQueryKey(blockId, goalId),
    queryFn: () => getPmpWeeklyGoalPartPreview(blockId, goalId),
    enabled: open && blockId.length > 0 && goalId.length > 0,
    staleTime: 5 * 60_000,
  });
  const imageUrl = previewQuery.data?.imageUrl ?? null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && failedUrl !== imageUrl;
  const label = `Peça ${productCode}${productName ? ` · ${productName}` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(96dvh,100%)] w-[min(96vw,100%)] max-w-[96vw] flex-col gap-2 overflow-hidden p-3 sm:max-w-[96vw] sm:p-4">
        <div className="flex shrink-0 items-baseline justify-between gap-3 pr-8">
          <DialogTitle className="min-w-0 truncate text-sm font-semibold">{label}</DialogTitle>
          {showImage ? (
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              Rolagem ou +/- para zoom · arraste com zoom · duplo clique
            </span>
          ) : null}
        </div>
        <DialogDescription className="sr-only">
          Visualização ampliada da imagem da peça. Use a roda do mouse, os botões de zoom ou
          duplo clique para ampliar; arraste para mover.
        </DialogDescription>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {previewQuery.isPending ? (
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-hidden />
          ) : previewQuery.isError ? (
            <p className="text-sm text-destructive">{previewQuery.error.message}</p>
          ) : showImage ? (
            <PlanZoomViewport key={imageUrl} className="h-full min-h-0 w-full p-1 sm:p-2">
              <div className="flex h-full w-full items-center justify-center">
                <img
                  src={imageUrl}
                  alt={label}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                  onError={() => setFailedUrl(imageUrl)}
                />
              </div>
            </PlanZoomViewport>
          ) : (
            <span className="flex flex-col items-center gap-1 p-3 text-center text-muted-foreground">
              <ImageOff className="size-10" aria-hidden />
              <span className="text-sm">
                {imageUrl
                  ? 'Não foi possível carregar a imagem (URL ou CORS).'
                  : 'Sem imagem na API base.'}
              </span>
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
