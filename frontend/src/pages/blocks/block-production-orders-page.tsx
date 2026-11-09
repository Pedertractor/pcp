import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Loader2Icon, Package, Ruler } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { BlockProductionOrdersFilters } from '@/components/blocks/block-production-orders-filters';
import type { StatusDateFilter } from '@/components/blocks/block-production-orders-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  blockDetailQueryKey,
  blockProductionOrdersQueryKey,
  getBlock,
  listBlockProductionOrders,
} from '@/services/blocks/block.service';
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  type ProductionOrderStatus,
} from '@/types/block';

const ALL = 'all';

const piecesFormatter = new Intl.NumberFormat('pt-BR');
const areaFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function formatSyncDateLabel(dateKey: string) {
  return `Sincronizado em ${formatDateKey(dateKey)}`;
}

function normalizeStatusDate(value: string | null): string {
  return (value ?? '').replace(/^[.\s]+/, '').trim().toUpperCase();
}

function normalizedHexForSwatch(raw: string | null): string | null {
  if (raw === null) {
    return null;
  }
  const s = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(s)) {
    return `#${s.toUpperCase()}`;
  }
  return null;
}

const DEFAULT_STATUS_DATE_FILTER = ['HOJE', 'NO ATRASO'] as const;

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const setA = new Set(a);
  return b.every((item) => setA.has(item));
}

function isDefaultStatusDateFilter(value: StatusDateFilter): boolean {
  return value !== 'all' && sameStringSet(value, DEFAULT_STATUS_DATE_FILTER);
}

export function BlockProductionOrdersPage() {
  const navigate = useNavigate();
  const { blockId = '' } = useParams();
  const [filterOf, setFilterOf] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterCostCenter, setFilterCostCenter] = useState(ALL);
  const [filterStatusDate, setFilterStatusDate] = useState<StatusDateFilter>([
    ...DEFAULT_STATUS_DATE_FILTER,
  ]);
  const [filterStatus, setFilterStatus] = useState<ProductionOrderStatus | typeof ALL>(
    ALL,
  );
  const [filterSyncDate, setFilterSyncDate] = useState(ALL);
  const [animateSpin, setAnimateSpin] = useState(false);

  const blockQuery = useQuery({
    queryKey: blockDetailQueryKey(blockId),
    queryFn: () => getBlock(blockId),
    enabled: blockId.length > 0,
  });

  const isPaintBlock = blockQuery.data?.sector === 'PAINT';

  const ordersQuery = useQuery({
    queryKey: blockProductionOrdersQueryKey(blockId),
    queryFn: () => listBlockProductionOrders(blockId),
    enabled: blockId.length > 0,
  });

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  const syncDates = useMemo(
    () =>
      [...new Set(orders.map((order) => order.syncDate))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [orders],
  );

  const costCenters = useMemo(
    () =>
      [...new Set(orders.map((o) => o.costCenter).filter(Boolean))].sort() as string[],
    [orders],
  );

  const statusDateValues = useMemo(
    () =>
      [
        ...new Set(
          orders.map((o) => normalizeStatusDate(o.statusDate)).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const ofQ = filterOf.trim().toLocaleLowerCase('pt-BR');
    const productQ = filterProduct.trim().toLocaleLowerCase('pt-BR');
    const machineQ = filterMachine.trim().toLocaleLowerCase('pt-BR');
    const colorQ = filterColor.trim().toLocaleLowerCase('pt-BR');
    const opQ = filterOperation.trim().toLocaleLowerCase('pt-BR');

    return orders.filter((order) => {
      if (filterSyncDate !== ALL && order.syncDate !== filterSyncDate) {
        return false;
      }
      if (filterCostCenter !== ALL && order.costCenter !== filterCostCenter) {
        return false;
      }
      if (filterStatus !== ALL && order.status !== filterStatus) {
        return false;
      }
      if (filterStatusDate !== ALL) {
        const norm = normalizeStatusDate(order.statusDate);
        if (!filterStatusDate.includes(norm)) {
          return false;
        }
      }
      if (ofQ && !order.ofNumber.toLocaleLowerCase('pt-BR').includes(ofQ)) {
        return false;
      }
      if (productQ && !order.partCode.toLocaleLowerCase('pt-BR').includes(productQ)) {
        return false;
      }
      if (machineQ) {
        const m = order.machineCode?.toLocaleLowerCase('pt-BR') ?? '';
        if (!m.includes(machineQ)) {
          return false;
        }
      }
      if (colorQ) {
        const c = order.colorName?.toLocaleLowerCase('pt-BR') ?? '';
        if (!c.includes(colorQ)) {
          return false;
        }
      }
      if (opQ) {
        const o = order.operation?.toLocaleLowerCase('pt-BR') ?? '';
        if (!o.includes(opQ)) {
          return false;
        }
      }
      return true;
    });
  }, [
    orders,
    filterOf,
    filterProduct,
    filterMachine,
    filterColor,
    filterOperation,
    filterCostCenter,
    filterStatusDate,
    filterStatus,
    filterSyncDate,
  ]);

  const activeFiltersCount = [
    filterOf.trim(),
    filterProduct.trim(),
    filterMachine.trim(),
    filterColor.trim(),
    filterOperation.trim(),
    filterCostCenter !== ALL,
    filterStatusDate === ALL || !isDefaultStatusDateFilter(filterStatusDate),
    filterStatus !== ALL,
    filterSyncDate !== ALL,
  ].filter(Boolean).length;

  const filtersSummary =
    activeFiltersCount > 0
      ? `${activeFiltersCount} filtro(s) ativo(s) · ${filteredOrders.length} OF(s)`
      : `${filteredOrders.length} OF(s) listada(s)`;

  const resetFilters = useCallback(() => {
    setAnimateSpin(true);
    setFilterOf('');
    setFilterProduct('');
    setFilterMachine('');
    setFilterColor('');
    setFilterOperation('');
    setFilterCostCenter(ALL);
    setFilterStatusDate([...DEFAULT_STATUS_DATE_FILTER]);
    setFilterStatus(ALL);
    setFilterSyncDate(ALL);
    window.setTimeout(() => setAnimateSpin(false), 400);
  }, []);

  const totals = useMemo(
    () =>
      filteredOrders.reduce(
        (total, order) => ({
          pieces: total.pieces + order.quantity,
          area: total.area + order.totalArea,
        }),
        { pieces: 0, area: 0 },
      ),
    [filteredOrders],
  );

  const goBack = () => navigate(`/controle-produtivo/${blockId}`);

  const isOrdersInitialLoad =
    ordersQuery.isPending && ordersQuery.data === undefined;

  const selectAllStatusDates = useCallback(() => {
    setFilterStatusDate(ALL);
  }, []);

  const toggleStatusDate = useCallback((normalizedLabel: string) => {
    setFilterStatusDate((current) => {
      if (current === ALL) {
        return [normalizedLabel];
      }
      const has = current.includes(normalizedLabel);
      if (has) {
        const next = current.filter((item) => item !== normalizedLabel);
        return next.length === 0 ? [...DEFAULT_STATUS_DATE_FILTER] : next;
      }
      return [...current, normalizedLabel];
    });
  }, []);

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-background p-3 sm:p-6">
      <header className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={goBack}
          aria-label="Voltar ao bloco"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            OFs do bloco {blockQuery.data?.name ?? ''}
          </h1>
        </div>
      </header>

      {isOrdersInitialLoad ? (
        <div
          className="flex min-h-[55dvh] flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2Icon className="size-9 animate-spin text-brand" aria-hidden />
          <p>Carregando OFs do bloco…</p>
        </div>
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border/60 pb-4 text-sm">
        <span className="flex items-center gap-1.5">
          <ClipboardList className="size-4 text-brand" aria-hidden />
          <span className="font-semibold tabular-nums">
            {piecesFormatter.format(filteredOrders.length)}
          </span>
          OFs
        </span>
        <span className="flex items-center gap-1.5">
          <Package className="size-4 text-brand" aria-hidden />
          <span className="font-semibold tabular-nums">
            {piecesFormatter.format(totals.pieces)}
          </span>
          peças
        </span>
        <span className="flex items-center gap-1.5">
          <Ruler className="size-4 text-brand" aria-hidden />
          <span className="font-semibold tabular-nums">
            {areaFormatter.format(totals.area)}
          </span>
          m²
        </span>
      </div>

      {ordersQuery.isSuccess ? (
        <BlockProductionOrdersFilters
          filterOf={filterOf}
          filterProduct={filterProduct}
          filterMachine={filterMachine}
          filterColor={filterColor}
          filterOperation={filterOperation}
          filterCostCenter={filterCostCenter}
          filterStatusDate={filterStatusDate}
          filterStatus={filterStatus}
          filterSyncDate={filterSyncDate}
          costCenterOptions={costCenters}
          syncDateOptions={syncDates}
          formatSyncDateLabel={formatSyncDateLabel}
          filtersSummary={filtersSummary}
          animateSpin={animateSpin}
          onFilterOfChange={setFilterOf}
          onFilterProductChange={setFilterProduct}
          onFilterMachineChange={setFilterMachine}
          onFilterColorChange={setFilterColor}
          onFilterOperationChange={setFilterOperation}
          onFilterCostCenterChange={setFilterCostCenter}
          onFilterStatusDateSelectAll={selectAllStatusDates}
          onFilterStatusDateToggle={toggleStatusDate}
          onFilterStatusChange={setFilterStatus}
          onFilterSyncDateChange={setFilterSyncDate}
          onReset={resetFilters}
          statusDateValueOptions={statusDateValues}
        />
      ) : null}

      {ordersQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            {ordersQuery.error.message ?? 'Não foi possível carregar as OFs.'}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void ordersQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {ordersQuery.isSuccess ? (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OF</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>CC</TableHead>
                <TableHead className="text-right">Qtde</TableHead>
                <TableHead className="text-right">m²/pç</TableHead>
                <TableHead className="text-right">m² total</TableHead>
                <TableHead>Status da data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sincronização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-muted-foreground">
                    Nenhuma OF encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/45"
                    title="Abrir processos da OF (API base)"
                    tabIndex={0}
                    role="button"
                    onClick={() =>
                      navigate(
                        `/controle-produtivo/${blockId}/ofs/${order.id}/processes`,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(
                          `/controle-produtivo/${blockId}/ofs/${order.id}/processes`,
                        );
                      }
                    }}
                  >
                    <TableCell className="font-medium">{order.ofNumber}</TableCell>
                    <TableCell>{order.partCode}</TableCell>
                    <TableCell>{order.machineCode ?? '—'}</TableCell>
                    <TableCell>
                      <span className="flex min-w-0 items-center gap-2">
                        {isPaintBlock
                          ? (() => {
                              const hex = normalizedHexForSwatch(
                                order.colorMapHex,
                              );
                              return hex ? (
                                <span
                                  className="size-3.5 shrink-0 rounded-sm border border-border/80 shadow-sm"
                                  style={{ backgroundColor: hex }}
                                  title={hex}
                                  aria-hidden
                                />
                              ) : null;
                            })()
                          : null}
                        <span className="min-w-0 truncate">
                          {order.colorName ?? '—'}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>{order.operation ?? '—'}</TableCell>
                    <TableCell>{order.costCenter ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {piecesFormatter.format(order.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {order.area === null ? '—' : areaFormatter.format(order.area)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {areaFormatter.format(order.totalArea)}
                    </TableCell>
                    <TableCell>{order.statusDate ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PRODUCTION_ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDateKey(order.syncDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}
