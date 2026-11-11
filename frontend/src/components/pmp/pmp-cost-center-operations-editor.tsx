import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type CostCenterOperationsItem = {
  id: string;
  costCenter: string;
  sectorName: string;
};

type PmpCostCenterOperationsTableProps = {
  items: CostCenterOperationsItem[];
  operationsById: Record<string, number[]>;
  onChange: (id: string, operations: number[]) => void;
};

export function PmpCostCenterOperationsTable({
  items,
  operationsById,
  onChange,
}: PmpCostCenterOperationsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-24">CC</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Operações</TableHead>
            <TableHead className="w-64">Adicionar operação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <CostCenterOperationsRow
              key={item.id}
              item={item}
              operations={operationsById[item.id] ?? []}
              onChange={(next) => onChange(item.id, next)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type CostCenterOperationsRowProps = {
  item: CostCenterOperationsItem;
  operations: number[];
  onChange: (operations: number[]) => void;
};

function CostCenterOperationsRow({ item, operations, onChange }: CostCenterOperationsRowProps) {
  const [draft, setDraft] = useState('');

  function addOperation() {
    const value = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    if (!operations.includes(value)) {
      onChange([...operations, value].sort((a, b) => a - b));
    }
    setDraft('');
  }

  return (
    <TableRow>
      <TableCell className="align-middle">
        <Badge variant="outline" className="font-mono tabular-nums">
          {item.costCenter}
        </Badge>
      </TableCell>
      <TableCell className="max-w-56 truncate align-middle text-sm font-medium">
        {item.sectorName}
      </TableCell>
      <TableCell className="align-middle whitespace-normal">
        {operations.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma operação</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {operations.map((operation) => (
              <Badge
                key={operation}
                variant="secondary"
                className="gap-1 pr-1 font-mono tabular-nums"
              >
                OP {operation}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`Remover operação ${operation} do CC ${item.costCenter}`}
                  onClick={() => onChange(operations.filter((op) => op !== operation))}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="align-middle">
        <div className="flex gap-2">
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
            className="h-8 flex-1 font-mono"
            aria-label={`Nova operação para ${item.costCenter}`}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-8"
            onClick={addOperation}
            aria-label={`Adicionar operação ao CC ${item.costCenter}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
