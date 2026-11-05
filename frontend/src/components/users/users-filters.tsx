import { RotateCw } from 'lucide-react';

import { CollapsibleFilters } from '@/components/collapsible-filters';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  roleFilterLabel,
  type RoleFilterOption,
  type StatusFilter,
} from '@/hooks/users/use-users-page';
import { cn } from '@/lib/utils';
import type { Unit } from '@/types/unit';

type UnitFilter = Unit | 'all';

type UsersFiltersProps = {
  filterName: string;
  filterCard: string;
  filteredRole: RoleFilterOption;
  unit: UnitFilter;
  statusFilter: StatusFilter;
  roleOptions: RoleFilterOption[];
  filtersSummary: string;
  animateSpin: boolean;
  onFilterNameChange: (value: string) => void;
  onFilterCardChange: (value: string) => void;
  onFilteredRoleChange: (value: RoleFilterOption | null) => void;
  onUnitChange: (value: UnitFilter) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onReset: () => void;
};

export function UsersFilters({
  filterName,
  filterCard,
  filteredRole,
  unit,
  statusFilter,
  roleOptions,
  filtersSummary,
  animateSpin,
  onFilterNameChange,
  onFilterCardChange,
  onFilteredRoleChange,
  onUnitChange,
  onStatusFilterChange,
  onReset,
}: UsersFiltersProps) {
  const roleAnchorRef = useComboboxAnchor();

  return (
    <CollapsibleFilters summary={filtersSummary}>
      <div className="flex min-w-[140px] flex-1 flex-col sm:max-w-[200px]">
        <Label className="text-sm font-medium" htmlFor="filter-name">
          Nome
        </Label>
        <Input
          id="filter-name"
          placeholder="Digite o nome"
          className="text-sm font-normal"
          value={filterName}
          onChange={(event) => onFilterNameChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[120px] flex-1 flex-col sm:max-w-[140px]">
        <Label className="text-sm font-medium" htmlFor="filter-card">
          Cartão
        </Label>
        <Input
          id="filter-card"
          placeholder="Digite o cartão"
          className="text-sm font-normal"
          inputMode="numeric"
          maxLength={8}
          value={filterCard}
          onChange={(event) => onFilterCardChange(event.target.value)}
        />
      </div>

      <div className="flex min-w-[160px] flex-1 flex-col sm:max-w-[220px]">
        <Label className="text-sm font-medium">Perfil</Label>
        <Combobox
          items={roleOptions}
          value={filteredRole}
          onValueChange={onFilteredRoleChange}
          itemToStringLabel={roleFilterLabel}
        >
          <div
            ref={roleAnchorRef}
            className="flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs"
          >
            <ComboboxInput
              placeholder="Todos os perfis"
              className="min-h-9 min-w-0 flex-1 border-0 text-sm font-normal shadow-none"
              showClear
            />
          </div>
          <ComboboxContent anchor={roleAnchorRef} className="w-(--anchor-width)">
            <ComboboxEmpty>Nenhum perfil encontrado.</ComboboxEmpty>
            <ComboboxList>
              {(value: RoleFilterOption) => (
                <ComboboxItem key={value} value={value}>
                  {roleFilterLabel(value)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="flex min-w-[120px] flex-col">
        <Label className="text-sm font-medium">Unidade</Label>
        <div className="flex gap-1">
          {(['all', 'PEDERTRACTOR', 'TRACTOR'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => onUnitChange(value)}
              className={cn(
                'min-h-9 flex-1 px-3',
                unit === value
                  ? 'bg-brand-muted text-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {value === 'all' ? 'Todas' : value === 'PEDERTRACTOR' ? 'P' : 'T'}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex min-w-[140px] flex-col">
        <Label className="text-sm font-medium">Status</Label>
        <div className="flex gap-1">
          {(
            [
              ['all', 'Todos'],
              ['active', 'Ativos'],
              ['inactive', 'Inativos'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              onClick={() => onStatusFilterChange(value)}
              className={cn(
                'min-h-9 flex-1 px-2 text-xs',
                statusFilter === value
                  ? 'bg-brand-muted text-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <Label className="text-sm font-medium">Limpar filtro</Label>
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
