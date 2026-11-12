import { ChartGantt, Factory, House, Users, type LucideIcon } from 'lucide-react';
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

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
  visible?: boolean;
};

export function AppSidebar() {
  const { pathname } = useLocation();
  const { data: user } = useWebSession();

  const sections: NavSection[] = [
    {
      label: 'Geral',
      items: [
        { label: 'Início', to: '/', icon: House, isActive: (path) => path === '/' },
      ],
    },
    {
      label: 'Produção',
      items: [
        {
          label: 'Controle Produtivo',
          to: '/controle-produtivo',
          icon: Factory,
          isActive: (path) => path.startsWith('/controle-produtivo'),
        },
      ],
    },
    {
      label: 'Planejamento',
      items: [
        {
          label: 'PMP',
          to: '/pmp',
          icon: ChartGantt,
          isActive: (path) => path.startsWith('/pmp'),
        },
      ],
    },
    {
      label: 'Administração',
      visible: canAccessUserManagement(user?.role),
      items: [
        {
          label: 'Usuários',
          to: '/usuarios',
          icon: Users,
          isActive: (path) => path.startsWith('/usuarios'),
        },
      ],
    },
  ];

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
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-muted dark:bg-[#e8f6df]">
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

      <SidebarContent className="gap-3 py-2">
        {sections
          .filter((section) => section.visible !== false)
          .map((section) => (
            <SidebarGroup key={section.label} className="gap-0.5 p-1">
              <SidebarGroupLabel className="mb-0 h-6 px-2 py-0 text-[11px] leading-none font-semibold tracking-wider uppercase">
                {section.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        size="sm"
                        tooltip={item.label}
                        isActive={item.isActive(pathname)}
                      >
                        <Link to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
