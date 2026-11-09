import type { BlockLine, BlockMachine, LineLabelAnchor } from '@/types/block';

export type { LineLabelAnchor };
export const DEFAULT_LINE_LABEL_ANCHOR: LineLabelAnchor = 'TOP_LEFT';
export const DEFAULT_MACHINE_LABEL_ANCHOR: LineLabelAnchor = 'BOTTOM_LEFT';

/** Cantos do retângulo no mapa; o ícone com seta fica no picker (`LineLabelAnchorPicker`). */
export const LINE_LABEL_ANCHOR_OPTIONS: {
  value: LineLabelAnchor;
  label: string;
  short: string;
}[] = [
  { value: 'TOP_LEFT', label: 'Superior esquerdo', short: 'Sup. esq.' },
  { value: 'TOP_RIGHT', label: 'Superior direito', short: 'Sup. dir.' },
  { value: 'BOTTOM_LEFT', label: 'Inferior esquerdo', short: 'Inf. esq.' },
  { value: 'BOTTOM_RIGHT', label: 'Inferior direito', short: 'Inf. dir.' },
];

export const DEFAULT_MACHINE_MAP_WIDTH = 10;
export const DEFAULT_MACHINE_MAP_HEIGHT = 7;
/** Limite inferior em % da planta (permite cards bem pequenos). */
export const MIN_MACHINE_MAP_WIDTH = 0.12;
export const MIN_MACHINE_MAP_HEIGHT = 0.12;
/** Arraste mínimo em pixels ao desenhar no mapa. */
export const MIN_MACHINE_MAP_DRAG_PX = 3;

/** Espaço reservado acima do retângulo (rótulo), alinhado ao editor de máquinas. */
export const PLAN_MAP_LABEL_GUTTER = 7;

export const LINE_MAP_STROKE = 'hsl(220 12% 48%)';
export const LINE_MAP_FILL = 'hsla(220, 10%, 75%, 0.16)';
export const LINE_MAP_STROKE_SELECTED = 'hsl(220 14% 28%)';
export const LINE_MAP_FILL_SELECTED = 'hsla(220, 10%, 50%, 0.26)';
/** Retângulo visível mínimo em pixels (só renderização). */
export const MIN_MACHINE_MAP_RENDER_PX = 2;

export type MachineMapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MapPositionFields = {
  positionX: number | null;
  positionY: number | null;
  positionWidth: number | null;
  positionHeight: number | null;
};

export function isEntityOnMap(entity: MapPositionFields): boolean {
  return (
    entity.positionX !== null &&
    entity.positionY !== null &&
    entity.positionWidth !== null &&
    entity.positionHeight !== null
  );
}

export function isLineOnMap(line: BlockLine): boolean {
  return isEntityOnMap(line);
}

export function getLineMapRect(line: BlockLine): MachineMapRect | null {
  if (line.positionX === null || line.positionY === null) {
    return null;
  }
  return {
    x: line.positionX,
    y: line.positionY,
    width: line.positionWidth ?? DEFAULT_MACHINE_MAP_WIDTH,
    height: line.positionHeight ?? DEFAULT_MACHINE_MAP_HEIGHT,
  };
}

export function isMachineOnMap(machine: BlockMachine): boolean {
  return (
    machine.positionX !== null &&
    machine.positionY !== null &&
    machine.positionWidth !== null &&
    machine.positionHeight !== null
  );
}

export function getMachineMapRect(machine: BlockMachine): MachineMapRect | null {
  if (machine.positionX === null || machine.positionY === null) {
    return null;
  }
  return {
    x: machine.positionX,
    y: machine.positionY,
    width: machine.positionWidth ?? DEFAULT_MACHINE_MAP_WIDTH,
    height: machine.positionHeight ?? DEFAULT_MACHINE_MAP_HEIGHT,
  };
}

export function clampMapRect(rect: MachineMapRect): MachineMapRect {
  const width = Math.min(100, Math.max(MIN_MACHINE_MAP_WIDTH, rect.width));
  const height = Math.min(100, Math.max(MIN_MACHINE_MAP_HEIGHT, rect.height));
  const x = Math.min(100 - width, Math.max(0, rect.x));
  const y = Math.min(100 - height, Math.max(0, rect.y));
  return { x, y, width, height };
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function rectsEqual(a: MachineMapRect, b: MachineMapRect): boolean {
  return (
    roundPercent(a.x) === roundPercent(b.x) &&
    roundPercent(a.y) === roundPercent(b.y) &&
    roundPercent(a.width) === roundPercent(b.width) &&
    roundPercent(a.height) === roundPercent(b.height)
  );
}

export function percentRectToPixels(
  rect: MachineMapRect,
  planWidth: number,
  planHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (rect.x / 100) * planWidth,
    y: (rect.y / 100) * planHeight,
    width: (rect.width / 100) * planWidth,
    height: (rect.height / 100) * planHeight,
  };
}

export function pixelsToPercentRect(
  x: number,
  y: number,
  width: number,
  height: number,
  planWidth: number,
  planHeight: number,
): MachineMapRect {
  if (planWidth <= 0 || planHeight <= 0) {
    return clampMapRect({
      x: 0,
      y: 0,
      width: DEFAULT_MACHINE_MAP_WIDTH,
      height: DEFAULT_MACHINE_MAP_HEIGHT,
    });
  }
  return clampMapRect({
    x: (x / planWidth) * 100,
    y: (y / planHeight) * 100,
    width: (width / planWidth) * 100,
    height: (height / planHeight) * 100,
  });
}
