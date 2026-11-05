import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HttpClientError } from '@/lib/http-client';
import { resetSessionExpiredGate } from '@/lib/session-expired';
import {
  changePassword,
  login,
  webSessionQueryKey,
} from '@/services/auth/auth.service';
import type { PublicUser } from '@/types/user';
import type { Unit } from '@/types/unit';
import { parseCardNumberInput } from '@/utils/card-number';
import { useWebSession } from '@/hooks/auth/use-web-session';

export type LoginFlowStep = 'credentials' | 'firstLoginPassword';

type LoginFormState = {
  cardNumber: string;
  password: string;
  unit: Unit;
  newPassword: string;
  confirmPassword: string;
};

const INITIAL_STATE: LoginFormState = {
  cardNumber: '',
  password: '',
  unit: 'PEDERTRACTOR',
  newPassword: '',
  confirmPassword: '',
};

export function useLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    data: sessionUser,
    isLoading: isSessionLoading,
    isSuccess,
  } = useWebSession();

  const [form, setForm] = useState<LoginFormState>(INITIAL_STATE);
  const [flowStep, setFlowStep] = useState<LoginFlowStep>('credentials');
  const [authenticatedUser, setAuthenticatedUser] = useState<PublicUser | null>(
    null,
  );
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: login,
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({
      userId,
      password,
    }: {
      userId: number;
      password: string;
    }) => changePassword(userId, { password }),
  });

  const isLoading = loginMutation.isPending || changePasswordMutation.isPending;

  useEffect(() => {
    if (isSessionLoading || !isSuccess || !sessionUser) {
      return;
    }

    if (sessionUser.firstLogin) {
      setAuthenticatedUser(sessionUser);
      setForm((current) => ({
        ...current,
        cardNumber: sessionUser.cardNumber,
        unit: sessionUser.unit,
      }));
      setFlowStep('firstLoginPassword');
      setInfoMessage('Troca de senha obrigatória no primeiro acesso.');
      return;
    }

    navigate('/', { replace: true });
  }, [isSessionLoading, isSuccess, sessionUser, navigate]);

  function updateField<K extends keyof LoginFormState>(
    key: K,
    value: LoginFormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goBackToCredentials(): void {
    setFlowStep('credentials');
    setForm((current) => ({
      ...INITIAL_STATE,
      cardNumber: current.cardNumber,
      unit: current.unit,
    }));
    setInfoMessage(null);
  }

  async function submitCredentials(): Promise<void> {
    const cardNumber = parseCardNumberInput(form.cardNumber);
    if (cardNumber === null) {
      toast.error('Informe um número de cartão válido.');
      return;
    }

    if (!form.password.trim()) {
      toast.error('Informe a senha.');
      return;
    }

    const response = await loginMutation.mutateAsync({
      cardNumber,
      password: form.password,
      unit: form.unit,
    });

    resetSessionExpiredGate();
    queryClient.setQueryData(webSessionQueryKey, response.user);

    if (response.user.firstLogin) {
      setAuthenticatedUser(response.user);
      setFlowStep('firstLoginPassword');
      setInfoMessage('Troca de senha obrigatória no primeiro acesso.');
      setForm((current) => ({
        ...current,
        newPassword: '',
        confirmPassword: '',
      }));
      return;
    }

    navigate('/', { replace: true });
  }

  async function submitFirstLoginPassword(): Promise<void> {
    if (!form.newPassword.trim()) {
      toast.error('Informe a nova senha.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    const userId = authenticatedUser?.id;
    if (!userId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    const response = await changePasswordMutation.mutateAsync({
      userId,
      password: form.newPassword,
    });

    resetSessionExpiredGate();
    queryClient.setQueryData(webSessionQueryKey, response.user);
    navigate('/', { replace: true });
  }

  async function submit(): Promise<void> {
    if (flowStep === 'credentials') {
      setInfoMessage(null);
    }

    try {
      if (flowStep === 'firstLoginPassword') {
        await submitFirstLoginPassword();
      } else {
        await submitCredentials();
      }
    } catch (error) {
      if (error instanceof HttpClientError) {
        toast.error(error.message);
      } else {
        toast.error(
          flowStep === 'firstLoginPassword'
            ? 'Falha inesperada ao alterar a senha.'
            : 'Falha inesperada ao fazer login.',
        );
      }
    }
  }

  return {
    isCheckingSession: isSessionLoading,
    flowStep,
    form,
    isLoading,
    infoMessage,
    setCardNumber: (value: string) => updateField('cardNumber', value),
    setPassword: (value: string) => updateField('password', value),
    setUnit: (value: Unit) => updateField('unit', value),
    setNewPassword: (value: string) => updateField('newPassword', value),
    setConfirmPassword: (value: string) => updateField('confirmPassword', value),
    goBackToCredentials,
    submit,
  };
}
