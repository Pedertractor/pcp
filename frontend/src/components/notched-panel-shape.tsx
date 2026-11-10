import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export const NOTCH_CUT = 80;
const NOTCH_BEND = 24;
const NOTCH_OUTER = 16;

function notchedPanelPath(
  width: number,
  height: number,
  cut: number,
  bend: number,
  outer: number,
) {
  const inset = 0.5;
  const x0 = inset;
  const y0 = inset;
  const x1 = width - inset;
  const y1 = height - inset;
  const o = Math.min(outer, (x1 - x0) / 4, (y1 - y0 - cut) / 2);
  const b = Math.min(bend, cut / 2 - 1, (y1 - y0 - cut) / 2);
  const c = cut;

  return [
    `M ${x0 + o} ${y0}`,
    `H ${x1 - o}`,
    `A ${o} ${o} 0 0 1 ${x1} ${y0 + o}`,
    `V ${y1 - o}`,
    `A ${o} ${o} 0 0 1 ${x1 - o} ${y1}`,
    `H ${c + b}`,
    `A ${b} ${b} 0 0 1 ${c} ${y1 - b}`,
    `V ${y1 - c + b}`,
    `A ${b} ${b} 0 0 1 ${c - b} ${y1 - c}`,
    `H ${x0 + b}`,
    `A ${b} ${b} 0 0 1 ${x0} ${y1 - c - b}`,
    `V ${y0 + o}`,
    `A ${o} ${o} 0 0 1 ${x0 + o} ${y0}`,
    'Z',
  ].join(' ');
}

type NotchedPanelShapeProps = {
  corner?: 'bottom-left' | 'bottom-right';
  className?: string;
  stroke?: string;
};

export function NotchedPanelShape({
  corner = 'bottom-left',
  className = 'fill-card',
  stroke,
}: NotchedPanelShapeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const d =
    size.width > 0 && size.height > 0
      ? notchedPanelPath(
          size.width,
          size.height,
          NOTCH_CUT,
          NOTCH_BEND,
          NOTCH_OUTER,
        )
      : '';

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {d ? (
        <svg
          className="h-full w-full"
          width={size.width}
          height={size.height}
          aria-hidden
        >
          <path
            d={d}
            className={cn(className)}
            stroke={stroke}
            strokeWidth={stroke ? 1 : undefined}
            transform={
              corner === 'bottom-right'
                ? `translate(${size.width} 0) scale(-1 1)`
                : undefined
            }
          />
        </svg>
      ) : null}
    </div>
  );
}
