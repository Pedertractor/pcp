import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addDaysToKey,
  EXTRA_DAY_OFFSET,
  formatShortDateKey,
  formatWeekdayKey,
} from '@/lib/iso-week';
import { cn } from '@/lib/utils';
import { openPmpExtraDay, pmpWeeklyGoalDetailQueryKey } from '@/services/pmp/pmp-goal.service';
import type { PmpWeeklyGoalDetail } from '@/types/pmp-goal';

const piecesFormatter = new Intl.NumberFormat('pt-BR');

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) {
    return [];
  }
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

function dayLabel(key: string): string {
  const weekday = formatWeekdayKey(key).replace('-feira', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatShortDateKey(key)}`;
}

type PmpExtraDayDialogProps = {
  blockId: string;
  goal: PmpWeeklyGoalDetail;
  todayKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PmpExtraDayDialog({
  blockId,
  goal,
  todayKey,
  open,
  onOpenChange,
}: PmpExtraDayDialogProps) {
  const queryClient = useQueryClient();
  const saturdayKey = addDaysToKey(goal.weekStart, EXTRA_DAY_OFFSET);
  const firstBaseKey = todayKey > goal.weekStart ? todayKey : goal.weekStart;
  const baseOptions: string[] = [];
  for (let key = firstBaseKey; key <= saturdayKey; key = addDaysToKey(key, 1)) {
    baseOptions.push(key);
  }

  const [baseKey, setBaseKey] = useState(firstBaseKey);
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setBaseKey(firstBaseKey);
    }
    onOpenChange(next);
  };

  const producedBefore = goal.dailyGoals
    .filter((day) => day.date < baseKey)
    .reduce((total, day) => total + day.producedQuantity, 0);
  const remaining = Math.max(0, goal.plannedQuantity - producedBefore);
  const targetKeys = [
    ...goal.dailyGoals.map((day) => day.date).filter((key) => key >= baseKey),
    saturdayKey,
  ];
  const split = splitEvenly(remaining, targetKeys.length);

  const mutation = useMutation({
    mutationFn: () => openPmpExtraDay(blockId, goal.id, baseKey),
    onSuccess: (updated) => {
      queryClient.setQueryData(pmpWeeklyGoalDetailQueryKey(blockId, goal.id), updated);
      void queryClient.invalidateQueries({ queryKey: ['pmp', 'blocks', blockId] });
      toast.success('Sábado aberto: saldo redistribuído.');
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-brand" aria-hidden />
            Abrir sábado
          </DialogTitle>
          <DialogDescription>
            O saldo pendente da peça {goal.productCode} será dividido do dia base até o sábado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="extra-day-base">Redistribuir a partir de</Label>
            <Select value={baseKey} onValueChange={setBaseKey}>
              <SelectTrigger id="extra-day-base" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {baseOptions.map((key) => (
                  <SelectItem key={key} value={key}>
                    {dayLabel(key)}
                    {key === todayKey ? ' (hoje)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
            <p className="text-sm">
              Saldo a distribuir:{' '}
              <span className="font-semibold tabular-nums">
                {piecesFormatter.format(remaining)} pç
              </span>
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {targetKeys.map((key, index) => (
                <li
                  key={key}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm',
                    key === saturdayKey
                      ? 'bg-amber-100 font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100'
                      : 'bg-background',
                  )}
                >
                  <span>{dayLabel(key)}</span>
                  <span className="tabular-nums">
                    {piecesFormatter.format(split[index] ?? 0)} pç
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Abrir sábado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
