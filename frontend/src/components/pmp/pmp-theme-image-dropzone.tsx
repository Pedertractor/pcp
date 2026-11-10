import { ImageUp, Loader2Icon, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { toast } from 'sonner';

import { formatPlanSize } from '@/components/blocks/plan-image-dropzone';
import { cn } from '@/lib/utils';
import {
  PMP_BLOCK_THEME_ACCEPTED_TYPES,
  PMP_BLOCK_THEME_MAX_BYTES,
} from '@/types/pmp-block';

type PmpThemeImageDropzoneProps = {
  file: File | null;
  onFileChange: (file: File | null) => void;
  currentSrc?: string | null;
  currentLoading?: boolean;
  alt: string;
  className?: string;
};

function validateFile(file: File): string | null {
  if (
    !PMP_BLOCK_THEME_ACCEPTED_TYPES.includes(
      file.type as (typeof PMP_BLOCK_THEME_ACCEPTED_TYPES)[number],
    )
  ) {
    return 'Use PNG ou WEBP com fundo transparente.';
  }
  if (file.size > PMP_BLOCK_THEME_MAX_BYTES) {
    return 'A imagem deve ter no máximo 15 MB.';
  }
  return null;
}

export function PmpThemeImageDropzone({
  file,
  onFileChange,
  currentSrc = null,
  currentLoading = false,
  alt,
  className,
}: PmpThemeImageDropzoneProps) {
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
    <div className={cn('relative flex flex-col', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={PMP_BLOCK_THEME_ACCEPTED_TYPES.join(',')}
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
          'group relative flex min-h-[12rem] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 p-4 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60',
        )}
      >
        {shownSrc ? (
          <>
            <div className="flex w-full flex-1 items-center justify-center rounded-md bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-4 dark:bg-[repeating-conic-gradient(hsl(var(--muted)/0.5)_0%_25%,transparent_0%_50%)]">
              <img
                src={shownSrc}
                alt={alt}
                className="max-h-36 w-auto object-contain"
              />
            </div>
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
              Arraste a imagem temática ou clique para escolher
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Use <span className="font-medium text-foreground">PNG ou WEBP</span>{' '}
              com fundo <span className="font-medium text-foreground">transparente</span>{' '}
              (sem fundo sólido). Até {formatPlanSize(PMP_BLOCK_THEME_MAX_BYTES)}.
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
