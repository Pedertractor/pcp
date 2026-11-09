import { useMutation, useQueryClient } from '@tanstack/react-query';
import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Group, Label, Layer, Rect, Stage, Tag, Text } from 'react-konva';
import { toast } from 'sonner';

import type { MachineMapToolbarActions } from '@/components/blocks/block-plan-machine-editor';
import { usePlanZoom } from '@/components/blocks/plan-zoom-viewport';
import { usePlanImageLayout } from '@/hooks/blocks/use-plan-image-layout';
import { useDevicePixelRatio } from '@/hooks/use-device-pixel-ratio';
import {
  clampMapRect,
  getLineMapRect,
  isLineOnMap,
  LINE_MAP_FILL_SELECTED,
  LINE_MAP_STROKE_SELECTED,
  MIN_MACHINE_MAP_DRAG_PX,
  MIN_MACHINE_MAP_RENDER_PX,
  percentRectToPixels,
  pixelsToPercentRect,
  PLAN_MAP_LABEL_GUTTER,
  rectsEqual,
  type MachineMapRect,
} from '@/lib/machine-map';
import { cn } from '@/lib/utils';
import {
  blockDetailQueryKey,
  removeLineMapPosition,
  updateLineMapPosition,
} from '@/services/blocks/block.service';
import type { BlockDetail } from '@/types/block';

function rectFromCornerDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  planWidth: number,
  planHeight: number,
): MachineMapRect | null {
  const widthPx = Math.abs(end.x - start.x);
  const heightPx = Math.abs(end.y - start.y);
  if (widthPx < MIN_MACHINE_MAP_DRAG_PX || heightPx < MIN_MACHINE_MAP_DRAG_PX) {
    return null;
  }
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return pixelsToPercentRect(x, y, widthPx, heightPx, planWidth, planHeight);
}

type BlockPlanLineMapEditorProps = {
  block: BlockDetail;
  imageSrc: string;
  selectedLineId: string;
  className?: string;
  onToolbarActionsChange?: (actions: MachineMapToolbarActions | null) => void;
};

export function BlockPlanLineMapEditor({
  block,
  imageSrc,
  selectedLineId,
  className,
  onToolbarActionsChange,
}: BlockPlanLineMapEditorProps) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const createDraftRef = useRef<MachineMapRect | null>(null);

  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [mapMode, setMapMode] = useState<'draw' | 'idle'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [createDraftRect, setCreateDraftRect] = useState<MachineMapRect | null>(null);
  const [editingRect, setEditingRect] = useState<MachineMapRect | null>(null);

  const lines = block.lines ?? [];
  const selectedLine = useMemo(
    () => lines.find((line) => line.id === selectedLineId) ?? null,
    [lines, selectedLineId],
  );

  const planRect = usePlanImageLayout(
    containerRef,
    naturalSize.width,
    naturalSize.height,
  );
  const pixelRatio = useDevicePixelRatio();
  Konva.pixelRatio = pixelRatio;

  useEffect(() => {
    setMapMode(
      selectedLine && isLineOnMap(selectedLine) ? 'idle' : 'draw',
    );
    setEditingRect(null);
    setCreateDraftRect(null);
    createDraftRef.current = null;
    drawStartRef.current = null;
    setIsDrawing(false);
  }, [selectedLineId, selectedLine?.positionX, selectedLine?.positionY]);

  const pendingRect = editingRect ?? createDraftRect;

  const saveMutation = useMutation({
    mutationFn: (rect: MachineMapRect) =>
      updateLineMapPosition(block.id, selectedLineId, {
        positionX: rect.x,
        positionY: rect.y,
        positionWidth: rect.width,
        positionHeight: rect.height,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockDetailQueryKey(block.id) });
      setEditingRect(null);
      setCreateDraftRect(null);
      setMapMode('idle');
      toast.success('Área da linha salva no mapa');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeLineMapPosition(block.id, selectedLineId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockDetailQueryKey(block.id) });
      setEditingRect(null);
      setMapMode('draw');
      toast.success('Linha removida do mapa');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const displayRect = useMemo(() => {
    if (pendingRect) {
      return pendingRect;
    }
    if (selectedLine && isLineOnMap(selectedLine)) {
      return getLineMapRect(selectedLine);
    }
    return null;
  }, [pendingRect, selectedLine]);

  const savedMapRectForZoom = useMemo((): MachineMapRect | null => {
    if (!selectedLine || !isLineOnMap(selectedLine)) {
      return null;
    }
    return getLineMapRect(selectedLine);
  }, [
    selectedLine,
    selectedLine?.positionX,
    selectedLine?.positionY,
    selectedLine?.positionWidth,
    selectedLine?.positionHeight,
  ]);

  const hideSelectedSaved = mapMode === 'draw';
  const planZoom = usePlanZoom();
  const stageReady = planRect.width > 0 && planRect.height > 0;

  useEffect(() => {
    if (!planZoom || !stageReady) {
      return;
    }
    if (hideSelectedSaved || !savedMapRectForZoom) {
      planZoom.resetView();
      return;
    }
    const pixels = percentRectToPixels(
      savedMapRectForZoom,
      planRect.width,
      planRect.height,
    );
    planZoom.focusRect({
      x: planRect.left + pixels.x,
      y: planRect.top + pixels.y - PLAN_MAP_LABEL_GUTTER,
      width: pixels.width,
      height: pixels.height + PLAN_MAP_LABEL_GUTTER,
    });
  }, [
    hideSelectedSaved,
    planRect.height,
    planRect.left,
    planRect.top,
    planRect.width,
    planZoom,
    savedMapRectForZoom,
    stageReady,
  ]);

  const canConclude = useMemo(() => {
    if (!pendingRect || !selectedLine) {
      return false;
    }
    if (!isLineOnMap(selectedLine)) {
      return true;
    }
    const saved = getLineMapRect(selectedLine);
    return saved !== null && !rectsEqual(pendingRect, saved);
  }, [pendingRect, selectedLine]);

  const startDraw = useCallback(() => {
    setMapMode('draw');
    setEditingRect(null);
    setCreateDraftRect(null);
    createDraftRef.current = null;
    drawStartRef.current = null;
    setIsDrawing(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingRect(null);
    setCreateDraftRect(null);
    createDraftRef.current = null;
    drawStartRef.current = null;
    setIsDrawing(false);
    setMapMode(selectedLine && isLineOnMap(selectedLine) ? 'idle' : 'draw');
  }, [selectedLine]);

  const handleConclude = useCallback(() => {
    const rect = pendingRect;
    if (!rect) {
      toast.error('Desenhe uma área no mapa antes de salvar.');
      return;
    }
    saveMutation.mutate(rect);
  }, [pendingRect, saveMutation]);

  const handleRemove = useCallback(() => {
    if (!selectedLine) {
      return;
    }
    if (pendingRect || !isLineOnMap(selectedLine)) {
      cancelEdit();
      return;
    }
    removeMutation.mutate();
  }, [cancelEdit, pendingRect, removeMutation, selectedLine]);

  const mapActionPending = saveMutation.isPending || removeMutation.isPending;

  useEffect(() => {
    if (!onToolbarActionsChange || !selectedLine) {
      onToolbarActionsChange?.(null);
      return;
    }
    onToolbarActionsChange({
      canConclude,
      canRemove: Boolean(pendingRect) || (selectedLine && isLineOnMap(selectedLine)),
      isPending: mapActionPending,
      mapMode: mapMode === 'draw' ? 'draw' : 'idle',
      draftRect: pendingRect,
      onConclude: handleConclude,
      onRemove: handleRemove,
      onStartDraw: startDraw,
      onStartResize: () => {
        toast.message('Para linhas, desenhe uma nova área (substitui a anterior ao salvar).');
      },
      onCancelEdit: cancelEdit,
    });
  }, [
    canConclude,
    cancelEdit,
    handleConclude,
    handleRemove,
    mapActionPending,
    mapMode,
    onToolbarActionsChange,
    pendingRect,
    selectedLine,
    startDraw,
  ]);

  function handleStageMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    if (mapMode !== 'draw') {
      return;
    }
    const stage = event.target.getStage();
    if (!stage || event.target !== stage) {
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) {
      return;
    }
    setIsDrawing(true);
    drawStartRef.current = {
      x: Math.max(0, Math.min(planRect.width, pointer.x)),
      y: Math.max(0, Math.min(planRect.height, pointer.y)),
    };
    setCreateDraftRect(null);
    createDraftRef.current = null;
  }

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    const start = drawStartRef.current;
    if (mapMode !== 'draw' || !isDrawing || !start) {
      return;
    }
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) {
      return;
    }
    const end = {
      x: Math.max(0, Math.min(planRect.width, pointer.x)),
      y: Math.max(0, Math.min(planRect.height, pointer.y)),
    };
    const next = rectFromCornerDrag(start, end, planRect.width, planRect.height);
    createDraftRef.current = next;
    setCreateDraftRect(next);
  }

  function handleStageMouseUp() {
    if (mapMode !== 'draw' || !isDrawing) {
      return;
    }
    setIsDrawing(false);
    drawStartRef.current = null;
    const draft = createDraftRef.current;
    if (!draft) {
      setCreateDraftRect(null);
      toast.error('Desenhe uma área maior no mapa.');
      return;
    }
    setEditingRect(clampMapRect(draft));
    setCreateDraftRect(null);
    createDraftRef.current = null;
    setMapMode('idle');
  }

  return (
    <div ref={containerRef} className={cn('pointer-events-auto size-full', className)}>
      <img
        src={imageSrc}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-contain opacity-0"
        draggable={false}
        onLoad={(event) => {
          setNaturalSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
      />
      {stageReady && (mapMode === 'draw' || displayRect) ? (
        <div
          data-map-interactive
          className={cn(
            'absolute touch-none',
            mapMode === 'draw' && 'cursor-crosshair ring-2 ring-brand/50 ring-inset',
          )}
          style={{
            left: planRect.left,
            top: planRect.top - PLAN_MAP_LABEL_GUTTER,
            width: planRect.width,
            height: planRect.height + PLAN_MAP_LABEL_GUTTER,
          }}
        >
          <Stage
            width={planRect.width}
            height={planRect.height + PLAN_MAP_LABEL_GUTTER}
            onMouseDown={mapMode === 'draw' ? handleStageMouseDown : undefined}
            onMouseMove={mapMode === 'draw' ? handleStageMouseMove : undefined}
            onMouseUp={mapMode === 'draw' ? handleStageMouseUp : undefined}
            onMouseLeave={mapMode === 'draw' ? handleStageMouseUp : undefined}
          >
            <Layer>
              {displayRect ? (() => {
                const pixels = percentRectToPixels(
                  displayRect,
                  planRect.width,
                  planRect.height,
                );
                const labelY = pixels.y;
                return (
                  <Group>
                    <Rect
                      x={pixels.x}
                      y={pixels.y + PLAN_MAP_LABEL_GUTTER}
                      width={Math.max(MIN_MACHINE_MAP_RENDER_PX, pixels.width)}
                      height={Math.max(MIN_MACHINE_MAP_RENDER_PX, pixels.height)}
                      fill={LINE_MAP_FILL_SELECTED}
                      stroke={LINE_MAP_STROKE_SELECTED}
                      strokeWidth={3}
                      dash={[10, 5]}
                    />
                    <Label x={pixels.x} y={labelY}>
                      <Tag
                        fill="hsl(220 10% 22%)"
                        stroke={LINE_MAP_STROKE_SELECTED}
                        strokeWidth={1}
                        cornerRadius={4}
                        pointerDirection="down"
                        pointerWidth={8}
                        pointerHeight={5}
                      />
                      <Text
                        text={selectedLine?.code ?? 'Linha'}
                        fontSize={12}
                        fontStyle="bold"
                        fill="hsl(0 0% 98%)"
                        padding={5}
                      />
                    </Label>
                  </Group>
                );
              })() : null}
            </Layer>
          </Stage>
        </div>
      ) : null}
    </div>
  );
}
