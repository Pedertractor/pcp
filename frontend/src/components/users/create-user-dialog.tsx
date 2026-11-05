import { Building2, CreditCard, Loader2Icon, Shield, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateUser } from '@/hooks/users/use-create-user';
import { roleLabel, unitLabel } from '@/lib/user-labels';
import { cn } from '@/lib/utils';
import { UNITS, type Unit } from '@/types/unit';
import type { UserRole } from '@/types/user';

export function CreateUserDialog() {
  const {
    assignableRoles,
    employeeData,
    employeeLoading,
    employeeQueryIsError,
    employeeQueryErrorMessage,
    employeeFoundButInactive,
    showNotFound,
    designation,
    unit,
    role,
    openDialog,
    setOpenDialog,
    handleSendUserInformations,
    handleSubmit,
    mutationCreateUser,
    register,
    setValue,
    errors,
    isDisabledSubmit,
  } = useCreateUser();

  const employeeReady = Boolean(employeeData && !employeeFoundButInactive);

  return (
    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
      <DialogTrigger asChild>
        <Button type="button">Novo usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 sm:max-w-lg sm:px-8 sm:py-10">
        <DialogHeader className="pr-8">
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            A senha inicial é o número do cartão.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-6 py-2"
          onSubmit={handleSubmit(handleSendUserInformations)}
        >
          <div className="grid gap-3">
            <Label htmlFor="create-card" className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Cartão
            </Label>
            <Input
              id="create-card"
              inputMode="numeric"
              autoComplete="off"
              className="h-10"
              {...register('cardNumber')}
            />
            {errors.cardNumber ? (
              <p className="text-sm text-destructive">{errors.cardNumber.message}</p>
            ) : null}
          </div>

          <div className="grid gap-3">
            <Label id="create-user-unit" className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              Unidade
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="create-user-unit"
              className="flex flex-wrap gap-2"
            >
              {UNITS.map((item) => {
                const selected = unit === item;

                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() =>
                      setValue('unit', item as Unit, { shouldValidate: true })
                    }
                  >
                    {unitLabel(item)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <Label id="create-user-role" className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              Perfil
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="create-user-role"
              className="flex flex-wrap gap-2"
            >
              {assignableRoles.map((item) => {
                const selected = role === item;

                return (
                  <button
                    key={item}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() =>
                      setValue('role', item as UserRole, { shouldValidate: true })
                    }
                  >
                    {roleLabel(item)}
                  </button>
                );
              })}
            </div>
          </div>

          {employeeLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Consultando colaborador…
            </p>
          ) : null}

          {employeeQueryIsError ? (
            <p className="text-sm text-destructive">{employeeQueryErrorMessage}</p>
          ) : null}

          {showNotFound ? (
            <p className="text-sm text-muted-foreground">
              Colaborador não encontrado para este cartão e unidade.
            </p>
          ) : null}

          {employeeFoundButInactive ? (
            <p className="text-sm text-destructive">Colaborador inativo.</p>
          ) : null}

          {employeeReady && employeeData ? (
            <div className="flex items-center gap-2.5">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{employeeData.name}</p>
                {designation ? (
                  <p className="text-sm text-muted-foreground">
                    {designation.position.name} · {designation.sector.name}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenDialog(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isDisabledSubmit}>
              {mutationCreateUser.isPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
