import { useState, type PointerEvent, type RefObject } from 'react';

import { cn } from '@/lib/utils';

export type ProcessGlowPosition = {
  x: number;
  y: number;
};

type FactoryProcessGlowProps = {
  label: string;
  variant: 'laser' | 'weld';
  position: ProcessGlowPosition;
  defaultPosition: ProcessGlowPosition;
  active: boolean;
  boundsRef: RefObject<HTMLElement | null>;
  onPositionChange: (position: ProcessGlowPosition) => void;
};

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function FactoryProcessGlow({
  label,
  variant,
  position,
  defaultPosition,
  active,
  boundsRef,
  onPositionChange,
}: FactoryProcessGlowProps) {
  const [isDragging, setIsDragging] = useState(false);

  function moveToPointer(event: PointerEvent<HTMLButtonElement>): void {
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return;
    }

    onPositionChange({
      x: roundPercent(
        clampPercent(((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: roundPercent(
        clampPercent(((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    moveToPointer(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    moveToPointer(event);
  }

  function handlePointerUp(): void {
    setIsDragging(false);
  }

  function handleDoubleClick(): void {
    onPositionChange(defaultPosition);
  }

  return (
    <button
      type="button"
      aria-label={`Arrastar efeito de ${label}. Clique duas vezes para voltar à posição inicial.`}
      title="Arraste para posicionar. Duplo clique restaura."
      className={cn(
        'factory-process-glow group absolute z-10 aspect-square w-[8%] cursor-grab touch-none border-0 bg-transparent p-0 active:cursor-grabbing',
        variant === 'laser'
          ? 'factory-process-glow--laser'
          : 'factory-process-glow--weld',
        active && 'factory-process-glow--active',
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <span className="factory-process-glow__spill" />
      <span className="factory-process-glow__arc" />
      <span className="factory-process-glow__spark factory-process-glow__spark--1" />
      <span className="factory-process-glow__spark factory-process-glow__spark--2" />
      <span
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
          isDragging && 'opacity-100',
        )}
      >
        {label} {position.x.toFixed(1)}%, {position.y.toFixed(1)}%
      </span>
    </button>
  );
}
