import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/auth/require-auth';
import { RequireUserManagement } from '@/components/auth/require-user-management';
import { SessionExpiredListener } from '@/components/auth/session-expired-listener';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/layouts/app-shell';
import { LoginPage } from '@/pages/auth/login-page';
import { HomePage } from '@/pages/home-page';
import { UsuariosPage } from '@/pages/usuarios-page';

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionExpiredListener />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route element={<RequireUserManagement />}>
              <Route path="/usuarios" element={<UsuariosPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
