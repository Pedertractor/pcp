import { ImageUp, Loader2Icon, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { BLOCK_PLAN_ACCEPTED_TYPES, BLOCK_PLAN_MAX_BYTES } from '@/types/block';

type PlanImageDropzoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  currentSrc?: string | null;
  currentLoading?: boolean;
  alt: string;
  className?: string;
  imageClassName?: string;
};

export function formatPlanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateFile(file: File): string | null {
  if (
    !BLOCK_PLAN_ACCEPTED_TYPES.includes(
      file.type as (typeof BLOCK_PLAN_ACCEPTED_TYPES)[number],
    )
  ) {
    return 'Use uma imagem PNG, JPG ou WEBP.';
  }
  if (file.size > BLOCK_PLAN_MAX_BYTES) {
    return 'A imagem deve ter no máximo 15 MB.';
  }
  return null;
}

export function PlanImageDropzone({
  file,
  onFileChange,
  currentSrc = null,
  currentLoading = false,
  alt,
  className,
  imageClassName,
}: PlanImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(selected: File | undefined): void {
    if (!selected) {
      return;
    }
    const error = validateFile(selected);
    if (error) {
      toast.error(error);
      return;
    }
    onFileChange(selected);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files[0]);
  }

  const shownSrc = previewUrl ?? currentSrc;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <input
        ref={inputRef}
        type="file"
        accept={BLOCK_PLAN_ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'group relative flex w-full flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 p-4 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60',
          className,
        )}
      >
        {shownSrc ? (
          <>
            <img
              src={shownSrc}
              alt={alt}
              className={cn('w-full rounded-md object-contain', imageClassName)}
            />
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-foreground/10">
              <RefreshCw className="size-3.5" />
              Trocar imagem
            </span>
          </>
        ) : currentLoading ? (
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-muted text-brand">
              <ImageUp className="size-6" />
            </div>
            <p className="font-medium">
              Arraste a planta aqui ou clique para escolher
            </p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG ou WEBP até 15 MB
            </p>
          </>
        )}
      </button>

      {file && !currentSrc ? (
        <button
          type="button"
          aria-label="Remover imagem"
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-foreground/10 hover:text-foreground"
          onClick={() => onFileChange(null)}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
