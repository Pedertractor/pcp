import { useQuery } from '@tanstack/react-query';

import { BlockProductionOrderPartPreview } from '@/components/blocks/block-production-order-part-preview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPmpWeeklyGoalPartPreview,
  pmpWeeklyGoalPartPreviewQueryKey,
} from '@/services/pmp/pmp-goal.service';

type PmpPartDetailsDialogProps = {
  blockId: string;
  goalId: string;
  productCode: string;
  productName: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PmpPartDetailsDialog({
  blockId,
  goalId,
  productCode,
  productName,
  open,
  onOpenChange,
}: PmpPartDetailsDialogProps) {
  const previewQuery = useQuery({
    queryKey: pmpWeeklyGoalPartPreviewQueryKey(blockId, goalId),
    queryFn: () => getPmpWeeklyGoalPartPreview(blockId, goalId),
    enabled: open && blockId.length > 0 && goalId.length > 0,
    staleTime: 5 * 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Peça {productCode}</DialogTitle>
          <DialogDescription>{productName ?? 'Imagem da peça'}</DialogDescription>
        </DialogHeader>
        {previewQuery.isError ? (
          <p className="text-sm text-destructive">{previewQuery.error.message}</p>
        ) : (
          <BlockProductionOrderPartPreview
            imageUrl={previewQuery.data?.imageUrl}
            isLoading={previewQuery.isPending}
            label={`Peça ${productCode}`}
            className="min-h-64"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
