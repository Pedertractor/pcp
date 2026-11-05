import { ChevronDown, Funnel } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CollapsibleFiltersProps = {
  children: ReactNode;
  className?: string;
  summary?: string;
};

export function CollapsibleFilters({
  children,
  className,
  summary,
}: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between gap-2 px-1 py-2 md:hidden">
        <Button
          type="button"
          variant="ghost"
          className="h-9 flex-1 justify-start gap-2 px-2 text-sm font-medium"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Funnel className="size-4 shrink-0 text-brand" aria-hidden />
          <span>{open ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 shrink-0 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </Button>
      </div>

      {!open && summary ? (
        <p className="px-1 py-2 text-xs text-muted-foreground md:hidden">
          {summary}
        </p>
      ) : null}

      <div
        className={cn(
          'flex flex-wrap items-end gap-3 p-1 md:p-2',
          !open && 'hidden md:flex',
          open && 'flex',
        )}
      >
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-muted md:flex">
          <Funnel className="size-5 text-brand" aria-hidden />
        </div>
        {children}
      </div>
    </div>
  );
}
