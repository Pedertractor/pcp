import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PmpCostCenterOperationsEditorProps = {
  costCenter: string;
  sectorName: string;
  operations: number[];
  onChange: (operations: number[]) => void;
};

export function PmpCostCenterOperationsEditor({
  costCenter,
  sectorName,
  operations,
  onChange,
}: PmpCostCenterOperationsEditorProps) {
  const [draft, setDraft] = useState('');

  function addOperation() {
    const value = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    if (operations.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...operations, value].sort((a, b) => a - b));
    setDraft('');
  }

  function removeOperation(operation: number) {
    onChange(operations.filter((item) => item !== operation));
  }

  return (
    <p className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <span className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono tabular-nums">
          {costCenter}
        </Badge>
        <span className="min-w-0 truncate text-sm font-medium">{sectorName}</span>
      </span>
      <Label className="text-xs text-muted-foreground">Operações</Label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {operations.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma operação</span>
        ) : (
          operations.map((operation) => (
            <Badge
              key={operation}
              variant="secondary"
              className="gap-1 pr-1 font-mono tabular-nums"
            >
              OP {operation}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Remover operação ${operation}`}
                onClick={() => removeOperation(operation)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="Nº da operação"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addOperation();
            }
          }}
          className="h-9 flex-1 font-mono"
          aria-label={`Nova operação para ${costCenter}`}
        />
        <Button type="button" variant="secondary" size="sm" onClick={addOperation}>
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
    </p>
  );
}
