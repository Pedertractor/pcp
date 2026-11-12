import { Receipt } from 'lucide-react';

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
                className="rounded-lg bg-muted/50 px-3 py-2.5"
              >
                <span className="font-mono text-sm font-semibold text-brand">
                  {cc.costCenter}
                </span>
                {cc.sectorName ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {cc.sectorName}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
