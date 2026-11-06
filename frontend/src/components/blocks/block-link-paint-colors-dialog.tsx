import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2Icon, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { HttpClientError } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  blockDetailQueryKey,
  blockPaintColorsQueryKey,
  listBlockPaintColors,
  updateBlockPaintColorMapHex,
  type BlockPaintColorRow,
} from '@/services/blocks/block.service';
import type { BlockDetail } from '@/types/block';
import { cn } from '@/lib/utils';

import colorPaletteIcon from '@/public/paint-block/color-palette.png';

type BlockLinkPaintColorsDialogProps = {
  block: BlockDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
    return v.toUpperCase();
  }
  return '#000000';
}

function displayHex(row: BlockPaintColorRow, draft: string | undefined): string {
  if (draft !== undefined) {
    return normalizeHex(draft);
  }
  return row.mapHex ?? '#94A3B8';
}

export function BlockLinkPaintColorsDialog({
  block,
  open,
  onOpenChange,
}: BlockLinkPaintColorsDialogProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const colorsQuery = useQuery({
    queryKey: blockPaintColorsQueryKey(block.id),
    queryFn: () => listBlockPaintColors(block.id),
    enabled: open,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (open) {
      setSearch('');
      setDrafts({});
    }
  }, [open, block.id]);

  const filtered = useMemo(() => {
    const rows = colorsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) => {
      const name = row.name.toLowerCase();
      const brand = (row.brand ?? '').toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }, [colorsQuery.data, search]);

  const saveMutation = useMutation({
    mutationFn: ({
      colorId,
      mapHex,
    }: {
      colorId: string;
      mapHex: string;
    }) => updateBlockPaintColorMapHex(block.id, colorId, mapHex),
    onSuccess: (updated) => {
      queryClient.setQueryData<BlockPaintColorRow[]>(
        blockPaintColorsQueryKey(block.id),
        (prev) => {
          if (!prev) {
            return [updated];
          }
          return prev.map((row) => (row.id === updated.id ? updated : row));
        },
      );
      queryClient.invalidateQueries({ queryKey: blockDetailQueryKey(block.id) });
      setDrafts((d) => {
        const next = { ...d };
        delete next[updated.id];
        return next;
      });
      toast.success('Cor do mapa atualizada.');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof HttpClientError
          ? err.message
          : 'Não foi possível salvar.';
      toast.error(message);
    },
  });

  const totalColors = colorsQuery.data?.length ?? 0;
  const showScrollHint = !colorsQuery.isLoading && !colorsQuery.isError && filtered.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,36rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 gap-1 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <img
              src={colorPaletteIcon}
              alt=""
              className="size-8 shrink-0"
              width={32}
              height={32}
            />
            Vincular cores ao mapa
          </DialogTitle>
          <DialogDescription className="text-sm">
            Defina a cor hexadecimal no mapa para cada item. Use a busca pelo nome da
            cor ou pela marca da tinta.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2 px-6 pt-3 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="paint-color-search" className="sr-only">
              Buscar cor
            </Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="paint-color-search"
                type="search"
                placeholder="Nome da cor ou marca da tinta…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
                autoComplete="off"
              />
            </div>
          </div>
          {showScrollHint ? (
            <p className="text-xs text-muted-foreground">
              {search.trim()
                ? `${filtered.length} de ${totalColors} ${totalColors === 1 ? 'cor' : 'cores'} — role a lista abaixo`
                : `${totalColors} ${totalColors === 1 ? 'cor' : 'cores'} — role a lista para ver todas`}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            'relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-2 [scrollbar-gutter:stable]',
            '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent',
          )}
          role="region"
          aria-label="Lista de cores para vincular ao mapa"
        >
          {colorsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
              Carregando cores…
            </div>
          ) : colorsQuery.isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Não foi possível carregar as cores.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {colorsQuery.data?.length === 0
                ? 'Nenhuma cor ainda neste bloco. Sincronize as OFs para importar as cores.'
                : 'Nenhuma cor encontrada para essa busca.'}
            </p>
          ) : (
            <ul className="grid gap-2 pb-4">
              {filtered.map((row) => {
                const currentDraft = drafts[row.id];
                const pickerValue = displayHex(row, currentDraft);
                const saved = row.mapHex;
                const normalizedPicker = normalizeHex(pickerValue);
                const dirty =
                  saved === null
                    ? currentDraft !== undefined
                    : currentDraft !== undefined &&
                      normalizeHex(currentDraft) !== saved.toUpperCase();

                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-muted-foreground">
                        Cor
                      </p>
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Tinta
                      </p>
                      <p className="truncate text-sm">
                        {row.brand?.trim() ? row.brand : '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-xs">
                        <span className="text-muted-foreground">Cor</span>
                        <input
                          type="color"
                          value={pickerValue}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [row.id]: e.target.value,
                            }))
                          }
                          className="size-8 cursor-pointer rounded border-0 bg-transparent p-0"
                          aria-label={`Selecionar cor do mapa para ${row.name}${row.brand ? ` (${row.brand})` : ''}`}
                        />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !dirty || saveMutation.isPending
                        }
                        onClick={() =>
                          saveMutation.mutate({
                            colorId: row.id,
                            mapHex: normalizedPicker,
                          })
                        }
                      >
                        Salvar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BlockLinkPaintColorsButton({
  block,
  prominent = false,
}: {
  block: BlockDetail;
  prominent?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (block.sector !== 'PAINT') {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={prominent ? 'ghost' : 'outline'}
        size={prominent ? 'lg' : 'sm'}
        className={cn(
          'gap-3 font-medium',
          prominent &&
            'h-auto min-h-[4.75rem] w-full justify-center border border-transparent bg-transparent py-6 text-base shadow-none transition-colors duration-200 hover:border-border/50 hover:bg-muted/35 dark:hover:bg-muted/25',
          !prominent && 'h-8 gap-2',
        )}
        onClick={() => setOpen(true)}
      >
        <img
          src={colorPaletteIcon}
          alt=""
          className={cn(
            'transition-transform duration-300 ease-out will-change-transform',
            prominent
              ? 'size-8 group-hover/button:scale-[1.22]'
              : 'size-5',
          )}
          width={prominent ? 32 : 20}
          height={prominent ? 32 : 20}
        />
        Vincular cores
      </Button>
      <BlockLinkPaintColorsDialog
        block={block}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
