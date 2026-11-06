import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Konva from 'konva';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Transformer,
} from 'react-konva';
import { toast } from 'sonner';

import { usePlanZoom } from '@/components/blocks/plan-zoom-viewport';
import { usePlanImageLayout } from '@/hooks/blocks/use-plan-image-layout';
import { useDevicePixelRatio } from '@/hooks/use-device-pixel-ratio';
import {
  clampMapRect,
  getMachineMapRect,
  isMachineOnMap,
  MIN_MACHINE_MAP_DRAG_PX,
  MIN_MACHINE_MAP_RENDER_PX,
  percentRectToPixels,
  pixelsToPercentRect,
  rectsEqual,
  type MachineMapRect,
} from '@/lib/machine-map';
import { cn } from '@/lib/utils';
import {
  blockDetailQueryKey,
  blockPaintColorsQueryKey,
  listBlockPaintColors,
  removeMachineMapPosition,
  updateMachineMapPosition,
} from '@/services/blocks/block.service';
import type { BlockDetail, BlockMachine } from '@/types/block';
import sprayGunUrl from '@/public/pistola-de-pulverizacao-teste.png';

/** Demo visual only: máquina cujo código contém este trecho (ex.: 728). */
const DEMO_SPRAY_MACHINE_CODE = '728';
const DEMO_SPRAY_COLOR_NAME = 'amarelo caterpillar';

type BlockPlanMachineEditorProps = {
  block: BlockDetail;
  imageSrc: string;
  selectedMachineId: string | null;
  onToolbarActionsChange?: (actions: MachineMapToolbarActions | null) => void;
};

export type MachineMapMapMode = 'draw' | 'resize' | 'idle';

export type MachineMapToolbarActions = {
  canConclude: boolean;
  canRemove: boolean;
  isPending: boolean;
  mapMode: MachineMapMapMode;
  draftRect: MachineMapRect | null;
  onConclude: () => void;
  onRemove: () => void;
  onStartDraw: () => void;
  onStartResize: () => void;
  onCancelEdit: () => void;
};

const STROKE = 'hsl(142 76% 36%)';
const STROKE_SELECTED = 'hsl(142 76% 28%)';
const FILL = 'hsla(142, 76%, 36%, 0.22)';
const FILL_SELECTED = 'hsla(142, 76%, 36%, 0.35)';
const PAINT_MARK_FILL_ALPHA = 0.1;
const PAINT_MARK_FILL_SELECTED_ALPHA = 0.16;
const PAINT_MARK_STROKE_ALPHA = 0.55;
const PAINT_MARK_STROKE_SELECTED_ALPHA = 0.8;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.replace('#', '').trim();
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : raw;
  if (full.length !== 6) {
    return null;
  }
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) {
    return null;
  }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(148, 163, 184, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

const MACHINE_LABEL_HEIGHT = 5;
const MACHINE_LABEL_GAP = 1;
const MACHINE_LABEL_GUTTER = MACHINE_LABEL_HEIGHT + MACHINE_LABEL_GAP + 1;
const MACHINE_LABEL_INSET = 1.5;

function renderBoxPixels(
  rect: MachineMapRect,
  planWidth: number,
  planHeight: number,
) {
  const pixels = percentRectToPixels(rect, planWidth, planHeight);
  return {
    x: pixels.x,
    y: pixels.y + MACHINE_LABEL_GUTTER,
    width: Math.max(MIN_MACHINE_MAP_RENDER_PX, pixels.width),
    height: Math.max(MIN_MACHINE_MAP_RENDER_PX, pixels.height),
  };
}

function pointerToPlant(
  pointer: { x: number; y: number },
  planWidth: number,
  planHeight: number,
) {
  return {
    x: Math.max(0, Math.min(planWidth, pointer.x)),
    y: Math.max(0, Math.min(planHeight, pointer.y - MACHINE_LABEL_GUTTER)),
  };
}

function collectMachines(block: BlockDetail): BlockMachine[] {
  return [...block.machines].sort((a, b) => a.code.localeCompare(b.code));
}

function displayRectForMachine(
  machine: BlockMachine,
  selectedMachineId: string | null,
  editingRects: Record<string, MachineMapRect>,
  hideSelectedSaved: boolean,
): MachineMapRect | null {
  if (machine.id === selectedMachineId) {
    if (editingRects[machine.id]) {
      return editingRects[machine.id];
    }
    if (hideSelectedSaved) {
      return null;
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

function rectFromCornerDrag(
  start: { x: number; y: number },
  end: { x: number; y: number },
  planWidth: number,
  planHeight: number,
): MachineMapRect | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  if (width < MIN_MACHINE_MAP_DRAG_PX || height < MIN_MACHINE_MAP_DRAG_PX) {
    return null;
  }

  return pixelsToPercentRect(
    Math.max(0, Math.min(x, planWidth - width)),
    Math.max(0, Math.min(y, planHeight - height)),
    width,
    height,
    planWidth,
    planHeight,
  );
}

function readRectFromNode(
  node: Konva.Rect,
  planWidth: number,
  planHeight: number,
): MachineMapRect {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);
  const width = Math.max(MIN_MACHINE_MAP_RENDER_PX, node.width() * scaleX);
  const height = Math.max(MIN_MACHINE_MAP_RENDER_PX, node.height() * scaleY);
  let x = node.x();
  let y = node.y() - MACHINE_LABEL_GUTTER;
  x = Math.max(0, Math.min(planWidth - width, x));
  y = Math.max(0, Math.min(planHeight - height, y));
  node.position({ x, y: y + MACHINE_LABEL_GUTTER });
  node.size({ width, height });
  return pixelsToPercentRect(x, y, width, height, planWidth, planHeight);
}

const SPRAY_PARTICLE_COUNT = 22;

type MachineSprayPaintDemoProps = {
  machine: BlockMachine;
  rect: MachineMapRect;
  planWidth: number;
  planHeight: number;
  color: string;
};

/**
 * Simulação visual: pistola + névoa na cor (demo; remover ou trocar por dados reais depois).
 */
function MachineSprayPaintDemo({
  machine,
  rect,
  planWidth,
  planHeight,
  color,
}: MachineSprayPaintDemoProps) {
  const [gunImage, setGunImage] = useState<HTMLImageElement | null>(null);
  const [animPhase, setAnimPhase] = useState(0);

  useEffect(() => {
    const img = new window.Image();
    img.src = sprayGunUrl;
    img.onload = () => setGunImage(img);
  }, []);

  useEffect(() => {
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      setAnimPhase(frame);
    }, 33);
    return () => window.clearInterval(id);
  }, []);

  const box = renderBoxPixels(rect, planWidth, planHeight);
  const shortSide = Math.min(box.width, box.height);
  const pad = Math.max(3, shortSide * 0.05);
  const gunSize = Math.max(18, Math.min(40, shortSide * 0.38));
  const labelCenterY = box.y - MACHINE_LABEL_GAP - MACHINE_LABEL_HEIGHT / 2;
  const gunX = box.x + box.width - gunSize - pad;
  const gunY = Math.max(0, labelCenterY - gunSize / 2);
  const nozzleX = gunX + gunSize * 0.78;
  const nozzleY = gunY + gunSize * 0.55;
  const t = animPhase * 0.12;

  const particles = Array.from({ length: SPRAY_PARTICLE_COUNT }, (_, i) => {
    const seed = i * 1.7 + machine.code.length;
    const travel = ((t + seed * 0.35) % 3.2) / 3.2;
    const lane = Math.sin(seed * 12.9898) * 0.6 + Math.sin(seed * 4.1 + t * 2) * 0.4;
    const spread = lane * travel * gunSize * 0.5;
    const px = nozzleX + travel * gunSize * 1.55;
    const py = nozzleY + spread;
    const opacity = Math.max(0.08, 0.82 * (1 - travel ** 1.05));
    const radius = 1.8 + travel * 4.5 + (i % 3) * 0.5;
    return { px, py, opacity, radius, key: i };
  });

  return (
    <Group listening={false} name={`spray-demo-${machine.id}`}>
      {/* Pistola primeiro: partículas por cima (PNG escuro cobria o spray). */}
      {gunImage ? (
        <KonvaImage
          image={gunImage}
          x={gunX}
          y={gunY}
          width={gunSize}
          height={gunSize}
          listening={false}
        />
      ) : null}
      {particles.map((p) => (
        <Circle
          key={p.key}
          x={p.px}
          y={p.py}
          radius={p.radius}
          fill={color}
          opacity={p.opacity}
          shadowColor={color}
          shadowBlur={6}
          shadowOpacity={0.55}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  );
}

type MachineShapeProps = {
  machine: BlockMachine;
  rect: MachineMapRect;
  planWidth: number;
  planHeight: number;
  selected: boolean;
  dashed?: boolean;
  listening?: boolean;
  paintHex?: string | null;
  shapeRef?: RefObject<Konva.Rect | null>;
  onContextMenu?: (event: Konva.KonvaEventObject<PointerEvent>) => void;
  onTransformEnd?: () => void;
};

function MachineShape({
  machine,
  rect,
  planWidth,
  planHeight,
  selected,
  dashed = false,
  listening = false,
  paintHex = null,
  shapeRef,
  onContextMenu,
  onTransformEnd,
}: MachineShapeProps) {
  const box = renderBoxPixels(rect, planWidth, planHeight);
  const fill = dashed
    ? 'transparent'
    : paintHex
      ? hexToRgba(
          paintHex,
          selected ? PAINT_MARK_FILL_SELECTED_ALPHA : PAINT_MARK_FILL_ALPHA,
        )
      : selected
        ? FILL_SELECTED
        : FILL;
  const stroke = paintHex
    ? hexToRgba(
        paintHex,
        selected ? PAINT_MARK_STROKE_SELECTED_ALPHA : PAINT_MARK_STROKE_ALPHA,
      )
    : selected
      ? STROKE_SELECTED
      : STROKE;

  return (
    <Group listening={listening} name={machine.code}>
      <Rect
        ref={shapeRef}
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? 1.25 : 1}
        dash={dashed ? [10, 6] : undefined}
        opacity={dashed ? 1 : selected ? 1 : 0.9}
        onContextMenu={onContextMenu}
        onTransformEnd={onTransformEnd}
      />
    </Group>
  );
}

export function BlockPlanMachineEditor({
  block,
  imageSrc,
  selectedMachineId,
  onToolbarActionsChange,
}: BlockPlanMachineEditorProps) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectorRectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const createDraftRef = useRef<MachineMapRect | null>(null);

  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [mapMode, setMapMode] = useState<MachineMapMapMode>('idle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [createDraftRect, setCreateDraftRect] = useState<MachineMapRect | null>(
    null,
  );
  const [editingRects, setEditingRects] = useState<
    Record<string, MachineMapRect>
  >({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const planRect = usePlanImageLayout(
    containerRef,
    naturalSize.width,
    naturalSize.height,
  );
  const pixelRatio = useDevicePixelRatio();
  // Konva reads its pixel ratio once at load; it must be set before the Stage
  // (keyed by pixelRatio below) recreates its canvases.
  Konva.pixelRatio = pixelRatio;
  const machines = useMemo(() => collectMachines(block), [block]);

  const selectedMachine = useMemo(
    () => machines.find((item) => item.id === selectedMachineId) ?? null,
    [machines, selectedMachineId],
  );

  /** Retângulo salvo no backend (só muda quando as posições persistidas mudam). */
  const savedMapRectForZoom = useMemo((): MachineMapRect | null => {
    if (!selectedMachine || !isMachineOnMap(selectedMachine)) {
      return null;
    }
    return getMachineMapRect(selectedMachine);
  }, [
    selectedMachineId,
    selectedMachine?.positionX,
    selectedMachine?.positionY,
    selectedMachine?.positionWidth,
    selectedMachine?.positionHeight,
  ]);

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
      setCreateDraftRect(null);
      createDraftRef.current = null;
      setMapMode('idle');
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
      setCreateDraftRect(null);
      createDraftRef.current = null;
      setMapMode('idle');
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

  const hideSelectedSaved = mapMode === 'draw';

  const canConclude = useMemo(() => {
    if (!selectedMachineId || !selectedMachine || !pendingRect) {
      return false;
    }
    if (!isMachineOnMap(selectedMachine)) {
      return true;
    }
    const saved = getMachineMapRect(selectedMachine);
    return saved !== null && !rectsEqual(pendingRect, saved);
  }, [editingRects, pendingRect, selectedMachine, selectedMachineId]);

  const canRemoveFromMap = useMemo(() => {
    if (!selectedMachineId || !selectedMachine) {
      return false;
    }
    if (editingRects[selectedMachineId]) {
      return true;
    }
    return isMachineOnMap(selectedMachine);
  }, [editingRects, selectedMachine, selectedMachineId]);

  const resetDrawDraft = useCallback(() => {
    drawStartRef.current = null;
    createDraftRef.current = null;
    setCreateDraftRect(null);
    setIsDrawing(false);
  }, []);

  const cancelEdit = useCallback(() => {
    resetDrawDraft();
    setMapMode('idle');
    setContextMenu(null);
    if (selectedMachineId) {
      setEditingRects((previous) => {
        const next = { ...previous };
        delete next[selectedMachineId];
        return next;
      });
    }
  }, [resetDrawDraft, selectedMachineId]);

  const startDraw = useCallback(() => {
    if (!selectedMachineId) {
      return;
    }
    resetDrawDraft();
    setContextMenu(null);
    setMapMode('draw');
    setEditingRects((previous) => {
      const next = { ...previous };
      delete next[selectedMachineId];
      return next;
    });
  }, [resetDrawDraft, selectedMachineId]);

  const startResize = useCallback(() => {
    if (!selectedMachineId || !selectedMachine) {
      return;
    }
    const base =
      editingRects[selectedMachineId] ?? getMachineMapRect(selectedMachine);
    if (!base) {
      startDraw();
      return;
    }
    resetDrawDraft();
    setContextMenu(null);
    setMapMode('resize');
    setEditingRects((previous) => ({
      ...previous,
      [selectedMachineId]: base,
    }));
  }, [editingRects, resetDrawDraft, selectedMachine, selectedMachineId, startDraw]);

  useEffect(() => {
    if (!selectedMachineId || !selectedMachine) {
      resetDrawDraft();
      setMapMode('idle');
      setContextMenu(null);
      return;
    }
    resetDrawDraft();
    setContextMenu(null);
    if (isMachineOnMap(selectedMachine)) {
      setMapMode('idle');
    } else {
      setMapMode('draw');
    }
    setEditingRects((previous) => {
      if (!previous[selectedMachineId]) {
        return previous;
      }
      const next = { ...previous };
      delete next[selectedMachineId];
      return next;
    });
  }, [resetDrawDraft, selectedMachine, selectedMachineId]);

  useEffect(() => {
    if (mapMode !== 'resize' || !transformerRef.current || !sectorRectRef.current) {
      transformerRef.current?.nodes([]);
      return;
    }
    transformerRef.current.nodes([sectorRectRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [mapMode, pendingRect, planRect.width, planRect.height, pixelRatio]);

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
    setContextMenu(null);
    if (mapMode !== 'draw' || !selectedMachineId) {
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

    const plantPoint = pointerToPlant(pointer, planRect.width, planRect.height);
    setIsDrawing(true);
    drawStartRef.current = plantPoint;
    setCreateDraftRect(null);
    createDraftRef.current = null;
  }

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent>) {
    const start = drawStartRef.current;
    if (mapMode !== 'draw' || !isDrawing || !start || !selectedMachineId) {
      return;
    }

    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) {
      return;
    }

    const plantPoint = pointerToPlant(pointer, planRect.width, planRect.height);
    const next = rectFromCornerDrag(
      start,
      plantPoint,
      planRect.width,
      planRect.height,
    );
    createDraftRef.current = next;
    setCreateDraftRect(next);
  }

  function handleStageMouseUp() {
    if (mapMode !== 'draw' || !isDrawing || !selectedMachineId) {
      return;
    }

    setIsDrawing(false);
    drawStartRef.current = null;

    const draft = createDraftRef.current;
    if (!draft) {
      setCreateDraftRect(null);
      toast.error('Desenhe uma área no mapa antes de salvar.');
      return;
    }

    updateEditingRect(selectedMachineId, draft);
    setCreateDraftRect(null);
    createDraftRef.current = null;
    setMapMode('idle');
  }

  function handleTransformEnd() {
    if (mapMode !== 'resize' || !selectedMachineId || !sectorRectRef.current) {
      return;
    }
    updateEditingRect(
      selectedMachineId,
      readRectFromNode(
        sectorRectRef.current,
        planRect.width,
        planRect.height,
      ),
    );
  }

  function openContextMenu(
    event: Konva.KonvaEventObject<PointerEvent>,
  ) {
    event.evt.preventDefault();
    const container = containerRef.current;
    if (!container || mapMode === 'draw') {
      return;
    }
    const bounds = container.getBoundingClientRect();
    setContextMenu({
      x: event.evt.clientX - bounds.left,
      y: event.evt.clientY - bounds.top,
    });
  }

  const handleConcludePosition = useCallback(() => {
    if (!selectedMachineId || !pendingRect) {
      toast.error('Desenhe uma área no mapa antes de salvar.');
      return;
    }
    saveMutation.mutate({ machineId: selectedMachineId, rect: pendingRect });
  }, [pendingRect, saveMutation, selectedMachineId]);

  const handleRemoveFromMap = useCallback(() => {
    if (!selectedMachineId || !selectedMachine) {
      return;
    }

    const hasSavedPosition = isMachineOnMap(selectedMachine);
    cancelEdit();
    if (!hasSavedPosition) {
      return;
    }

    removeMutation.mutate(selectedMachineId);
  }, [cancelEdit, removeMutation, selectedMachine, selectedMachineId]);

  useEffect(() => {
    if (!onToolbarActionsChange) {
      return;
    }
    if (!selectedMachineId || !selectedMachine) {
      onToolbarActionsChange(null);
      return;
    }
    onToolbarActionsChange({
      canConclude,
      canRemove: canRemoveFromMap,
      isPending: mapActionPending,
      mapMode,
      draftRect: pendingRect ?? createDraftRect,
      onConclude: handleConcludePosition,
      onRemove: handleRemoveFromMap,
      onStartDraw: startDraw,
      onStartResize: startResize,
      onCancelEdit: cancelEdit,
    });
  }, [
    canConclude,
    canRemoveFromMap,
    cancelEdit,
    createDraftRect,
    handleConcludePosition,
    handleRemoveFromMap,
    mapActionPending,
    mapMode,
    onToolbarActionsChange,
    pendingRect,
    selectedMachine,
    selectedMachineId,
    startDraw,
    startResize,
  ]);

  const mappingActive = selectedMachineId !== null && selectedMachine !== null;
  const stageReady = planRect.width > 0 && planRect.height > 0;

  const planZoom = usePlanZoom();

  useEffect(() => {
    if (!planZoom || !stageReady) {
      return;
    }
    if (!selectedMachineId) {
      planZoom.resetView();
      return;
    }

    // Sem mapeamento ou modo "desenhar caixa": estaca zero (100%) para o usuário dar zoom manual onde quiser.
    if (hideSelectedSaved || !savedMapRectForZoom) {
      planZoom.resetView();
      return;
    }

    // Já mapeada (resize/visualizar): amplia e centraliza na posição salva — não depende de editingRects
    // para não brigar com o zoom durante arrastar/redimensionar.
    const pixels = percentRectToPixels(
      savedMapRectForZoom,
      planRect.width,
      planRect.height,
    );
    planZoom.focusRect({
      x: planRect.left + pixels.x,
      y: planRect.top + pixels.y - MACHINE_LABEL_GUTTER,
      width: pixels.width,
      height: pixels.height + MACHINE_LABEL_GUTTER,
    });
  }, [
    planZoom,
    selectedMachineId,
    stageReady,
    hideSelectedSaved,
    savedMapRectForZoom,
    planRect.left,
    planRect.top,
    planRect.width,
    planRect.height,
  ]);
  const minTransformPx = MIN_MACHINE_MAP_DRAG_PX;

  const paintColorsQuery = useQuery({
    queryKey: blockPaintColorsQueryKey(block.id),
    queryFn: () => listBlockPaintColors(block.id),
  });
  const demoSprayColor =
    paintColorsQuery.data?.find(
      (row) =>
        row.name.trim().replace(/\s+/g, ' ').toLowerCase() ===
        DEMO_SPRAY_COLOR_NAME,
    )?.mapHex ?? null;

  const demoSprayMachine = useMemo(() => {
    for (const machine of machines) {
      if (!machine.code.includes(DEMO_SPRAY_MACHINE_CODE)) {
        continue;
      }
      const rect = displayRectForMachine(
        machine,
        selectedMachineId,
        editingRects,
        hideSelectedSaved,
      );
      if (rect) {
        return { machine, rect };
      }
    }
    return null;
  }, [machines, selectedMachineId, editingRects, hideSelectedSaved]);

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
          {...(mappingActive ? { 'data-map-interactive': true } : {})}
          className={cn(
            'absolute touch-none',
            mappingActive &&
              mapMode === 'draw' &&
              'cursor-crosshair ring-2 ring-primary/40 ring-inset',
          )}
          style={{
            left: planRect.left,
            top: planRect.top - MACHINE_LABEL_GUTTER,
            width: planRect.width,
            height: planRect.height + MACHINE_LABEL_GUTTER,
          }}
          onClick={() => setContextMenu(null)}
        >
          <Stage
            key={pixelRatio}
            width={planRect.width}
            height={planRect.height + MACHINE_LABEL_GUTTER}
            onMouseDown={mappingActive ? handleStageMouseDown : undefined}
            onMouseMove={mappingActive ? handleStageMouseMove : undefined}
            onMouseUp={mappingActive ? handleStageMouseUp : undefined}
            onMouseLeave={mappingActive ? handleStageMouseUp : undefined}
          >
            <Layer>
              {machines.map((machine) => {
                const rect = displayRectForMachine(
                  machine,
                  selectedMachineId,
                  editingRects,
                  hideSelectedSaved,
                );
                if (!rect) {
                  return null;
                }
                const selected = machine.id === selectedMachineId;
                const isResizeTarget = selected && mapMode === 'resize';
                const isSprayTarget =
                  demoSprayMachine?.machine.id === machine.id;
                return (
                  <MachineShape
                    key={machine.id}
                    machine={machine}
                    rect={rect}
                    planWidth={planRect.width}
                    planHeight={planRect.height}
                    selected={selected}
                    paintHex={isSprayTarget ? demoSprayColor : null}
                    listening={isResizeTarget}
                    shapeRef={isResizeTarget ? sectorRectRef : undefined}
                    onContextMenu={
                      selected && mapMode !== 'draw'
                        ? openContextMenu
                        : undefined
                    }
                    onTransformEnd={
                      isResizeTarget ? handleTransformEnd : undefined
                    }
                  />
                );
              })}

              {demoSprayMachine && demoSprayColor ? (
                <MachineSprayPaintDemo
                  machine={demoSprayMachine.machine}
                  rect={demoSprayMachine.rect}
                  planWidth={planRect.width}
                  planHeight={planRect.height}
                  color={demoSprayColor}
                />
              ) : null}

              {mapMode === 'draw' && createDraftRect && selectedMachine ? (
                <MachineShape
                  key="create-draft"
                  machine={selectedMachine}
                  rect={createDraftRect}
                  planWidth={planRect.width}
                  planHeight={planRect.height}
                  selected
                  dashed
                />
              ) : null}

              {mapMode === 'resize' ? (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  keepRatio={false}
                  ignoreStroke
                  anchorSize={12}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (
                      newBox.width < minTransformPx ||
                      newBox.height < minTransformPx
                    ) {
                      return oldBox;
                    }
                    if (
                      newBox.x < 0 ||
                      newBox.y < MACHINE_LABEL_GUTTER ||
                      newBox.x + newBox.width > planRect.width ||
                      newBox.y + newBox.height >
                        planRect.height + MACHINE_LABEL_GUTTER
                    ) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              ) : null}
            </Layer>
          </Stage>

          <div className="pointer-events-none absolute inset-0">
            {machines.map((machine) => {
              const rect = displayRectForMachine(
                machine,
                selectedMachineId,
                editingRects,
                hideSelectedSaved,
              );
              if (!rect) {
                return null;
              }
              const box = renderBoxPixels(
                rect,
                planRect.width,
                planRect.height,
              );
              const shortSide = Math.min(box.width, box.height);
              const labelFont = Math.max(3, Math.min(8, shortSide * 0.11));
              const labelPadY = Math.max(1, labelFont * 0.18);
              const labelPadX = Math.max(2, labelFont * 0.4);
              return (
                <span
                  key={machine.id}
                  className="absolute font-bold tabular-nums whitespace-nowrap"
                  style={{
                    left: box.x + MACHINE_LABEL_INSET,
                    top: box.y + box.height - MACHINE_LABEL_INSET,
                    fontSize: labelFont,
                    lineHeight: 1,
                    padding: `${labelPadY}px ${labelPadX}px`,
                    color: '#1c1c1c',
                    background: '#ffffff',
                    transform: 'translateY(-100%)',
                  }}
                >
                  {machine.code}
                </span>
              );
            })}
          </div>

          {contextMenu ? (
            <div
              className="absolute z-30 min-w-44 rounded-md border border-border bg-card p-1 shadow-lg"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  startResize();
                  setContextMenu(null);
                }}
              >
                Redimensionar área
              </button>
              <button
                type="button"
                className="flex w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  startDraw();
                  setContextMenu(null);
                }}
              >
                Desenhar nova área
              </button>
            </div>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
