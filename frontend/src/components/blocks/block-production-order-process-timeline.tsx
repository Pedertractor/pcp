import {
  Building2,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Hash,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getBaseOfProcessStatus,
  type BaseOfProcess,
  type BaseOfProcessStatus,
} from '@/types/of-process';

const STATUS_LABELS: Record<BaseOfProcessStatus, string> = {
  completed: 'Concluído',
  in_progress: 'Em andamento',
  pending: 'Pendente',
};

type BlockProductionOrderProcessTimelineProps = {
  processes: BaseOfProcess[];
};

function ProcessStatusBadge({ status }: { status: BaseOfProcessStatus }) {
  if (status === 'completed') {
    return (
      <Badge className="gap-1 bg-brand/15 text-brand hover:bg-brand/15">
        <CheckCircle2 className="size-3" aria-hidden />
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === 'in_progress') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        <Clock3 className="size-3" aria-hidden />
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleDashed className="size-3" aria-hidden />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function TimelineNode({
  process,
  status,
  isFirst,
  isLast,
}: {
  process: BaseOfProcess;
  status: BaseOfProcessStatus;
  isFirst: boolean;
  isLast: boolean;
}) {
  const progress =
    process.QTD > 0
      ? Math.min(100, Math.round((process.QTD_APT / process.QTD) * 100))
      : process.QTD_APT > 0
        ? 100
        : 0;

  return (
    <li className="relative grid grid-cols-[3.25rem_1fr] gap-x-4">
      <div className="relative flex flex-col items-center">
        {!isFirst ? (
          <span
            className={cn(
              'absolute top-0 h-4 w-0.5 -translate-y-full',
              status === 'completed' ? 'bg-brand/50' : 'bg-border',
            )}
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            'relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm',
            status === 'completed' &&
              'border-brand bg-brand text-brand-foreground',
            status === 'in_progress' &&
              'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300',
            status === 'pending' && 'border-border bg-muted text-muted-foreground',
          )}
        >
          {process.OP}
        </span>
        {!isLast ? (
          <span
            className={cn(
              'mt-1 min-h-8 w-0.5 flex-1',
              status === 'completed' ? 'bg-brand/50' : 'bg-border',
            )}
            aria-hidden
          />
        ) : null}
      </div>
      <article
        className={cn(
          'mb-5 rounded-xl border bg-card p-4 shadow-sm',
          status === 'completed' && 'border-brand/25',
          status === 'in_progress' && 'border-amber-500/30',
          status === 'pending' && 'border-border/70',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold leading-tight">
              {process.nameSector ?? 'Setor não identificado'}
            </p>
            <p className="text-xs text-muted-foreground">
              Operação {process.OP} · CC {process.costCenter}
            </p>
          </div>
          <ProcessStatusBadge status={status} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <Building2 className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Centro de custo
              </p>
              <p className="truncate text-sm font-medium">{process.costCenter}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <Hash className="mt-0.5 size-3.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Apontamento
              </p>
              <p className="text-sm font-medium">
                {process.QTD_APT} / {process.QTD}
                {process.QTD > 0 ? (
                  <span className="ml-1 text-muted-foreground">({progress}%)</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
        {process.QTD > 0 ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                status === 'completed' && 'bg-brand',
                status === 'in_progress' && 'bg-amber-500',
                status === 'pending' && 'bg-muted-foreground/30',
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        {process.employeeName ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground/85">
            <User className="size-3.5 shrink-0 text-brand" aria-hidden />
            <span className="font-medium">{process.employeeName}</span>
            {process.employeeCard ? (
              <span className="text-muted-foreground">
                · Crachá {process.employeeCard}
                {process.employeeUnit ? ` (${process.employeeUnit})` : ''}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Nenhum colaborador apontado nesta operação.
          </p>
        )}
      </article>
    </li>
  );
}

export function BlockProductionOrderProcessTimeline({
  processes,
}: BlockProductionOrderProcessTimelineProps) {
  if (processes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">Nenhum processo na API base</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Não há processos registrados para esta OF na sequência consultada.
        </p>
      </div>
    );
  }

  const completedCount = processes.filter(
    (p) => getBaseOfProcessStatus(p) === 'completed',
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1">
          {processes.length} operaç{processes.length === 1 ? 'ão' : 'ões'}
        </Badge>
        <Badge className="gap-1 bg-brand/15 text-brand hover:bg-brand/15">
          {completedCount} concluída{completedCount === 1 ? '' : 's'}
        </Badge>
      </div>
      <ol className="m-0 list-none p-0">
        {processes.map((process, index) => (
          <TimelineNode
            key={`${process.OF}-${process.OP}-${process.costCenter}-${index}`}
            process={process}
            status={getBaseOfProcessStatus(process)}
            isFirst={index === 0}
            isLast={index === processes.length - 1}
          />
        ))}
      </ol>
    </div>
  );
}
