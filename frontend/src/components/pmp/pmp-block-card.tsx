import { Boxes, ChevronRight, Pencil, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { PmpBlockUpsertDialog } from '@/components/pmp/pmp-block-upsert-dialog';
import { PmpCostCentersViewDialog } from '@/components/pmp/pmp-cost-centers-view-dialog';
import { useWebSession } from '@/hooks/auth/use-web-session';
import { usePmpBlockThemeImage } from '@/hooks/pmp/use-pmp-block-theme-image';
import { canAccessUserManagement } from '@/lib/role-access';import { cn } from '@/lib/utils';
import type { PmpBlockSummary } from '@/types/pmp-block';

type PmpBlockCardProps = {
  block: PmpBlockSummary;
  className?: string;
};

export function PmpBlockCard({ block, className }: PmpBlockCardProps) {
  const { data: user } = useWebSession();
  const canManage = canAccessUserManagement(user?.role);
  const [editOpen, setEditOpen] = useState(false);
  const [costCentersOpen, setCostCentersOpen] = useState(false);
  const themeImage = usePmpBlockThemeImage(block.themeImage);

  const blockClass = block.series[0]?.name;

  return (
    <>
      <article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand focus-within:ring-2 focus-within:ring-ring',
          className,
        )}
      >
        <Link
          to={`/pmp/${block.id}`}
          className="absolute inset-0 z-0 focus-visible:outline-none"
          aria-label={`Abrir metas semanais de ${block.name}`}
        />

        <div className="pointer-events-none relative flex aspect-[16/10] items-center justify-center bg-muted p-8 dark:bg-black">
          <div className="absolute top-4 left-5 flex flex-col text-foreground">
            <span className="text-xs font-medium tracking-widest uppercase opacity-70">
              Classe
            </span>
            <span className="text-3xl leading-tight font-bold">
              {blockClass ?? '—'}
            </span>
          </div>

          {themeImage.src ? (
            <img
              src={themeImage.src}
              alt=""
              className="size-3/4 object-contain transition-transform duration-300 group-hover:scale-105"
              draggable={false}
            />
          ) : themeImage.isLoading && block.themeImage ? (
            <div className="size-8 animate-pulse rounded-full bg-muted-foreground/20" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-brand">
              <Boxes className="size-7" />
            </div>
          )}
        </div>

        <div className="pointer-events-none flex flex-1 flex-col gap-3 bg-primary p-5 text-primary-foreground dark:bg-[#1f1f1f] dark:text-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{block.name}</p>
              <p className="text-sm opacity-85">
                {block.costCenters.length} centro
                {block.costCenters.length === 1 ? '' : 's'} de custo
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canManage ? (
                <button
                  type="button"
                  className="pointer-events-auto relative z-10 flex size-8 items-center justify-center rounded-md opacity-85 transition-colors hover:bg-primary-foreground/15 hover:opacity-100 dark:hover:bg-white/10"
                  aria-label={`Editar ${block.name}`}
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" />
                </button>
              ) : null}
              <ChevronRight className="size-5 opacity-85 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>

          <button
            type="button"
            className="pointer-events-auto relative z-10 mt-auto inline-flex h-9 w-fit items-center gap-2 rounded-full bg-primary-foreground/15 px-4 text-sm font-medium transition-colors hover:bg-primary-foreground/25 dark:bg-white/10 dark:hover:bg-white/15"
            onClick={() => setCostCentersOpen(true)}
          >
            <Receipt className="size-4" />
            Visualizar centros de custo
          </button>
        </div>
      </article>

      <PmpCostCentersViewDialog
        block={block}
        open={costCentersOpen}
        onOpenChange={setCostCentersOpen}
      />

      {canManage ? (
        <PmpBlockUpsertDialog
          block={block}
          open={editOpen}
          onOpenChange={setEditOpen}
          showTrigger={false}
        />
      ) : null}
    </>
  );
}
