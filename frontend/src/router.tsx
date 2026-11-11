import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/components/auth/require-auth';
import { RequireUserManagement } from '@/components/auth/require-user-management';
import { SessionExpiredListener } from '@/components/auth/session-expired-listener';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/layouts/app-shell';
import { LoginPage } from '@/pages/auth/login-page';
import { BlockDetailPage } from '@/pages/blocks/block-detail-page';
import { BlockProductionOrdersPage } from '@/pages/blocks/block-production-orders-page';
import { BlockProductionOrderProcessesPage } from '@/pages/blocks/block-production-order-processes-page';
import { BlocksPage } from '@/pages/blocks/blocks-page';
import { PmpBlockDashboardPage } from '@/pages/pmp/pmp-block-dashboard-page';
import { PmpBlockWeeksPage } from '@/pages/pmp/pmp-block-weeks-page';
import { PmpBlocksPage } from '@/pages/pmp/pmp-blocks-page';
import { PmpWeeklyGoalDaysPage } from '@/pages/pmp/pmp-weekly-goal-days-page';
import { HomePage } from '@/pages/home-page';
import { UsuariosPage } from '@/pages/usuarios-page';

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionExpiredListener />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route
            path="/controle-produtivo/:blockId"
            element={<BlockDetailPage />}
          />
          <Route
            path="/controle-produtivo/:blockId/ofs"
            element={<BlockProductionOrdersPage />}
          />
          <Route
            path="/controle-produtivo/:blockId/ofs/:orderId/processes"
            element={<BlockProductionOrderProcessesPage />}
          />
          <Route path="/pmp/:blockId" element={<PmpBlockWeeksPage />} />
          <Route path="/pmp/:blockId/dashboard" element={<PmpBlockDashboardPage />} />
          <Route
            path="/pmp/:blockId/metas/:goalId"
            element={<PmpWeeklyGoalDaysPage />}
          />
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/controle-produtivo" element={<BlocksPage />} />
            <Route path="/pmp" element={<PmpBlocksPage />} />
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
