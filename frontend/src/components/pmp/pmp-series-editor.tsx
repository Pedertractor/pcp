import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PmpSeries, PmpSeriesInput, PmpSeriesPart } from '@/types/pmp-block';

export const MAX_CLASSES_PER_BLOCK = 1;

export type PmpSeriesDraft = {
  key: string;
  name: string;
  parts: PmpSeriesPart[];
};

function partKey(part: PmpSeriesPart) {
  return `${part.partCode}|${part.operation}`;
}

function toPart(code: string, operation: string | number): PmpSeriesPart | null {
  const partCode = code.trim().replace(/^0+/, '');
  const op = Number(String(operation).trim());
  if (!partCode || !Number.isInteger(op) || op <= 0) {
    return null;
  }
  return { partCode, operation: op };
}

/**
 * Uma peça por linha: "código operação", "código CONCATENAR" ou a linha copiada da planilha.
 * O código é a primeira coluna numérica; a operação sai do CONCATENAR (código + operação)
 * ou, sem ele, da coluna seguinte ao código.
 */
function parsePartLines(text: string): PmpSeriesPart[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const cells = (line.includes('\t') ? line.split('\t') : line.split(/[\s,;]+/))
      .map((cell) => cell.trim())
      .filter((cell) => /^\d+$/.test(cell));
    const code = cells[0]?.replace(/^0+/, '');
    if (!code || cells.length < 2) {
      return [];
    }
    const concat = cells
      .slice(1)
      .find((cell) => cell.startsWith(code) && cell.length > code.length);
    const operation = concat ? concat.slice(code.length) : cells[1]!;
    return toPart(code, operation) ?? [];
  });
}

function mergeParts(current: PmpSeriesPart[], added: PmpSeriesPart[]): PmpSeriesPart[] {
  const byKey = new Map(current.map((part) => [partKey(part), part]));
  for (const part of added) {
    byKey.set(partKey(part), part);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.partCode.localeCompare(b.partCode, 'pt-BR', { numeric: true }) ||
      a.operation - b.operation,
  );
}

export function toSeriesDrafts(series: PmpSeries[]): PmpSeriesDraft[] {
  return series.map((item) => ({
    key: item.id,
    name: item.name,
    parts: item.parts,
  }));
}

export function toSeriesInput(drafts: PmpSeriesDraft[]): PmpSeriesInput[] {
  return drafts.map((draft) => ({
    name: draft.name.trim(),
    parts: draft.parts,
  }));
}

type SeriesCardProps = {
  series: PmpSeriesDraft;
  onChange: (patch: Partial<PmpSeriesDraft>) => void;
  onRemove: () => void;
};

function SeriesCard({ series, onChange, onRemove }: SeriesCardProps) {
  const [codeDraft, setCodeDraft] = useState('');
  const [operationDraft, setOperationDraft] = useState('');

  function addPart() {
    const part = toPart(codeDraft, operationDraft);
    if (!part) {
      return;
    }
    onChange({ parts: mergeParts(series.parts, [part]) });
    setCodeDraft('');
    setOperationDraft('');
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text');
    if (!/[\s,;]/.test(text.trim())) {
      return;
    }
    event.preventDefault();
    const parts = parsePartLines(text);
    if (parts.length > 0) {
      onChange({ parts: mergeParts(series.parts, parts) });
    }
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addPart();
    }
  }

  function removePart(part: PmpSeriesPart) {
    const key = partKey(part);
    onChange({ parts: series.parts.filter((item) => partKey(item) !== key) });
  }

  const count = series.parts.length;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nome da classe (ex.: A)"
          value={series.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className="h-9 max-w-60"
          aria-label="Nome da classe"
        />
        <Badge variant="secondary" className="tabular-nums">
          {count} {count === 1 ? 'peça' : 'peças'}
        </Badge>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-8"
          aria-label={`Remover classe ${series.name}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {count === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma peça.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-md border border-border/60 bg-background">
          <div className="sticky top-0 grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_auto] gap-2 border-b border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <span>Peça</span>
            <span>Operação</span>
            <span>Concatenar</span>
            <span className="w-4" />
          </div>
          <ul className="divide-y divide-border/60">
            {series.parts.map((part) => (
              <li
                key={partKey(part)}
                className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1 font-mono text-sm tabular-nums"
              >
                <span>{part.partCode}</span>
                <span>OP {part.operation}</span>
                <span className="text-muted-foreground">
                  {part.partCode}
                  {part.operation}
                </span>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remover ${part.partCode} OP ${part.operation}`}
                  onClick={() => removePart(part)}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Código da peça"
          value={codeDraft}
          onChange={(event) => setCodeDraft(event.target.value)}
          onKeyDown={handleEnter}
          onPaste={handlePaste}
          className="h-9 flex-1 font-mono"
          aria-label={`Novo código de peça para a classe ${series.name}`}
        />
        <Input
          placeholder="Operação"
          inputMode="numeric"
          value={operationDraft}
          onChange={(event) => setOperationDraft(event.target.value.replace(/\D/g, ''))}
          onKeyDown={handleEnter}
          className="h-9 w-28 font-mono"
          aria-label={`Operação da nova peça na classe ${series.name}`}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addPart}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Para adicionar várias, cole no campo do código as colunas CODIGO SOLDA e CONCATENAR
        copiadas da planilha.
      </p>
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
          Nenhuma classe. Sem classe, o bloco não aceita metas na importação.
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
      {value.length < MAX_CLASSES_PER_BLOCK ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...value, { key: crypto.randomUUID(), name: '', parts: [] }])}
        >
          <Plus className="size-4" />
          Adicionar classe
        </Button>
      ) : null}
    </div>
  );
}
