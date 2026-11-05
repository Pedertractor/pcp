import { useMutation, useQueryClient } from '@tanstack/react-query';
import Konva from 'konva';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Group, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { usePlanImageLayout } from '@/hooks/blocks/use-plan-image-layout';
import {
  clampMapRect,
  DEFAULT_MACHINE_MAP_HEIGHT,
  DEFAULT_MACHINE_MAP_WIDTH,
  getMachineMapRect,
  isMachineOnMap,
  MIN_MACHINE_MAP_HEIGHT,
  MIN_MACHINE_MAP_WIDTH,
  percentRectToPixels,
  pixelsToPercentRect,
  rectsEqual,
  type MachineMapRect,
} from '@/lib/machine-map';
import { cn } from '@/lib/utils';
import {
  blockDetailQueryKey,
  removeMachineMapPosition,
  updateMachineMapPosition,
} from '@/services/blocks/block.service';
import type { BlockDetail, BlockMachine } from '@/types/block';

type BlockPlanMachineEditorProps = {
  block: BlockDetail;
  imageSrc: string;
  selectedMachineId: string | null;
  onSelectMachine: (machineId: string | null) => void;
};

const STROKE = 'hsl(142 76% 36%)';
const STROKE_SELECTED = 'hsl(142 76% 28%)';
const FILL = 'hsla(142, 76%, 36%, 0.22)';
const FILL_SELECTED = 'hsla(142, 76%, 36%, 0.35)';

function collectMachines(block: BlockDetail): BlockMachine[] {
  const byId = new Map<string, BlockMachine>();
  for (const line of block.lines) {
    for (const machine of line.machines) {
      if (!byId.has(machine.id)) {
        byId.set(machine.id, machine);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function displayRectForMachine(
  machine: BlockMachine,
  selectedMachineId: string | null,
  editingRects: Record<string, MachineMapRect>,
): MachineMapRect | null {
  if (machine.id === selectedMachineId) {
    if (editingRects[machine.id]) {
      return editingRects[machine.id];
    }
    if (isMachineOnMap(machine)) {
      return getMachineMapRect(machine);
    }
    return null;
  }
  if (isMachineOnMap(machine)) {
    return getMachineMapRect(machine);
  }
  return null;
}

type MachineShapeProps = {
  machine: BlockMachine;
  rect: MachineMapRect;
  planWidth: number;
  planHeight: number;
  selected: boolean;
  interactive: boolean;
  shapeRef?: RefObject<Konva.Group | null>;
  onSelect: () => void;
  onRectChange: (rect: MachineMapRect) => void;
};

function readRectFromGroup(
  group: Konva.Group,
  planWidth: number,
  planHeight: number,
): MachineMapRect {
  const minW = (MIN_MACHINE_MAP_WIDTH / 100) * planWidth;
  const minH = (MIN_MACHINE_MAP_HEIGHT / 100) * planHeight;
  const rect = group.findOne('Rect') as Konva.Rect | undefined;
  if (!rect) {
    return clampMapRect({
      x: 0,
      y: 0,
      width: DEFAULT_MACHINE_MAP_WIDTH,
      height: DEFAULT_MACHINE_MAP_HEIGHT,
    });
  }

  const scaleX = group.scaleX();
  const scaleY = group.scaleY();
  group.scaleX(1);
  group.scaleY(1);

  const width = Math.max(minW, rect.width() * scaleX);
  const height = Math.max(minH, rect.height() * scaleY);
  rect.width(width);
  rect.height(height);

  let { x, y } = group.position();
  x = Math.min(planWidth - width, Math.max(0, x));
  y = Math.min(planHeight - height, Math.max(0, y));
  group.position({ x, y });

  return pixelsToPercentRect(x, y, width, height, planWidth, planHeight);
}

function MachineShape({
  machine,
  rect,
  planWidth,
  planHeight,
  selected,
  interactive,
  shapeRef,
  onSelect,
  onRectChange,
}: MachineShapeProps) {
  const pixels = percentRectToPixels(rect, planWidth, planHeight);

  function finishInteraction(group: Konva.Group) {
    onRectChange(readRectFromGroup(group, planWidth, planHeight));
  }

  return (
    <Group
      ref={shapeRef}
      x={pixels.x}
      y={pixels.y}
      draggable={interactive && selected}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => finishInteraction(event.target as Konva.Group)}
      onTransformEnd={(event) => finishInteraction(event.target as Konva.Group)}
    >
      <Rect
        width={pixels.width}
        height={pixels.height}
        fill={selected ? FILL_SELECTED : FILL}
        stroke={selected ? STROKE_SELECTED : STROKE}
        strokeWidth={selected ? 2.5 : 2}
      />
      <Text
        x={4}
        y={4}
        text={machine.code}
        fontSize={11}
        fontStyle="bold"
        fill={STROKE_SELECTED}
        listening={false}
      />
    </Group>
  );
}

function rectFromPointerDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  planWidth: number,
  planHeight: number,
): MachineMapRect {
  const minDragPx = 6;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);

  if (dx < minDragPx && dy < minDragPx) {
    return clampMapRect({
      x:
        (start.x / planWidth) * 100 - DEFAULT_MACHINE_MAP_WIDTH / 2,
      y:
        (start.y / planHeight) * 100 - DEFAULT_MACHINE_MAP_HEIGHT / 2,
      width: DEFAULT_MACHINE_MAP_WIDTH,
      height: DEFAULT_MACHINE_MAP_HEIGHT,
    });
  }

  const x1 = Math.min(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x);
  const y2 = Math.max(start.y, end.y);
  return pixelsToPercentRect(
    x1,
    y1,
    x2 - x1,
    y2 - y1,
    planWidth,
    planHeight,
  );
}

function BlockPlanMachineEditor({
  block,
  imageSrc,
  selectedMachineId,
  onSelectMachine,
}: BlockPlanMachineEditorProps) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedShapeRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawSessionRef = useRef<{ x: number; y: number } | null>(null);
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [editingRects, setEditingRects] = useState<
    Record<string, MachineMapRect>
  >({});

  const planRect = usePlanImageLayout(
    containerRef,
    naturalSize.width,
    naturalSize.height,
  );
  const machines = useMemo(() => collectMachines(block), [block]);

  const selectedMachine = useMemo(
    () => machines.find((item) => item.id === selectedMachineId) ?? null,
    [machines, selectedMachineId],
  );

  const saveMutation = useMutation({
    mutationFn: ({
      machineId,
      rect,
    }: {
      machineId: string;
      rect: MachineMapRect;
    }) =>
      updateMachineMapPosition(block.id, machineId, {
        positionX: rect.x,
        positionY: rect.y,
        positionWidth: rect.width,
        positionHeight: rect.height,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: blockDetailQueryKey(block.id),
      });
      setEditingRects((previous) => {
        const next = { ...previous };
        delete next[variables.machineId];
        return next;
      });
      toast.success('Posição da máquina salva');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (machineId: string) =>
      removeMachineMapPosition(block.id, machineId),
    onSuccess: (_data, machineId) => {
      void queryClient.invalidateQueries({
        queryKey: blockDetailQueryKey(block.id),
      });
      setEditingRects((previous) => {
        const next = { ...previous };
        delete next[machineId];
        return next;
      });
      toast.success('Máquina removida do mapa');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const mapActionPending = saveMutation.isPending || removeMutation.isPending;

  const pendingRect = selectedMachineId
    ? editingRects[selectedMachineId]
    : undefined;

  const canConclude = useMemo(() => {
    if (!selectedMachineId || !selectedMachine) {
      return false;
    }
    const draft = editingRects[selectedMachineId];
    if (!draft) {
      return false;
    }
    if (!isMachineOnMap(selectedMachine)) {
      return true;
    }
    const saved = getMachineMapRect(selectedMachine);
    return saved !== null && !rectsEqual(draft, saved);
  }, [editingRects, selectedMachine, selectedMachineId]);

  const canRemoveFromMap = useMemo(() => {
    if (!selectedMachineId || !selectedMachine) {
      return false;
    }
    if (editingRects[selectedMachineId]) {
      return true;
    }
    return isMachineOnMap(selectedMachine);
  }, [editingRects, selectedMachine, selectedMachineId]);

  const showMapActions =
    selectedMachineId !== null && (canConclude || canRemoveFromMap);

  const placing =
    selectedMachineId !== null &&
    displayRectForMachine(
      selectedMachine ?? {
        id: '',
        code: '',
        costCenter: null,
        positionX: null,
        positionY: null,
        positionWidth: null,
        positionHeight: null,
        expectedPiecesToday: 0,
      },
      selectedMachineId,
      editingRects,
    ) === null;

  useEffect(() => {
    const transformer = transformerRef.current;
    const node = selectedShapeRef.current;
    if (!transformer) {
      return;
    }
    if (selectedMachineId && node) {
      transformer.nodes([node]);
    } else {
      transformer.nodes([]);
    }
    transformer.getLayer()?.batchDraw();
  }, [selectedMachineId, pendingRect, planRect.width, planRect.height]);

  const updateEditingRect = useCallback(
    (machineId: string, rect: MachineMapRect) => {
      setEditingRects((previous) => ({
        ...previous,
        [machineId]: clampMapRect(rect),
      }));
    },
    [],
  );

  function handleStageMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    const stage = event.target.getStage();
    if (!stage || event.target !== stage) {
      return;
    }
    if (!selectedMachineId || !selectedMachine) {
      return;
    }
    if (displayRectForMachine(selectedMachine, selectedMachineId, editingRects)) {
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }

    drawSessionRef.current = { x: pointer.x, y: pointer.y };
    setIsDrawingRect(true);
  }

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    const start = drawSessionRef.current;
    if (!start || !selectedMachineId) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return;
    }

    const rect = rectFromPointerDrag(
      start,
      pointer,
      planRect.width,
      planRect.height,
    );
    updateEditingRect(selectedMachineId, rect);
  }

  function finishDrawSession(event: Konva.KonvaEventObject<MouseEvent>) {
    const start = drawSessionRef.current;
    if (!start || !selectedMachineId) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (pointer) {
      const rect = rectFromPointerDrag(
        start,
        pointer,
        planRect.width,
        planRect.height,
      );
      updateEditingRect(selectedMachineId, rect);
    }

    drawSessionRef.current = null;
    setIsDrawingRect(false);
    event.cancelBubble = true;
  }

  function handleConcludePosition() {
    if (!selectedMachineId || !pendingRect) {
      return;
    }
    saveMutation.mutate({ machineId: selectedMachineId, rect: pendingRect });
  }

  function handleRemoveFromMap() {
    if (!selectedMachineId || !selectedMachine) {
      return;
    }

    const hasSavedPosition = isMachineOnMap(selectedMachine);
    if (!hasSavedPosition) {
      setEditingRects((previous) => {
        const next = { ...previous };
        delete next[selectedMachineId];
        return next;
      });
      return;
    }

    removeMutation.mutate(selectedMachineId);
  }

  const stageReady = planRect.width > 0 && planRect.height > 0;
  const minPixelW = (MIN_MACHINE_MAP_WIDTH / 100) * planRect.width;
  const minPixelH = (MIN_MACHINE_MAP_HEIGHT / 100) * planRect.height;

  return (
    <div ref={containerRef} className="relative size-full">
      <img
        src={imageSrc}
        alt={`Planta do ${block.name}`}
        className="size-full object-contain"
        draggable={false}
        onLoad={(event) => {
          setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
      />

      {stageReady ? (
        <div
          data-map-interactive
          className={cn(
            'absolute touch-none',
            placing || isDrawingRect
              ? 'cursor-crosshair ring-2 ring-primary/40 ring-inset'
              : undefined,
          )}
          style={{
            left: planRect.left,
            top: planRect.top,
            width: planRect.width,
            height: planRect.height,
          }}
        >
          <Stage
            width={planRect.width}
            height={planRect.height}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={finishDrawSession}
            onMouseLeave={finishDrawSession}
          >
            <Layer>
              {machines.map((machine) => {
                const rect = displayRectForMachine(
                  machine,
                  selectedMachineId,
                  editingRects,
                );
                if (!rect) {
                  return null;
                }
                const selected = machine.id === selectedMachineId;
                return (
                  <MachineShape
                    key={machine.id}
                    machine={machine}
                    rect={rect}
                    planWidth={planRect.width}
                    planHeight={planRect.height}
                    selected={selected}
                    interactive={selected}
                    shapeRef={selected ? selectedShapeRef : undefined}
                    onSelect={() => onSelectMachine(machine.id)}
                    onRectChange={(next) => updateEditingRect(machine.id, next)}
                  />
                );
              })}
              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio={false}
                ignoreStroke
                anchorSize={12}
                anchorCornerRadius={3}
                anchorStroke={STROKE_SELECTED}
                anchorFill="#ffffff"
                borderStroke={STROKE_SELECTED}
                borderStrokeWidth={1.5}
                padding={2}
                enabledAnchors={[
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                  'middle-left',
                  'middle-right',
                  'top-center',
                  'bottom-center',
                ]}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < minPixelW || newBox.height < minPixelH) {
                    return oldBox;
                  }
                  if (
                    newBox.x < 0 ||
                    newBox.y < 0 ||
                    newBox.x + newBox.width > planRect.width ||
                    newBox.y + newBox.height > planRect.height
                  ) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
      ) : null}

      {placing ? (
        <p className="pointer-events-none absolute bottom-14 right-2 z-10 max-w-[min(100%,16rem)] rounded-lg bg-card/95 px-3 py-1.5 text-right text-xs text-muted-foreground shadow-sm ring-1 ring-foreground/10">
          Clique e arraste na planta para desenhar o tamanho da máquina
        </p>
      ) : null}

      {showMapActions ? (
        <div className="absolute right-2 bottom-2 z-10 flex flex-wrap justify-end gap-2">
          {canRemoveFromMap ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mapActionPending}
              onClick={handleRemoveFromMap}
            >
              {removeMutation.isPending ? 'Removendo…' : 'Remover do mapa'}
            </Button>
          ) : null}
          {canConclude ? (
            <Button
              type="button"
              size="sm"
              disabled={mapActionPending}
              onClick={handleConcludePosition}
            >
              {saveMutation.isPending ? 'Salvando…' : 'Concluir posição'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
