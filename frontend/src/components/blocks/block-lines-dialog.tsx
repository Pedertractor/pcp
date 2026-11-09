import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Cog, Loader2Icon, MapPin, Rows3, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
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
import { isLineOnMap } from '@/lib/machine-map';
import { LineLabelAnchorPicker } from '@/components/blocks/line-label-anchor-picker';
import {
  blockDetailQueryKey,
  deleteBlockLine,
  updateLineLabelAnchor,
  updateLineMachines,
} from '@/services/blocks/block.service';
import type { BlockDetail, BlockLine, LineLabelAnchor } from '@/types/block';
import { DEFAULT_LINE_LABEL_ANCHOR } from '@/lib/machine-map';
import { cn } from '@/lib/utils';

type BlockLinesDialogProps = {
  block: BlockDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMapLine: (lineId: string) => void;
  onLineDeleted?: (lineId: string) => void;
};

export function BlockLinesDialog({
  block,
  open,
  onOpenChange,
  onMapLine,
  onLineDeleted,
}: BlockLinesDialogProps) {
  const queryClient = useQueryClient();
  const lines = block.lines ?? [];
  const machines = block.machines;

  const [selectedLineId, setSelectedLineId] = useState<string | null>(
    lines[0]?.id ?? null,
  );
  const [machineDraft, setMachineDraft] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedLine = useMemo(
    () => lines.find((line) => line.id === selectedLineId) ?? null,
    [lines, selectedLineId],
  );

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      return;
    }
    if (!selectedLineId && lines.length > 0) {
      setSelectedLineId(lines[0].id);
    }
  }, [open, lines, selectedLineId]);

  useEffect(() => {
    setConfirmDelete(false);
    if (!selectedLine) {
      setMachineDraft([]);
      return;
    }
    setMachineDraft([...selectedLine.machineIds]);
  }, [selectedLine?.id, selectedLine?.machineIds.join(',')]);

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: string) => deleteBlockLine(block.id, lineId),
    onSuccess: (updated, lineId) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      const remaining = updated.lines ?? [];
      setSelectedLineId(remaining[0]?.id ?? null);
      setConfirmDelete(false);
      onLineDeleted?.(lineId);
      toast.success('Linha excluída.');
      if (remaining.length === 0) {
        onOpenChange(false);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const labelAnchorMutation = useMutation({
    mutationFn: ({
      lineId,
      labelAnchor,
    }: {
      lineId: string;
      labelAnchor: LineLabelAnchor;
    }) => updateLineLabelAnchor(block.id, lineId, labelAnchor),
    onSuccess: (updated) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      toast.success('Posição do rótulo atualizada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const machinesMutation = useMutation({
    mutationFn: ({
      lineId,
      machineIds,
    }: {
      lineId: string;
      machineIds: string[];
    }) => updateLineMachines(block.id, lineId, machineIds),
    onSuccess: (updated) => {
      queryClient.setQueryData(blockDetailQueryKey(block.id), updated);
      toast.success('Máquinas da linha atualizadas.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleMachine = (machineId: string) => {
    setMachineDraft((current) =>
      current.includes(machineId)
        ? current.filter((id) => id !== machineId)
        : [...current, machineId],
    );
  };

  const handleSaveMachines = () => {
    if (!selectedLine) {
      return;
    }
    const sortedDraft = [...machineDraft].sort().join(',');
    const sortedSaved = [...selectedLine.machineIds].sort().join(',');
    if (sortedDraft === sortedSaved) {
      return;
    }
    machinesMutation.mutate({
      lineId: selectedLine.id,
      machineIds: machineDraft,
    });
  };

  const handleMapLine = (line: BlockLine) => {
    onOpenChange(false);
    onMapLine(line.id);
    toast.message(`Mapeie a linha ${line.code} na planta do bloco.`, {
      description: 'Use desenhar / redimensionar na coluna central, como nas máquinas.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Rows3 className="size-5 text-brand" />
            Linhas de produção
          </DialogTitle>
          <DialogDescription>
            Ajuste máquinas ou remapeie linhas existentes. Para criar, use Nova
            linha no card do bloco.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <div className="flex min-h-0 flex-col gap-3 border-b p-4 sm:border-r sm:border-b-0">
            <ul className="-mr-1 flex max-h-64 flex-col gap-1 overflow-y-auto pr-1 sm:max-h-none sm:flex-1">
              {lines.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Nenhuma linha cadastrada.
                </li>
              ) : (
                lines.map((line) => {
                  const selected = line.id === selectedLineId;
                  return (
                    <li key={line.id}>
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                          selected
                            ? 'bg-primary/15 font-medium text-foreground'
                            : 'hover:bg-muted',
                        )}
                        onClick={() => setSelectedLineId(line.id)}
                      >
                        <span className="truncate">{line.code}</span>
                        {isLineOnMap(line) ? (
                          <MapPin className="size-3.5 shrink-0 text-brand" />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
            {selectedLine ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{selectedLine.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLine.machineIds.length} máquina(s) vinculada(s)
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleMapLine(selectedLine)}
                  >
                    <MapPin className="size-4" />
                    Mapear no mapa
                  </Button>
                </div>

                <LineLabelAnchorPicker
                  value={
                    selectedLine.labelAnchor ?? DEFAULT_LINE_LABEL_ANCHOR
                  }
                  disabled={labelAnchorMutation.isPending}
                  onChange={(anchor) =>
                    labelAnchorMutation.mutate({
                      lineId: selectedLine.id,
                      labelAnchor: anchor,
                    })
                  }
                />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Cog className="size-4 text-muted-foreground" />
                    Máquinas desta linha
                  </Label>
                  <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {machines.length === 0 ? (
                      <li className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhuma máquina no bloco (sincronize o planejamento).
                      </li>
                    ) : (
                      machines.map((machine) => {
                        const assignedElsewhere =
                          machine.lineId &&
                          machine.lineId !== selectedLine.id;
                        const checked = machineDraft.includes(machine.id);
                        return (
                          <li
                            key={machine.id}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                          >
                            <input
                              type="checkbox"
                              className="size-4 shrink-0 rounded border-input"
                              checked={checked}
                              disabled={Boolean(assignedElsewhere)}
                              onChange={() => toggleMachine(machine.id)}
                            />
                            <span
                              className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 text-sm"
                              onClick={() => {
                                if (!assignedElsewhere) {
                                  toggleMachine(machine.id);
                                }
                              }}
                              onKeyDown={(event) => {
                                if (
                                  !assignedElsewhere &&
                                  (event.key === 'Enter' || event.key === ' ')
                                ) {
                                  event.preventDefault();
                                  toggleMachine(machine.id);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <span className="truncate font-medium">
                                {machine.code}
                              </span>
                              {assignedElsewhere ? (
                                <Badge variant="outline" className="shrink-0 text-xs">
                                  Outra linha
                                </Badge>
                              ) : null}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={machinesMutation.isPending}
                    onClick={handleSaveMachines}
                  >
                    {machinesMutation.isPending ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : null}
                    Salvar máquinas
                  </Button>
                </div>

                <div className="mt-auto border-t border-border/60 pt-4">
                  {confirmDelete ? (
                    <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                      <p className="text-sm font-medium">
                        Excluir a linha &quot;{selectedLine.code}&quot;?
                      </p>
                      <p className="text-xs text-muted-foreground">
                        As máquinas serão desvinculadas. A área no mapa será
                        removida. Esta ação não pode ser desfeita.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={deleteLineMutation.isPending}
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={deleteLineMutation.isPending}
                          onClick={() =>
                            deleteLineMutation.mutate(selectedLine.id)
                          }
                        >
                          {deleteLineMutation.isPending ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Confirmar exclusão
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={
                        deleteLineMutation.isPending ||
                        machinesMutation.isPending ||
                        labelAnchorMutation.isPending
                      }
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="size-4" />
                      Excluir linha
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecione ou crie uma linha para configurar.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
