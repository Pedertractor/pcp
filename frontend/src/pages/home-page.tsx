import { ChevronRight, Factory } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useWebSession } from '@/hooks/auth/use-web-session';
import { canAccessUserManagement } from '@/lib/role-access';
import { roleLabel, unitLabel } from '@/lib/user-labels';
import { capitalize } from '@/lib/utils';

export function HomePage() {
  const { data: user } = useWebSession();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá{user?.name ? `, ${capitalize(user.name.split(' ')[0] ?? '')}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user
            ? `${roleLabel(user.role)} · cartão ${user.cardNumber} · ${unitLabel(user.unit)}`
            : 'Carregando sessão…'}
        </p>
      </div>

      <Link
        to="/controle-produtivo"
        className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-brand"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-muted text-brand">
          <Factory className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium">Controle Produtivo por bloco</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Blocos, centros de custo e acompanhamento das OFs.
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-medium">Plataforma PCP</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A base de usuários já consulta a API interna pelo cartão e pela
          unidade. O acompanhamento das ordens de fabricação entra nas próximas
          rotinas de planejamento e execução.
        </p>
        {canAccessUserManagement(user?.role) ? (
          <Link
            to="/usuarios"
            className="mt-4 inline-flex text-sm font-medium text-brand hover:underline"
          >
            Gerenciar usuários
          </Link>
        ) : null}
      </section>
    </div>
  );
}
