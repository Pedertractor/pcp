import { Receipt } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PmpBlockSummary } from '@/types/pmp-block';

type PmpCostCentersViewDialogProps = {
  block: PmpBlockSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PmpCostCentersViewDialog({
  block,
  open,
  onOpenChange,
}: PmpCostCentersViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4 text-brand" />
            Centros de custo
          </DialogTitle>
          <DialogDescription>
            {block.name} · {block.costCenters.length} centro
            {block.costCenters.length === 1 ? '' : 's'} de custo
          </DialogDescription>
        </DialogHeader>

        <ul className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
          {block.costCenters.length === 0 ? (
            <li className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum centro de custo vinculado.
            </li>
          ) : (
            block.costCenters.map((cc) => (
              <li
                key={cc.id}
                className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <span className="font-mono text-sm font-semibold text-brand">
                    {cc.costCenter}
                  </span>
                  {cc.sectorName ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {cc.sectorName}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  {cc.operations.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Sem OP</span>
                  ) : (
                    cc.operations.map((op) => (
                      <Badge
                        key={op.id}
                        variant="outline"
                        className="font-mono text-[11px] tabular-nums"
                      >
                        OP {op.operation}
                      </Badge>
                    ))
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
