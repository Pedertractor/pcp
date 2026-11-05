export type PlanImageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Área visível da imagem com object-contain dentro do container. */
export function computeObjectContainRect(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): PlanImageRect {
  if (
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const scale = Math.min(
    containerWidth / imageWidth,
    containerHeight / imageHeight,
  );
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

export function clientToPlanPercent(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  planRect: PlanImageRect,
): { x: number; y: number } | null {
  const localX = clientX - containerRect.left - planRect.left;
  const localY = clientY - containerRect.top - planRect.top;
  if (
    localX < 0 ||
    localY < 0 ||
    localX > planRect.width ||
    localY > planRect.height
  ) {
    return null;
  }
  return {
    x: (localX / planRect.width) * 100,
    y: (localY / planRect.height) * 100,
  };
}
