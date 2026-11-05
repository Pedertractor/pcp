import { House, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import logoSystem from '@/public/logo-system.png';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useWebSession } from '@/hooks/auth/use-web-session';
import { canAccessUserManagement } from '@/lib/role-access';

export function AppSidebar() {
  const { pathname } = useLocation();
  const { data: user } = useWebSession();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex h-14 shrink-0 flex-row items-center border-b border-sidebar-border px-2 py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="PCP"
              className="hover:bg-transparent"
            >
              <Link to="/">
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-muted">
                  <img
                    src={logoSystem}
                    alt=""
                    className="size-10 object-contain"
                  />
                </div>
                <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
                  PCP
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-2 py-2">
        <SidebarGroup className="gap-0 p-1">
          <SidebarGroupLabel className="mb-0 h-5 px-2 py-0 text-[11px] leading-none">
            Início
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="sm"
                  tooltip="Início"
                  isActive={pathname === '/'}
                >
                  <Link to="/">
                    <House />
                    <span>Início</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canAccessUserManagement(user?.role) ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    tooltip="Usuários"
                    isActive={pathname.startsWith('/usuarios')}
                  >
                    <Link to="/usuarios">
                      <Users />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
