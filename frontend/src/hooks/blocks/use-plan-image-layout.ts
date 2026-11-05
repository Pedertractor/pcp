import { useLayoutEffect, useState } from 'react';

import {
  computeObjectContainRect,
  type PlanImageRect,
} from '@/lib/plan-image-bounds';

export function usePlanImageLayout(
  containerRef: React.RefObject<HTMLElement | null>,
  imageNaturalWidth: number,
  imageNaturalHeight: number,
): PlanImageRect {
  const [rect, setRect] = useState<PlanImageRect>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    function measure() {
      const bounds = element!.getBoundingClientRect();
      setRect(
        computeObjectContainRect(
          bounds.width,
          bounds.height,
          imageNaturalWidth,
          imageNaturalHeight,
        ),
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, imageNaturalWidth, imageNaturalHeight]);

  return rect;
}
