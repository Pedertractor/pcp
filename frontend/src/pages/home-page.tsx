import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Boxes, CalendarRange, Clock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useWebSession } from '@/hooks/auth/use-web-session';
import { roleLabel, unitLabel } from '@/lib/user-labels';
import { capitalize, cn } from '@/lib/utils';
import productionControlImage from '@/public/home/production-control.png';
import {
  blocksListQueryKey,
  listBlocks,
} from '@/services/blocks/block.service';

type HoveredSide = 'control' | 'pmp' | null;

const PMP_CLIP: Record<Exclude<HoveredSide, null> | 'idle', string> = {
  idle: 'lg:[clip-path:polygon(64%_0,100%_0,100%_100%,40%_100%)]',
  control: 'lg:[clip-path:polygon(74%_0,100%_0,100%_100%,52%_100%)]',
  pmp: 'lg:[clip-path:polygon(54%_0,100%_0,100%_100%,28%_100%)]',
};

function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute grid grid-cols-6 gap-2.5',
        className,
      )}
    >
      {Array.from({ length: 24 }, (_, index) => (
        <span key={index} className="size-1 rounded-full bg-current" />
      ))}
    </div>
  );
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
        <DotGrid className="top-8 left-8 text-primary/50" />
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
            'relative flex h-full w-full flex-col justify-center gap-6 p-8 transition-opacity duration-500 sm:p-12 lg:w-[46%] lg:py-12 lg:pr-4 lg:pl-[6%]',
            hovered === 'pmp' && 'lg:opacity-60',
          )}
        >
          <div className="text-sm text-neutral-500">
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
            <p className="mt-3 max-w-sm text-sm text-neutral-500">
              Acompanhe as OFs do dia, os atrasos e as máquinas de cada bloco no
              mapa produtivo.
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

      <div
        role="group"
        aria-label="PMP — Plano Mestre de Produção, em breve"
        onMouseEnter={() => setHovered('pmp')}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          'group/pmp relative flex min-h-[22rem] flex-1 overflow-hidden bg-[#0b0b0b] text-white transition-[clip-path] duration-500 ease-out lg:absolute lg:inset-0 lg:min-h-0',
          PMP_CLIP[hovered ?? 'idle'],
        )}
      >
        <PmpLines />
        <DotGrid className="right-8 bottom-8 text-white/25" />

        <div
          className={cn(
            'relative flex h-full w-full flex-col items-start justify-center gap-6 p-8 transition-opacity duration-500 sm:p-12 lg:ml-auto lg:w-[34%] lg:py-12 lg:pr-[6%] lg:pl-0',
            hovered === 'control' && 'lg:opacity-60',
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary px-3 py-1 text-xs font-semibold">
            <Clock className="size-3.5 text-primary" aria-hidden />
            Em breve
          </span>

          <div className="flex size-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition-transform duration-500 group-hover/pmp:scale-110 sm:size-28">
            <CalendarRange
              className="size-11 text-primary sm:size-12"
              strokeWidth={1.5}
            />
          </div>

          <div>
            <h2 className="text-3xl font-light tracking-tight sm:text-4xl">
              PMP
            </h2>
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">
              Plano Mestre de Produção
            </p>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              Planejamento da demanda e da capacidade dos blocos.
            </p>
          </div>

          <div className="w-full max-w-xs rounded-xl border border-dashed border-white/25 p-4 text-sm text-white/70 transition-colors duration-300 group-hover/pmp:border-primary/70">
            O módulo está em definição e será liberado nas próximas etapas.
          </div>
        </div>
      </div>
    </div>
  );
}
