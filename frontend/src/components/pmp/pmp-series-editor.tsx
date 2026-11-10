import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PmpSeries, PmpSeriesInput } from '@/types/pmp-block';

export type PmpSeriesDraft = {
  key: string;
  name: string;
  partCodes: string[];
};

function parsePartCodes(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((code) => code.trim().replace(/^0+/, ''))
    .filter(Boolean);
}

function sortCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

export function toSeriesDrafts(series: PmpSeries[]): PmpSeriesDraft[] {
  return series.map((item) => ({
    key: item.id,
    name: item.name,
    partCodes: item.partCodes,
  }));
}

export function toSeriesInput(drafts: PmpSeriesDraft[]): PmpSeriesInput[] {
  return drafts.map((draft) => ({
    name: draft.name.trim(),
    partCodes: draft.partCodes,
  }));
}

type SeriesCardProps = {
  series: PmpSeriesDraft;
  onChange: (patch: Partial<PmpSeriesDraft>) => void;
  onRemove: () => void;
};

function SeriesCard({ series, onChange, onRemove }: SeriesCardProps) {
  const [draft, setDraft] = useState('');

  function addCodes() {
    const codes = parsePartCodes(draft);
    if (codes.length === 0) {
      return;
    }
    onChange({ partCodes: sortCodes([...new Set([...series.partCodes, ...codes])]) });
    setDraft('');
  }

  function removeCode(code: string) {
    onChange({ partCodes: series.partCodes.filter((item) => item !== code) });
  }

  const count = series.partCodes.length;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nome da série (ex.: A)"
          value={series.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-9 max-w-60"
          aria-label="Nome da série"
        />
        <Badge variant="secondary" className="tabular-nums">
          {count} {count === 1 ? 'peça' : 'peças'}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          aria-label={`Remover série ${series.name}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {count === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum código de peça.</p>
      ) : (
        <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60 bg-background">
          {series.partCodes.map((code) => (
            <li key={code} className="flex items-center justify-between gap-2 px-3 py-1">
              <span className="font-mono text-sm tabular-nums">{code}</span>
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remover código ${code}`}
                onClick={() => removeCode(code)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Código da peça (aceita colar vários)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCodes();
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (/[\s,;]/.test(text.trim())) {
              event.preventDefault();
              const codes = parsePartCodes(text);
              onChange({
                partCodes: sortCodes([...new Set([...series.partCodes, ...codes])]),
              });
            }
          }}
          className="h-9 flex-1 font-mono"
          aria-label={`Novo código de peça para a série ${series.name}`}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addCodes}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

type PmpSeriesEditorProps = {
  value: PmpSeriesDraft[];
  onChange: (next: PmpSeriesDraft[]) => void;
};

export function PmpSeriesEditor({ value, onChange }: PmpSeriesEditorProps) {
  function update(key: string, patch: Partial<PmpSeriesDraft>) {
    onChange(value.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma série. Sem série, o bloco não aceita metas na importação.
        </p>
      ) : (
        value.map((series) => (
          <SeriesCard
            key={series.key}
            series={series}
            onChange={(patch) => update(series.key, patch)}
            onRemove={() => onChange(value.filter((item) => item.key !== series.key))}
          />
        ))
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          onChange([...value, { key: crypto.randomUUID(), name: '', partCodes: [] }])
        }
      >
        <Plus className="size-4" />
        Adicionar série
      </Button>
    </div>
  );
}
