import { Check, Loader2Icon, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SectorOption } from '@/types/sector';

type SectorPickerProps = {
  sectors: SectorOption[];
  selectedIds: string[];
  selectedSectors: SectorOption[];
  loading: boolean;
  error: string | null;
  currentBlockId?: string;
  /** Qual vínculo impede seleção em outro bloco (Controle Produtivo ou PMP). */
  linkedField?: 'linkedBlock' | 'linkedPmpBlock';
  className?: string;
  listClassName?: string;
  onToggle: (id: string) => void;
  onRetry: () => void;
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function SectorPicker({
  sectors,
  selectedIds,
  selectedSectors,
  loading,
  error,
  currentBlockId,
  linkedField = 'linkedBlock',
  className,
  listClassName,
  onToggle,
  onRetry,
}: SectorPickerProps) {
  const [search, setSearch] = useState('');

  const filteredSectors = useMemo(() => {
    const term = normalize(search.trim());
    if (!term) {
      return sectors;
    }
    return sectors.filter(
      (item) =>
        normalize(item.name).includes(term) || item.costCenter.includes(term),
    );
  }, [sectors, search]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {selectedSectors.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedSectors.map((item) => (
            <span
              key={item.id}
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary/10 pr-1 pl-2.5 text-xs font-medium text-foreground"
            >
              <span className="font-semibold text-brand">{item.costCenter}</span>
              <span className="max-w-40 truncate">{item.name}</span>
              <button
                type="button"
                aria-label={`Remover ${item.name}`}
                className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                onClick={() => onToggle(item.id)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por setor ou centro de custo"
          aria-label="Buscar setor"
          autoComplete="off"
          className="h-10 pl-9"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-muted/50">
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Carregando setores da API base…
          </p>
        ) : error ? (
          <div className="flex items-center justify-between gap-3 px-3 py-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
              <RotateCcw />
              Tentar de novo
            </Button>
          </div>
        ) : filteredSectors.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum setor encontrado.
          </p>
        ) : (
          <ul
            role="listbox"
            aria-multiselectable
            aria-label="Setores da API base"
            className={cn('max-h-60 min-h-0 flex-1 overflow-y-auto p-1', listClassName)}
          >
            {filteredSectors.map((item) => {
              const selected = selectedIds.includes(item.id);
              const linked = item[linkedField];
              const linkedElsewhere =
                linked !== null && linked.id !== currentBlockId;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={linkedElsewhere}
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      selected ? 'bg-primary/10' : 'hover:bg-background',
                      linkedElsewhere && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background',
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                    </span>
                    <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                      {item.costCenter}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {linkedElsewhere ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {linked?.name}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length === 0
          ? `${sectors.length} setores ativos`
          : `${selectedIds.length} selecionado${selectedIds.length > 1 ? 's' : ''} de ${sectors.length}`}
      </p>
    </div>
  );
}
