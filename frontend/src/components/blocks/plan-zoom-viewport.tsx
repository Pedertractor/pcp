import { Minus, Plus, RotateCcw } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const BUTTON_STEP = 1.5;

type View = { scale: number; x: number; y: number };

const INITIAL_VIEW: View = { scale: 1, x: 0, y: 0 };

type PlanZoomViewportProps = {
  children: ReactNode;
  className?: string;
};

function clampView(view: View, width: number, height: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale));
  if (scale === MIN_SCALE) {
    return INITIAL_VIEW;
  }
  return {
    scale,
    x: Math.min(0, Math.max(width * (1 - scale), view.x)),
    y: Math.min(0, Math.max(height * (1 - scale), view.y)),
  };
}

export function PlanZoomViewport({ children, className }: PlanZoomViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  );
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [dragging, setDragging] = useState(false);

  const zoomAt = useCallback(
    (factor: number, pointX?: number, pointY?: number) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }
      const { width, height } = viewport.getBoundingClientRect();
      const px = pointX ?? width / 2;
      const py = pointY ?? height / 2;

      setView((current) => {
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, current.scale * factor),
        );
        const ratio = scale / current.scale;
        return clampView(
          {
            scale,
            x: px - (px - current.x) * ratio,
            y: py - (py - current.y) * ratio,
          },
          width,
          height,
        );
      });
    },
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = viewport!.getBoundingClientRect();
      zoomAt(
        Math.exp(-event.deltaY * 0.0015),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const { width, height } = viewport.getBoundingClientRect();
      setView((current) => clampView(current, width, height));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (view.scale === MIN_SCALE || event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewport) {
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    const { width, height } = viewport.getBoundingClientRect();
    setView((current) =>
      clampView(
        { ...current, x: current.x + dx, y: current.y + dy },
        width,
        height,
      ),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
  }

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (view.scale >= MAX_SCALE) {
      setView(INITIAL_VIEW);
      return;
    }
    zoomAt(2, event.clientX - rect.left, event.clientY - rect.top);
  }

  const zoomed = view.scale > MIN_SCALE;

  return (
    <div className={cn('relative h-full min-h-0', className)}>
      <div
        ref={viewportRef}
        className={cn(
          'relative size-full touch-none overflow-hidden rounded-xl select-none',
          zoomed ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={cn(
            'size-full origin-top-left',
            !dragging && 'transition-transform duration-150 ease-out',
          )}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          {children}
        </div>
      </div>

      <div className="absolute top-full left-0 z-10 mt-1.5 flex items-center gap-1 rounded-lg border border-border/60 bg-card/95 p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Diminuir zoom"
          disabled={!zoomed}
          onClick={() => zoomAt(1 / BUTTON_STEP)}
        >
          <Minus />
        </Button>
        <span className="w-12 text-center text-xs font-medium tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Aumentar zoom"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => zoomAt(BUTTON_STEP)}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Restaurar zoom"
          disabled={!zoomed}
          onClick={() => setView(INITIAL_VIEW)}
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}
