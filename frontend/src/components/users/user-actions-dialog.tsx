import { useEffect, useState } from 'react';
import {
  Building2,
  CreditCard,
  Loader2Icon,
  RotateCcw,
  Shield,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { roleLabel, unitLabel } from '@/lib/user-labels';
import { cn } from '@/lib/utils';
import type { PublicUser, UserRole } from '@/types/user';

type UserActionsDialogProps = {
  user: PublicUser | null;
  open: boolean;
  roles: UserRole[];
  isResetting: boolean;
  isUpdatingRole: boolean;
  isUpdatingStatus: boolean;
  canChangeRole: boolean;
  onOpenChange: (open: boolean) => void;
  onResetPassword: (user: PublicUser) => void;
  onChangeRole: (user: PublicUser, role: UserRole) => void;
  onToggleStatus: (user: PublicUser) => void;
};

export function UserActionsDialog({
  user,
  open,
  roles,
  isResetting,
  isUpdatingRole,
  isUpdatingStatus,
  canChangeRole,
  onOpenChange,
  onResetPassword,
  onChangeRole,
  onToggleStatus,
}: UserActionsDialogProps) {
  const [role, setRole] = useState<UserRole | null>(user?.role ?? null);
  const [active, setActive] = useState(user?.status ?? true);
  const isSaving = isUpdatingRole || isUpdatingStatus;

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setRole(user.role);
    setActive(user.status);
  }, [open, user]);

  const roleChanged = Boolean(user && canChangeRole && role && role !== user.role);
  const statusChanged = Boolean(user && active !== user.status);
  const hasChanges = roleChanged || statusChanged;

  function handleSave(): void {
    if (!user || isSaving) {
      return;
    }

    if (roleChanged && role) {
      onChangeRole(user, role);
    }

    if (statusChanged) {
      onToggleStatus(user);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto px-6 py-8 sm:max-w-lg sm:px-8 sm:py-10">
        <DialogHeader className="pr-8">
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Ajuste o perfil e se a pessoa pode entrar.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="grid gap-6 py-2">
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <div className="flex items-center gap-2.5">
                <UserRound className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{user.name ?? 'Sem nome'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cartão</p>
                  <p className="font-medium">{user.cardNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Unidade</p>
                  <p className="font-medium">{unitLabel(user.unit)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <Label id="edit-user-role" className="flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                Perfil
              </Label>
              <div
                role="radiogroup"
                aria-labelledby="edit-user-role"
                className="flex flex-wrap gap-2"
              >
                {roles.map((item) => {
                  const selected = role === item;

                  return (
                    <button
                      key={item}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!canChangeRole || isSaving}
                      className={cn(
                        'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                        (!canChangeRole || isSaving) && 'cursor-not-allowed opacity-60',
                      )}
                      onClick={() => setRole(item)}
                    >
                      {roleLabel(item)}
                    </button>
                  );
                })}
              </div>
              {canChangeRole ? null : (
                <p className="text-xs text-muted-foreground">
                  Seu perfil não permite alterar a função deste usuário.
                </p>
              )}
            </div>

            <div className="grid gap-3">
              <Label id="edit-user-status" className="flex items-center gap-2">
                <UserRoundCheck className="size-4 text-muted-foreground" />
                Situação
              </Label>
              <div
                role="radiogroup"
                aria-labelledby="edit-user-status"
                className="flex gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isSaving}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setActive(true)}
                >
                  Ativo
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!active}
                  disabled={isSaving}
                  className={cn(
                    'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                    !active
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => setActive(false)}
                >
                  Inativo
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="mt-2 gap-3 border-0 bg-transparent p-0 sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            className="h-10 px-4"
            disabled={!user || isResetting || isSaving}
            onClick={() => user && onResetPassword(user)}
          >
            {isResetting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Resetar senha
          </Button>
          <div className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!user || !hasChanges || isSaving}
              onClick={handleSave}
            >
              {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
