import { RotateCw } from 'lucide-react';

import { CollapsibleFilters } from '@/components/collapsible-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRODUCTION_ORDER_STATUS_LABELS, type ProductionOrderStatus } from '@/types/block';
import { cn } from '@/lib/utils';

const ALL = 'all';

export type StatusDateFilter = 'all' | 'HOJE' | 'NO ATRASO';

type BlockProductionOrdersFiltersProps = {
  filterOf: string;
  filterProduct: string;
  filterMachine: string;
  filterColor: string;
  filterOperation: string;
  filterCostCenter: string;
  filterStatusDate: StatusDateFilter;
  filterStatus: ProductionOrderStatus | typeof ALL;
  filterSyncDate: string;
  costCenterOptions: string[];
  syncDateOptions: string[];
  formatSyncDateLabel: (dateKey: string) => string;
  filtersSummary: string;
  animateSpin: boolean;
  onFilterOfChange: (value: string) => void;
  onFilterProductChange: (value: string) => void;
  onFilterMachineChange: (value: string) => void;
  onFilterColorChange: (value: string) => void;
  onFilterOperationChange: (value: string) => void;
  onFilterCostCenterChange: (value: string) => void;
  onFilterStatusDateChange: (value: StatusDateFilter) => void;
  onFilterStatusChange: (value: ProductionOrderStatus | typeof ALL) => void;
  onFilterSyncDateChange: (value: string) => void;
  onReset: () => void;
};

const STATUS_DATE_OPTIONS: { value: StatusDateFilter; label: string }[] = [
  { value: ALL, label: 'Todos' },
  { value: 'HOJE', label: 'HOJE' },
  { value: 'NO ATRASO', label: 'NO ATRASO' },
];

const INTERNAL_STATUS_OPTIONS: (ProductionOrderStatus | typeof ALL)[] = [
  ALL,
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE',
];

export function BlockProductionOrdersFilters({
  filterOf,
  filterProduct,
  filterMachine,
  filterColor,
  filterOperation,
  filterCostCenter,
  filterStatusDate,
  filterStatus,
  filterSyncDate,
  costCenterOptions,
  syncDateOptions,
  formatSyncDateLabel,
  filtersSummary,
  animateSpin,
  onFilterOfChange,
  onFilterProductChange,
  onFilterMachineChange,
  onFilterColorChange,
  onFilterOperationChange,
  onFilterCostCenterChange,
  onFilterStatusDateChange,
  onFilterStatusChange,
  onFilterSyncDateChange,
  onReset,
}: BlockProductionOrdersFiltersProps) {
  return (
    <CollapsibleFilters summary={filtersSummary}>
      <div className="flex min-w-[100px] flex-1 flex-col sm:max-w-[120px]">
        <Label className="text-sm font-medium" htmlFor="filter-of">
          OF
        </Label>
        <Input
          id="filter-of"
          placeholder="Número"
          className="text-sm font-normal"
          inputMode="numeric"
          value={filterOf}
          onChange={(event) => onFilterOfChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[100px] flex-1 flex-col sm:max-w-[120px]">
        <Label className="text-sm font-medium" htmlFor="filter-product">
          Produto
        </Label>
        <Input
          id="filter-product"
          placeholder="Código"
          className="text-sm font-normal"
          value={filterProduct}
          onChange={(event) => onFilterProductChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[90px] flex-1 flex-col sm:max-w-[110px]">
        <Label className="text-sm font-medium" htmlFor="filter-machine">
          Máquina
        </Label>
        <Input
          id="filter-machine"
          placeholder="Cód."
          className="text-sm font-normal"
          value={filterMachine}
          onChange={(event) => onFilterMachineChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[120px] flex-1 flex-col sm:min-w-[140px] sm:max-w-[180px]">
        <Label className="text-sm font-medium" htmlFor="filter-color">
          Cor
        </Label>
        <Input
          id="filter-color"
          placeholder="Nome da cor"
          className="text-sm font-normal"
          value={filterColor}
          onChange={(event) => onFilterColorChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[90px] flex-1 flex-col sm:max-w-[110px]">
        <Label className="text-sm font-medium" htmlFor="filter-operation">
          Operação
        </Label>
        <Input
          id="filter-operation"
          placeholder="Op."
          className="text-sm font-normal"
          value={filterOperation}
          onChange={(event) => onFilterOperationChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[110px] flex-1 flex-col sm:max-w-[130px]">
        <Label className="text-sm font-medium" htmlFor="filter-cc">
          CC
        </Label>
        <Select value={filterCostCenter} onValueChange={onFilterCostCenterChange}>
          <SelectTrigger id="filter-cc" aria-label="Centro de custo" className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL}>Todos os CC</SelectItem>
            {costCenterOptions.map((cc) => (
              <SelectItem key={cc} value={cc}>
                {cc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[200px] flex-col">
        <Label className="text-sm font-medium">Status da data</Label>
        <div className="flex flex-wrap gap-1">
          {STATUS_DATE_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => onFilterStatusDateChange(value)}
              className={cn(
                'min-h-9 flex-1 px-2 text-xs sm:flex-none sm:px-3',
                filterStatusDate === value
                  ? 'bg-brand-muted text-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex min-w-[120px] flex-col">
        <Label className="text-sm font-medium">Status</Label>
        <Select
          value={filterStatus}
          onValueChange={(value) =>
            onFilterStatusChange(value as ProductionOrderStatus | typeof ALL)
          }
        >
          <SelectTrigger aria-label="Status interno" className="w-full min-w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL}>Todos</SelectItem>
            {INTERNAL_STATUS_OPTIONS.filter((v) => v !== ALL).map((status) => (
              <SelectItem key={status} value={status}>
                {PRODUCTION_ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-[180px] flex-1 flex-col sm:max-w-[220px]">
        <Label className="text-sm font-medium" htmlFor="filter-sync">
          Sincronização
        </Label>
        <Select value={filterSyncDate} onValueChange={onFilterSyncDateChange}>
          <SelectTrigger id="filter-sync" aria-label="Data de sincronização" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={ALL}>Todas as sincronizações</SelectItem>
            {syncDateOptions.map((date) => (
              <SelectItem key={date} value={date}>
                {formatSyncDateLabel(date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col items-center">
        <Label className="text-sm font-medium">Limpar</Label>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0 bg-brand text-white hover:bg-brand/90"
          onClick={onReset}
          aria-label="Limpar filtros"
        >
          <RotateCw
            className={cn('inline-block size-4', animateSpin && 'animate-spin')}
          />
        </Button>
      </div>
    </CollapsibleFilters>
  );
}
