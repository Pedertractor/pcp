import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Cog, Loader2Icon, MapPin, Plus, Rows3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  blockDetailQueryKey,
  createBlockLine,
  updateLineMachines,
} from '@/services/blocks/block.service';
import type { BlockDetail } from '@/types/block';

type BlockCreateLineDialogProps = {
  block: BlockDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartMapping: (lineId: string) => void;
};

export function BlockCreateLineDialog({
  block,
  open,
  onOpenChange,
  onStartMapping,
}: BlockCreateLineDialogProps) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  const unassignedMachines = useMemo(
    () => block.machines.filter((machine) => !machine.lineId),
    [block.machines],
  );

  useEffect(() => {
    if (!open) {
      setCode('');
      setSelectedMachineIds([]);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async ({
      lineCode,
      machineIds,
    }: {
      lineCode: string;
      machineIds: string[];
    }) => {
      const afterCreate = await createBlockLine(block.id, lineCode);
      const created =
        afterCreate.lines?.find((line) => line.code === lineCode) ??
        afterCreate.lines?.[afterCreate.lines.length - 1];
      if (!created) {
        throw new Error('Não foi possível identificar a linha criada.');
      }
      if (machineIds.length === 0) {
        return { lineId: created.id, block: afterCreate };
      }
      const afterMachines = await updateLineMachines(
        block.id,
        created.id,
        machineIds,
      );
      return { lineId: created.id, block: afterMachines };
    },
    onSuccess: ({ lineId, block: updated }) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      onOpenChange(false);
      onStartMapping(lineId);
      toast.message('Agora desenhe a área da linha no mapa e salve.', {
        description: 'Use os botões abaixo do mapa (desenhar → salvar).',
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMachine = (machineId: string) => {
    setSelectedMachineIds((current) =>
      current.includes(machineId)
        ? current.filter((id) => id !== machineId)
        : [...current, machineId],
    );
  };

  const canContinue =
    code.trim().length > 0 &&
    selectedMachineIds.length > 0 &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,28rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="size-5 text-brand" />
            Nova linha de produção
          </DialogTitle>
          <DialogDescription>
            Escolha um código e as máquinas ainda sem linha. Na sequência você
            mapeia a área no plano do bloco.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-line-code" className="flex items-center gap-2 text-sm">
              <Rows3 className="size-4 text-muted-foreground" />
              Código da linha
            </Label>
            <Input
              id="new-line-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex.: L01"
              maxLength={40}
              autoComplete="off"
            />
          </div>

          <div className="grid min-h-0 gap-2">
            <Label className="flex items-center gap-2 text-sm">
              <Cog className="size-4 text-muted-foreground" />
              Máquinas disponíveis
            </Label>
            <p className="text-xs text-muted-foreground">
              Somente máquinas que ainda não pertencem a nenhuma linha.
            </p>
            {unassignedMachines.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                Não há máquinas livres. Libere uma máquina em outra linha ou
                sincronize o planejamento.
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {unassignedMachines.map((machine) => {
                  const checked = selectedMachineIds.includes(machine.id);
                  return (
                    <li
                      key={machine.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                    >
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 rounded border-input"
                        checked={checked}
                        onChange={() => toggleMachine(machine.id)}
                      />
                      <span className="truncate text-sm font-medium">
                        {machine.code}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-3 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!canContinue}
            onClick={() =>
              createMutation.mutate({
                lineCode: code.trim(),
                machineIds: selectedMachineIds,
              })
            }
          >
            {createMutation.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <MapPin className="size-4" />
            )}
            Continuar para mapear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
