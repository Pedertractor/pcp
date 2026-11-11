import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ClipboardList,
  ImageIcon,
  Loader2Icon,
  Package,
  Factory,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BlockProductionOrderPartPreview } from '@/components/blocks/block-production-order-part-preview';
import { BlockProductionOrderProcessTimeline } from '@/components/blocks/block-production-order-process-timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  blockDetailQueryKey,
  blockProductionOrderBaseHeaderQueryKey,
  blockProductionOrderBasePartPreviewQueryKey,
  blockProductionOrderBaseProcessesQueryKey,
  getBlock,
  getBlockProductionOrderBaseHeader,
  getBlockProductionOrderBasePartPreview,
  getBlockProductionOrderBaseProcesses,
  blockProductionOrdersQueryKey,
  listBlockProductionOrders,
} from '@/services/blocks/block.service';

function formatOfDate(value: string | undefined) {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(parsed);
}

export function BlockProductionOrderProcessesPage() {
  const navigate = useNavigate();
  const { blockId = '', orderId = '' } = useParams();

  const blockQuery = useQuery({
    queryKey: blockDetailQueryKey(blockId),
    queryFn: () => getBlock(blockId),
    enabled: blockId.length > 0,
  });

  const ordersQuery = useQuery({
    queryKey: blockProductionOrdersQueryKey(blockId),
    queryFn: () => listBlockProductionOrders(blockId),
    enabled: blockId.length > 0,
  });

  const orderRow = useMemo(
    () => ordersQuery.data?.find((o) => o.id === orderId) ?? null,
    [ordersQuery.data, orderId],
  );

  const headerQuery = useQuery({
    queryKey: blockProductionOrderBaseHeaderQueryKey(blockId, orderId),
    queryFn: () => getBlockProductionOrderBaseHeader(blockId, orderId),
    enabled: blockId.length > 0 && orderId.length > 0,
  });

  const processesQuery = useQuery({
    queryKey: blockProductionOrderBaseProcessesQueryKey(blockId, orderId),
    queryFn: () => getBlockProductionOrderBaseProcesses(blockId, orderId),
    enabled: blockId.length > 0 && orderId.length > 0,
  });

  const [partImageRequested, setPartImageRequested] = useState(false);

  const partPreviewQuery = useQuery({
    queryKey: blockProductionOrderBasePartPreviewQueryKey(blockId, orderId),
    queryFn: () => getBlockProductionOrderBasePartPreview(blockId, orderId),
    enabled:
      blockId.length > 0 && orderId.length > 0 && partImageRequested,
  });

  const goBackToList = () => navigate(`/controle-produtivo/${blockId}/ofs`);

  const isLoading =
    blockQuery.isLoading ||
    ordersQuery.isLoading ||
    headerQuery.isLoading ||
    processesQuery.isLoading;

  const partNumberDisplay =
    headerQuery.data?.partNumber?.trim() || orderRow?.partCode || '—';

  const ofDisplay =
    orderRow?.ofNumber ??
    headerQuery.data?.ofNumber?.trim() ??
    '';

  if (!orderId) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
        <Button type="button" variant="outline" size="sm" onClick={goBackToList}>
          <ArrowLeft className="size-4" />
          Voltar às OFs
        </Button>
        <p className="text-sm text-muted-foreground">OF não selecionada.</p>
      </div>
    );
  }

  if (ordersQuery.isSuccess && !orderRow) {
    return (
      <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
        <Button type="button" variant="outline" size="sm" onClick={goBackToList}>
          <ArrowLeft className="size-4" />
          Voltar às OFs
        </Button>
        <p className="text-sm text-destructive">Esta OF não pertence a este bloco.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col gap-5 bg-background p-3 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Button
            type="button"
            variant="ghost"
            className="-ml-2 h-9 px-2 text-muted-foreground"
            onClick={goBackToList}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar às OFs do bloco
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Factory className="size-5 shrink-0 text-brand" aria-hidden />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Processos da OF
            </h1>
          </div>
        </div>
        {ofDisplay ? (
          <Badge className="w-fit shrink-0 gap-1.5 px-3 py-1.5 text-sm">
            <ClipboardList className="size-3.5" aria-hidden />
            OF {ofDisplay}
          </Badge>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-stretch">
        <Card className="overflow-hidden border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Imagem da peça</CardTitle>
          </CardHeader>
          <CardContent>
            {partImageRequested ? (
              <BlockProductionOrderPartPreview
                imageUrl={partPreviewQuery.data?.imageUrl}
                isLoading={partPreviewQuery.isLoading}
                label={`Peça ${orderRow?.partCode ?? partNumberDisplay}`}
                className="min-h-[12rem] w-full"
              />
            ) : (
              <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/40 p-4 text-center">
                <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
                <p className="text-xs leading-snug text-muted-foreground">
                 Clique para visualizar a imagem da peça.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPartImageRequested(true)}
                >
                  Visualizar imagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-brand/20">
          <CardContent className="space-y-6 pt-6">
            <section className="space-y-4">
              <h2 className="text-base font-semibold tracking-tight">
                Resumo no planejamento (PCP)
              </h2>
              {ordersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando OF…</p>
              ) : orderRow ? (
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-brand">Produto</dt>
                    <dd className="font-medium">{orderRow.partCode}</dd>
                  </div>
                  <div>
                    <dt className="text-brand">Quantidade</dt>
                    <dd className="font-medium tabular-nums">{orderRow.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-brand">Centro de custo</dt>
                    <dd className="font-medium">{orderRow.costCenter ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-brand">Sincronização</dt>
                    <dd className="font-medium tabular-nums">{orderRow.syncDate}</dd>
                  </div>
                </dl>
              ) : null}
            </section>

            <div className="space-y-1">
              <Separator />
            </div>

            <section className="space-y-4">
              <h2 className="text-base font-semibold tracking-tight">
                Ordem de fabricação e empresa
              </h2>
              {headerQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Carregando cabeçalho…
                </div>
              ) : headerQuery.data ? (
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-brand">Descrição da peça</dt>
                    <dd className="font-medium leading-snug">
                      {headerQuery.data.partDescription ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand">Número da OF</dt>
                    <dd className="font-medium tabular-nums">
                      {headerQuery.data.ofNumber?.trim() || ofDisplay || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand">Empresa</dt>
                    <dd className="font-medium">
                      {headerQuery.data.company ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand">Número da peça</dt>
                    <dd className="font-medium">{headerQuery.data.partNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-brand">Código da peça</dt>
                    <dd className="font-medium">{headerQuery.data.partCode}</dd>
                  </div>
                  <div>
                    <dt className="text-brand">Quantidade</dt>
                    <dd className="font-medium tabular-nums">
                      {headerQuery.data.quantity}
                      {headerQuery.data.originalQuantity
                        ? ` / ${headerQuery.data.originalQuantity}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand">Data</dt>
                    <dd className="font-medium">
                      {formatOfDate(headerQuery.data.date)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="space-y-3 text-sm">
                  {ofDisplay ? (
                    <dl>
                      <dt className="text-brand">Número da OF</dt>
                      <dd className="font-medium tabular-nums">{ofDisplay}</dd>
                    </dl>
                  ) : null}
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Package className="mt-0.5 size-4 shrink-0 text-brand" />
                    <p>
                      Cabeçalho completo não disponível na base para esta OF. A linha do
                      tempo abaixo usa apenas os processos retornados pela API.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Linha do tempo de processos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2Icon className="size-7 animate-spin text-muted-foreground" />
            </div>
          ) : processesQuery.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">
                {processesQuery.error.message ?? 'Não foi possível carregar os processos.'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void processesQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <BlockProductionOrderProcessTimeline
              processes={processesQuery.data ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
