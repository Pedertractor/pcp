import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import paintSectorImage from '@/public/production-control-block/paint.png';
import { BLOCK_SECTOR_LABELS, type BlockSector, type BlockSummary } from '@/types/block';

const BLOCK_SECTOR_IMAGES: Record<BlockSector, string> = {
  PAINT: paintSectorImage,
};

export function BlockCard({ block }: { block: BlockSummary }) {
  const sectorLabel = BLOCK_SECTOR_LABELS[block.sector];

  return (
    <Link
      to={`/controle-produtivo/${block.id}`}
      className="group flex flex-col overflow-hidden rounded-xl ring-1 ring-foreground/10 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex aspect-[16/10] items-center justify-center bg-muted p-6 dark:bg-black">
        <img
          src={BLOCK_SECTOR_IMAGES[block.sector]}
          alt={sectorLabel}
          className="h-full max-h-40 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          draggable={false}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 bg-primary p-5 text-primary-foreground dark:bg-[#1f1f1f] dark:text-foreground">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{block.name}</p>
            <p className="text-sm opacity-85">{sectorLabel}</p>
          </div>
          <ChevronRight className="mt-1 size-5 shrink-0 opacity-85 transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {block.costCenters.map((item) => (
            <span
              key={item.id}
              title={item.sectorName}
              className="rounded-full bg-primary-foreground/15 px-2.5 dark:bg-white/10 py-0.5 text-xs font-medium"
            >
              {item.costCenter}
            </span>
          ))}
        </div>

        <p className="mt-auto text-sm opacity-85">
          {block.machinesCount} máquinas ·{' '}
          {block.productionOrdersCount} OFs ·{' '}
          hoje
        </p>
      </div>
    </Link>
  );
}
