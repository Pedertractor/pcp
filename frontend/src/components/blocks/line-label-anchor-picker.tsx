import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LINE_LABEL_ANCHOR_OPTIONS } from '@/lib/machine-map';
import type { LineLabelAnchor } from '@/types/block';
import { cn } from '@/lib/utils';

/** Miniatura do retângulo no mapa + seta no canto (igual ao balão Konva). */
function LabelAnchorPositionIcon({
  anchor,
  className,
}: {
  anchor: LineLabelAnchor;
  className?: string;
}) {
  const box = { x: 7, y: 9, w: 10, h: 9 };
  const tipPath = (() => {
    switch (anchor) {
      case 'TOP_LEFT':
        return `M ${box.x} ${box.y} L ${box.x - 4} ${box.y - 5} L ${box.x + 3} ${box.y - 5} Z`;
      case 'TOP_RIGHT':
        return `M ${box.x + box.w} ${box.y} L ${box.x + box.w - 3} ${box.y - 5} L ${box.x + box.w + 4} ${box.y - 5} Z`;
      case 'BOTTOM_LEFT':
        return `M ${box.x} ${box.y + box.h} L ${box.x - 4} ${box.y + box.h + 5} L ${box.x + 3} ${box.y + box.h + 5} Z`;
      case 'BOTTOM_RIGHT':
        return `M ${box.x + box.w} ${box.y + box.h} L ${box.x + box.w - 3} ${box.y + box.h + 5} L ${box.x + box.w + 4} ${box.y + box.h + 5} Z`;
    }
  })();

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('size-4 shrink-0', className)}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={1.25}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path d={tipPath} fill="currentColor" />
    </svg>
  );
}

type LineLabelAnchorPickerProps = {
  value: LineLabelAnchor;
  onChange: (value: LineLabelAnchor) => void;
  disabled?: boolean;
  className?: string;
  showLegend?: boolean;
};

export function LineLabelAnchorPicker({
  value,
  onChange,
  disabled = false,
  className,
  showLegend = true,
}: LineLabelAnchorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showLegend ? (
        <Label className="text-xs text-muted-foreground">
          Posição do rótulo (balão)
        </Label>
      ) : null}
      <div
        className="grid grid-cols-2 gap-1.5"
        role="group"
        aria-label="Canto do rótulo da linha"
      >
        {LINE_LABEL_ANCHOR_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? 'default' : 'outline'}
            className="h-8 justify-start gap-1.5 px-2 text-xs"
            disabled={disabled}
            title={option.label}
            onClick={() => onChange(option.value)}
          >
            <LabelAnchorPositionIcon anchor={option.value} />
            {option.short}
          </Button>
        ))}
      </div>
    </div>
  );
}
