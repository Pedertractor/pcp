import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { HttpClientError } from '@/lib/http-client';
import { assignableUserRolesForActor } from '@/lib/role-access';
import { roleLabel } from '@/lib/user-labels';
import { useWebSession } from '@/hooks/auth/use-web-session';
import {
  activateUser,
  inactivateUser,
  listUserRoles,
  listUsers,
  resetUserPassword,
  updateUserRole,
  userRolesQueryKey,
  usersListQueryKey,
} from '@/services/users/user.service';
import type { PublicUser, UserRole } from '@/types/user';
import { USER_ROLES } from '@/types/user';
import type { Unit } from '@/types/unit';

export type RoleFilterOption = UserRole | 'all';
export type StatusFilter = 'all' | 'active' | 'inactive';

export function roleFilterLabel(value: RoleFilterOption): string {
  if (value === 'all') {
    return 'Todos os perfis';
  }
  return roleLabel(value);
}

export function useUsersPage() {
  const queryClient = useQueryClient();
  const { data: actor } = useWebSession();
  const [filterName, setFilterName] = useState('');
  const [filterCard, setFilterCard] = useState('');
  const [filteredRole, setFilteredRole] = useState<RoleFilterOption>('all');
  const [unit, setUnit] = useState<Unit | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [animateSpin, setAnimateSpin] = useState(false);

  const usersQuery = useQuery({
    queryKey: usersListQueryKey,
    queryFn: listUsers,
  });

  const rolesQuery = useQuery({
    queryKey: userRolesQueryKey,
    queryFn: listUserRoles,
  });

  const roles = useMemo(() => {
    const assignable = assignableUserRolesForActor(actor?.role);
    const fromApi = rolesQuery.data ?? [];
    const known = new Set<UserRole>([...USER_ROLES, ...fromApi, ...assignable]);
    return [...known];
  }, [actor?.role, rolesQuery.data]);

  const roleOptions: RoleFilterOption[] = useMemo(
    () => ['all', ...roles],
    [roles],
  );

  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    const nameQuery = filterName.trim().toLocaleLowerCase('pt-BR');
    const cardQuery = filterCard.trim();

    return users.filter((user) => {
      if (nameQuery && !(user.name ?? '').toLocaleLowerCase('pt-BR').includes(nameQuery)) {
        return false;
      }
      if (cardQuery && !user.cardNumber.includes(cardQuery)) {
        return false;
      }
      if (filteredRole !== 'all' && user.role !== filteredRole) {
        return false;
      }
      if (unit !== 'all' && user.unit !== unit) {
        return false;
      }
      if (statusFilter === 'active' && !user.status) {
        return false;
      }
      if (statusFilter === 'inactive' && user.status) {
        return false;
      }
      return true;
    });
  }, [usersQuery.data, filterName, filterCard, filteredRole, unit, statusFilter]);

  function invalidateUsers() {
    void queryClient.invalidateQueries({ queryKey: usersListQueryKey });
  }

  function handleMutationError(error: unknown, fallback: string) {
    const message = error instanceof HttpClientError ? error.message : fallback;
    toast.error(message);
  }

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (_data, userId) => {
      toast.success('Senha resetada. A nova senha é o número do cartão.');
      invalidateUsers();
      setSelectedUser((current) =>
        current?.id === userId ? { ...current, firstLogin: true } : current,
      );
    },
    onError: (error) =>
      handleMutationError(error, 'Não foi possível resetar a senha.'),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: (_data, variables) => {
      toast.success('Perfil atualizado.');
      invalidateUsers();
      setSelectedUser((current) =>
        current?.id === variables.userId
          ? { ...current, role: variables.role }
          : current,
      );
    },
    onError: (error) =>
      handleMutationError(error, 'Não foi possível alterar o perfil.'),
  });

  const statusMutation = useMutation({
    mutationFn: async (user: PublicUser) => {
      if (user.status) {
        await inactivateUser(user.id);
        return false;
      }
      await activateUser(user.id);
      return true;
    },
    onSuccess: (status, user) => {
      toast.success(status ? 'Usuário ativado.' : 'Usuário inativado.');
      invalidateUsers();
      setSelectedUser((current) =>
        current?.id === user.id ? { ...current, status } : current,
      );
    },
    onError: (error) =>
      handleMutationError(error, 'Não foi possível alterar o status.'),
  });

  const activeFiltersCount = [
    filterName.trim(),
    filterCard.trim(),
    filteredRole !== 'all',
    unit !== 'all',
    statusFilter !== 'all',
  ].filter(Boolean).length;

  const filtersSummary =
    activeFiltersCount > 0
      ? `${activeFiltersCount} filtro(s) ativo(s) · ${filteredUsers.length} resultado(s)`
      : `${filteredUsers.length} usuário(s) listado(s)`;

  const resetFilters = useCallback(() => {
    setAnimateSpin(true);
    setFilterName('');
    setFilterCard('');
    setFilteredRole('all');
    setUnit('all');
    setStatusFilter('all');
    window.setTimeout(() => setAnimateSpin(false), 400);
  }, []);

  const handleSelectRole = useCallback((value: RoleFilterOption | null) => {
    setFilteredRole(value ?? 'all');
  }, []);

  function openUserDialog(user: PublicUser) {
    setSelectedUser(user);
    setDialogOpen(true);
  }

  return {
    usersQuery,
    roles,
    roleOptions,
    filteredUsers,
    filterName,
    setFilterName,
    filterCard,
    setFilterCard,
    filteredRole,
    setFilteredRole,
    unit,
    setUnit,
    statusFilter,
    setStatusFilter,
    resetFilters,
    animateSpin,
    filtersSummary,
    handleSelectRole,
    selectedUser,
    dialogOpen,
    setDialogOpen,
    openUserDialog,
    resetPassword: (user: PublicUser) => resetMutation.mutate(user.id),
    changeRole: (user: PublicUser, role: UserRole) =>
      roleMutation.mutate({ userId: user.id, role }),
    toggleStatus: (user: PublicUser) => statusMutation.mutate(user),
    isResetting: resetMutation.isPending,
    isUpdatingRole: roleMutation.isPending,
    isUpdatingStatus: statusMutation.isPending,
    canChangeRole: assignableUserRolesForActor(actor?.role).length > 0,
  };
}
