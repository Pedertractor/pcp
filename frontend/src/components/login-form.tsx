import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { LoginFactoryScene } from '@/components/auth/login-factory-scene';
import { ThemeToggle } from '@/components/theme-toggle';
import logoSystem from '@/public/logo-system.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LoginFlowStep } from '@/hooks/auth/use-login-page';
import { cn } from '@/lib/utils';
import { UNITS, UNIT_LABELS, type Unit } from '@/types/unit';

type LoginFormProps = {
  flowStep: LoginFlowStep;
  cardNumber: string;
  password: string;
  unit: Unit;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
  infoMessage: string | null;
  onCardNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onUnitChange: (value: Unit) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onBackToCredentials?: () => void;
};

const fieldClassName = 'h-12 px-3.5 text-base md:text-base';

function getGreeting(date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Bom dia!';
  }

  if (hour >= 12 && hour < 18) {
    return 'Boa tarde!';
  }

  return 'Boa noite!';
}

export function LoginForm({
  flowStep,
  cardNumber,
  password,
  unit,
  newPassword,
  confirmPassword,
  isLoading,
  infoMessage,
  onCardNumberChange,
  onPasswordChange,
  onUnitChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBackToCredentials,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const isFirstLoginStep = flowStep === 'firstLoginPassword';
  const selectedUnitIndex = Math.max(0, UNITS.indexOf(unit));

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  const greeting = getGreeting();

  return (
    <div className="relative flex min-h-dvh min-h-[100dvh] flex-col bg-background lg:grid lg:min-h-dvh lg:grid-cols-2 lg:flex-none">
      <div className="absolute top-3 left-3 z-20 lg:hidden">
        <div
          className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-muted dark:bg-[#e8f6df]"
          aria-hidden
        >
          <img
            src={logoSystem}
            alt=""
            className="size-6 object-contain"
          />
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 flex max-w-[calc(100%-5rem)] items-start justify-end gap-2 sm:top-4 sm:right-4 sm:max-w-[calc(100%-1.5rem)] lg:max-w-[calc(100%-1.5rem)]">
        <p className="hidden text-sm text-muted-foreground sm:block">
          <span className="font-medium text-foreground">{greeting}</span>
          <span className="mx-2" aria-hidden>
            |
          </span>
          Powered by automation team
        </p>
        <p className="text-xs text-muted-foreground sm:hidden">
          <span className="font-medium text-foreground">{greeting}</span>
        </p>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 flex-col lg:contents">
      <div className="order-1 flex flex-1 items-center justify-center px-4 py-20 sm:px-6 sm:py-16 lg:order-none lg:py-16">
        <form
          className="flex w-full max-w-md flex-col gap-6"
          onSubmit={handleSubmit}
        >
          <div>
            <p className="text-sm font-medium tracking-wide text-brand uppercase">
              PCP
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {isFirstLoginStep ? 'Defina sua senha' : 'Entrar'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFirstLoginStep
                ? 'No primeiro acesso a senha inicial é o número do cartão.'
                : 'Use o cartão cadastrado na sua unidade.'}
            </p>
          </div>

          {infoMessage ? (
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {infoMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-5">
            {isFirstLoginStep ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      className={cn(fieldClassName, 'pr-11')}
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      autoComplete="new-password"
                      onChange={(event) => onNewPasswordChange(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowNewPassword((current) => !current)}
                      aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    className={fieldClassName}
                    type="password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(event) => onConfirmPasswordChange(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="card-number">Cartão</Label>
                  <Input
                    id="card-number"
                    className={fieldClassName}
                    inputMode="numeric"
                    value={cardNumber}
                    autoComplete="username"
                    onChange={(event) => onCardNumberChange(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label id="unit-label">Unidade</Label>
                  <div
                    role="radiogroup"
                    aria-labelledby="unit-label"
                    className="relative grid grid-cols-2 rounded-xl bg-muted p-1"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg bg-primary shadow-sm transition-transform duration-300 ease-out"
                      style={{
                        width: 'calc(50% - 0.375rem)',
                        transform:
                          selectedUnitIndex === 0
                            ? 'translateX(0)'
                            : 'translateX(calc(100% + 0.25rem))',
                      }}
                    />
                    {UNITS.map((item) => {
                      const isSelected = unit === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={cn(
                            'relative z-10 h-12 rounded-lg text-base font-medium transition-colors duration-300',
                            isSelected
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => onUnitChange(item)}
                        >
                          {UNIT_LABELS[item]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      className={cn(fieldClassName, 'pr-11')}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      autoComplete="current-password"
                      onChange={(event) => onPasswordChange(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {isFirstLoginStep ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={onBackToCredentials}
                disabled={isLoading}
              >
                Voltar
              </Button>
            ) : null}
            <Button type="submit" className="h-10 px-5" disabled={isLoading}>
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              {isFirstLoginStep ? 'Salvar senha' : 'Entrar'}
            </Button>
          </div>
        </form>
      </div>

      <div className="order-2 hidden min-h-0 shrink-0 flex-col items-center justify-center overflow-hidden bg-background px-4 py-6 lg:order-none lg:flex lg:min-h-dvh lg:min-h-0 lg:flex-1 lg:py-0">
        <div className="w-full">
          <LoginFactoryScene />
        </div>
      </div>
      </div>

      <footer className="relative z-10 order-3 flex flex-col gap-3 border-t border-border/50 bg-background/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-end sm:justify-between sm:gap-4 lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:border-t-0 lg:bg-transparent lg:px-6 lg:pb-6 lg:pt-0 lg:backdrop-blur-none">
        <p className="pointer-events-none flex-1 text-center text-xs leading-snug text-muted-foreground sm:text-sm lg:text-center">
          Planejamento e Controle da Produção — Pedertractor &amp;
          TractorComponents
        </p>
        <div className="hidden shrink-0 justify-end lg:flex">
          <div
            className="flex aspect-square size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-muted dark:bg-[#e8f6df] sm:size-11"
            aria-hidden
          >
            <img
              src={logoSystem}
              alt=""
              className="size-[2.75rem] object-contain sm:size-12"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
