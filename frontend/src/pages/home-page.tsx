import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Boxes } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useWebSession } from '@/hooks/auth/use-web-session';
import { roleLabel, unitLabel } from '@/lib/user-labels';
import { capitalize, cn } from '@/lib/utils';
import pmpImage from '@/public/home/pmp.png';
import productionControlImage from '@/public/home/production-control.png';
import {
  blocksListQueryKey,
  listBlocks,
} from '@/services/blocks/block.service';
import {
  listPmpBlocks,
  pmpBlocksListQueryKey,
} from '@/services/pmp/pmp-block.service';

type HoveredSide = 'control' | 'pmp' | null;

const PMP_CLIP: Record<Exclude<HoveredSide, null> | 'idle', string> = {
  idle: 'lg:[clip-path:polygon(64%_0,100%_0,100%_100%,40%_100%)]',
  control: 'lg:[clip-path:polygon(70%_0,100%_0,100%_100%,50%_100%)]',
  pmp: 'lg:[clip-path:polygon(54%_0,100%_0,100%_100%,28%_100%)]',
};

const contentClassName =
  'relative flex h-full w-full flex-col gap-6 p-8 transition-opacity duration-500 sm:p-12 lg:pt-[clamp(4rem,14vh,9rem)] lg:pb-12';

function sideOpacity(hovered: HoveredSide, side: Exclude<HoveredSide, null>) {
  if (hovered === side) {
    return 'lg:opacity-100';
  }
  return hovered === null ? 'lg:opacity-85' : 'lg:opacity-50';
}

function PmpLines() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 400"
      fill="none"
      className="pointer-events-none absolute inset-0 size-full text-white/[0.07]"
      preserveAspectRatio="xMidYMid slice"
    >
      <circle cx="330" cy="70" r="90" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="330" cy="70" r="140" stroke="currentColor" strokeWidth="1" />
      <path
        d="M120 400 C 180 300, 260 330, 300 250 S 380 160, 420 180"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M60 420 C 140 330, 240 370, 290 300 S 390 220, 430 240"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function HomePage() {
  const { data: user } = useWebSession();
  const [hovered, setHovered] = useState<HoveredSide>(null);

  const blocksQuery = useQuery({
    queryKey: blocksListQueryKey,
    queryFn: listBlocks,
  });
  const blocksCount = blocksQuery.data?.length;

  const pmpBlocksQuery = useQuery({
    queryKey: pmpBlocksListQueryKey,
    queryFn: listPmpBlocks,
  });
  const pmpBlocksCount = pmpBlocksQuery.data?.length;

  const firstName = user?.name
    ? capitalize(user.name.split(' ')[0] ?? '')
    : null;

  return (
    <div className="relative -m-4 flex flex-1 flex-col overflow-hidden md:-m-6 lg:block lg:min-h-0">
      <Link
        to="/controle-produtivo"
        onMouseEnter={() => setHovered('control')}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered('control')}
        onBlur={() => setHovered(null)}
        className="group/control relative flex min-h-[26rem] flex-1 overflow-hidden bg-white text-neutral-900 outline-none dark:bg-[#ececec] lg:absolute lg:inset-0 lg:min-h-0"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[18%] left-[38%] hidden size-3 rounded-full bg-primary lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-[22%] left-[46%] hidden size-2 rounded-full bg-neutral-900 lg:block"
        />

        <div
          className={cn(
            contentClassName,
            'lg:w-[46%] lg:pr-4 lg:pl-[6%]',
            sideOpacity(hovered, 'control'),
          )}
        >
          <div className="h-10 text-sm text-black">
            {firstName ? `Olá, ${firstName}` : 'Olá'}
            {user ? (
              <span className="block text-xs">
                {roleLabel(user.role)} · {unitLabel(user.unit)}
              </span>
            ) : null}
          </div>

          <img
            src={productionControlImage}
            alt=""
            aria-hidden
            className="h-28 w-fit object-contain transition-transform duration-500 group-hover/control:scale-110 sm:h-36 lg:h-[clamp(7rem,22vh,12rem)]"
            draggable={false}
          />

          <div>
            <h2 className="text-3xl font-light tracking-tight sm:text-4xl">
              Controle Produtivo
            </h2>
            <p className="text-3xl font-bold tracking-tight sm:text-4xl">
              por bloco
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex h-12 items-center gap-3 rounded-full bg-neutral-900 pr-6 pl-2 text-sm font-medium text-white shadow-lg transition-all duration-300 group-hover/control:bg-primary group-hover/control:text-primary-foreground group-focus-visible/control:ring-4 group-focus-visible/control:ring-primary/40">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors group-hover/control:bg-white/90">
                <Boxes className="size-4" />
              </span>
              Acessar blocos
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/control:translate-x-1" />
            </span>
            {blocksCount !== undefined ? (
              <span className="text-sm text-neutral-500">
                {blocksCount} bloco{blocksCount === 1 ? '' : 's'} cadastrado
                {blocksCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <Link
        to="/pmp"
        aria-label="PMP — Plano Mestre de Produção"
        onMouseEnter={() => setHovered('pmp')}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered('pmp')}
        onBlur={() => setHovered(null)}
        className={cn(
          'group/pmp relative flex min-h-[22rem] flex-1 overflow-hidden bg-[#0b0b0b] text-white transition-[clip-path] duration-500 ease-out lg:absolute lg:inset-0 lg:min-h-0',
          PMP_CLIP[hovered ?? 'idle'],
        )}
      >
        <PmpLines />

        <div
          className={cn(
            contentClassName,
            'items-start lg:ml-auto lg:w-[32%] lg:pr-[5%] lg:pl-0',
            sideOpacity(hovered, 'pmp'),
          )}
        >
          <div aria-hidden className="hidden h-10 shrink-0 lg:block" />

          <img
            src={pmpImage}
            alt=""
            aria-hidden
            className="h-28 w-fit object-contain transition-transform duration-500 group-hover/pmp:scale-110 sm:h-36 lg:h-[clamp(7rem,22vh,12rem)]"
            draggable={false}
          />

          <p className="text-3xl font-bold tracking-tight sm:text-4xl">
            Plano Mestre de Produção
          </p>

          <span className="inline-flex h-12 items-center gap-3 rounded-full bg-primary pr-6 pl-2 text-sm font-medium text-primary-foreground transition-transform group-hover/pmp:scale-[1.02]">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/15">
              <Boxes className="size-4" />
            </span>
            Acessar PMP
            <ArrowRight className="size-4 transition-transform group-hover/pmp:translate-x-1" />
          </span>
          {pmpBlocksCount !== undefined ? (
            <span className="text-sm text-white/70">
              {pmpBlocksCount} bloco{pmpBlocksCount === 1 ? '' : 's'} PMP
            </span>
          ) : null}
        </div>
      </Link>

      <p className="pointer-events-none absolute right-6 bottom-5 z-10 flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-white/60 uppercase sm:right-12 lg:right-[5%]">
        <span aria-hidden className="h-px w-8 bg-white/40" />
        Pedertractor &amp; TractorComponents
      </p>
    </div>
  );
}
