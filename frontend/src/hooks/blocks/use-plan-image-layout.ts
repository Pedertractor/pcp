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

    // clientWidth/Height ignore CSS transforms; getBoundingClientRect would
    // return the zoomed size when the plan sits inside PlanZoomViewport.
    function measure() {
      setRect(
        computeObjectContainRect(
          element!.clientWidth,
          element!.clientHeight,
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
