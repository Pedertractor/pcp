import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LINE_LABEL_ANCHOR_OPTIONS } from '@/lib/machine-map';
import type { LineLabelAnchor } from '@/types/block';
import { cn } from '@/lib/utils';

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
            className="h-8 text-xs"
            disabled={disabled}
            title={option.label}
            onClick={() => onChange(option.value)}
          >
            {option.short}
          </Button>
        ))}
      </div>
    </div>
  );
}
