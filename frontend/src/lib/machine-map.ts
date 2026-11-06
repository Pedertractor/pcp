import type { BlockMachine } from '@/types/block';

export const DEFAULT_MACHINE_MAP_WIDTH = 10;
export const DEFAULT_MACHINE_MAP_HEIGHT = 7;
/** Limite inferior em % da planta (permite cards bem pequenos). */
export const MIN_MACHINE_MAP_WIDTH = 0.12;
export const MIN_MACHINE_MAP_HEIGHT = 0.12;
/** Arraste mínimo em pixels ao desenhar no mapa. */
export const MIN_MACHINE_MAP_DRAG_PX = 3;
/** Retângulo visível mínimo em pixels (só renderização). */
export const MIN_MACHINE_MAP_RENDER_PX = 2;

export type MachineMapRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
