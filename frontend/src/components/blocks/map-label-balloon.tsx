import { Label, Tag, Text } from 'react-konva';

import type { LineLabelAnchor } from '@/types/block';

type Box = { x: number; y: number; width: number; height: number };

const FONT_FAMILY = 'Arial';

/**
 * Konva centers a pointer `Label` on its tip. The tip sits on the chosen corner
 * itself so the side stays correct even when the balloon is wider than the box.
 */
function placeBalloon(anchor: LineLabelAnchor, box: Box) {
  const top = anchor === 'TOP_LEFT' || anchor === 'TOP_RIGHT';
  const left = anchor === 'TOP_LEFT' || anchor === 'BOTTOM_LEFT';
  return {
    x: left ? box.x : box.x + box.width,
    y: top ? box.y : box.y + box.height,
    pointerDirection: top ? ('down' as const) : ('up' as const),
  };
}

type MapLabelBalloonProps = {
  text: string;
  anchor: LineLabelAnchor;
  box: Box;
  fontSize: number;
  padding: number;
  fill: string;
  textFill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  pointerWidth: number;
  pointerHeight: number;
};

export function MapLabelBalloon({
  text,
  anchor,
  box,
  fontSize,
  padding,
  fill,
  textFill,
  stroke,
  strokeWidth,
  cornerRadius,
  pointerWidth,
  pointerHeight,
}: MapLabelBalloonProps) {
  const { x, y, pointerDirection } = placeBalloon(anchor, box);

  return (
    <Label x={x} y={y} listening={false}>
      <Tag
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        cornerRadius={cornerRadius}
        pointerDirection={pointerDirection}
        pointerWidth={pointerWidth}
        pointerHeight={pointerHeight}
      />
      <Text
        text={text}
        fontFamily={FONT_FAMILY}
        fontSize={fontSize}
        fontStyle="bold"
        fill={textFill}
        padding={padding}
      />
    </Label>
  );
}
