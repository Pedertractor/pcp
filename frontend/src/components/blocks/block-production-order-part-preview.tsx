import { ImageOff, Loader2Icon, Maximize2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PlanZoomViewport } from '@/components/blocks/plan-zoom-viewport';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type BlockProductionOrderPartPreviewProps = {
  imageUrl: string | null | undefined;
  isLoading: boolean;
  /** Curto texto alternativo (acessibilidade). */
  label: string;
  className?: string;
};

export function BlockProductionOrderPartPreview({
  imageUrl,
  isLoading,
  label,
  className,
}: BlockProductionOrderPartPreviewProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [enlargedOpen, setEnlargedOpen] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
    setEnlargedOpen(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !loadFailed;

  return (
  <>
    <div
      className={cn(
        'relative flex min-h-[10rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted',
        className,
      )}
    >
      {isLoading ? (
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" aria-hidden />
      ) : showImage ? (
        <>
          <img
            src={imageUrl!}
            alt={label}
            className="max-h-[min(24rem,50dvh)] w-full object-contain"
            draggable={false}
            onError={() => setLoadFailed(true)}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-2 right-2 shadow-sm"
            aria-label="Ampliar imagem"
            onClick={() => setEnlargedOpen(true)}
          >
            <Maximize2 className="size-4" aria-hidden />
          </Button>
        </>
      ) : (
        <span className="flex flex-col items-center gap-0.5 p-3 text-center">
          <ImageOff className="size-8 text-muted-foreground" aria-hidden />
          <span className="text-xs leading-tight text-muted-foreground">
            {loadFailed
              ? 'Não foi possível carregar a imagem (URL ou CORS).'
              : 'Sem imagem na API base.'}
          </span>
        </span>
      )}
    </div>

    <Dialog open={enlargedOpen} onOpenChange={setEnlargedOpen}>
      <DialogContent className="flex h-[min(96dvh,100%)] w-[min(96vw,100%)] max-w-[96vw] flex-col gap-2 overflow-hidden p-3 sm:max-w-[96vw] sm:p-4">
        <div className="flex shrink-0 items-baseline justify-between gap-3 pr-8">
          <DialogTitle className="min-w-0 truncate text-sm font-semibold">
            {label}
          </DialogTitle>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            Rolagem ou +/- para zoom · arraste com zoom · duplo clique
          </span>
        </div>
        <DialogDescription className="sr-only">
          Visualização ampliada da imagem da peça. Use a roda do mouse, os botões
          de zoom ou duplo clique para ampliar; arraste para mover.
        </DialogDescription>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-muted">
          {showImage ? (
            <PlanZoomViewport
              key={imageUrl}
              className="h-full min-h-0 w-full p-1 sm:p-2"
            >
              <div className="flex h-full w-full items-center justify-center">
                <img
                  src={imageUrl!}
                  alt={label}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            </PlanZoomViewport>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  </>
  );
}
