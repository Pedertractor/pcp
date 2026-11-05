import { Loader2 } from 'lucide-react';

import { LoginForm } from '@/components/login-form';
import { useLoginPage } from '@/hooks/auth/use-login-page';

export function LoginPage() {
  const {
    isCheckingSession,
    flowStep,
    form,
    isLoading,
    infoMessage,
    setCardNumber,
    setPassword,
    setUnit,
    setNewPassword,
    setConfirmPassword,
    goBackToCredentials,
    submit,
  } = useLoginPage();

  if (isCheckingSession) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LoginForm
      flowStep={flowStep}
      cardNumber={form.cardNumber}
      password={form.password}
      unit={form.unit}
      newPassword={form.newPassword}
      confirmPassword={form.confirmPassword}
      isLoading={isLoading}
      infoMessage={infoMessage}
      onCardNumberChange={setCardNumber}
      onPasswordChange={setPassword}
      onUnitChange={setUnit}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={() => {
        void submit();
      }}
      onBackToCredentials={goBackToCredentials}
    />
  );
}
