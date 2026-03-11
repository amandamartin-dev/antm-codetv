"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboardIcon,
  CircleDotIcon,
  FolderIcon,
  UsersIcon,
  MapIcon,
  BellIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/issues", label: "Issues", icon: CircleDotIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/teams", label: "Teams", icon: UsersIcon },
  { href: "/map", label: "Map", icon: MapIcon },
];

type AppSidebarProps = {
  unreadNotifications?: number;
};

export function AppSidebar({ unreadNotifications = 0 }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <span className="text-sm font-bold text-sidebar-accent-foreground">
              🗺️
            </span>
          </div>
          <span className="text-base font-semibold text-sidebar-foreground">
            Regions
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/notifications")}
              tooltip="Notifications"
              render={<Link href="/notifications" />}
            >
              <BellIcon />
              <span>Notifications</span>
              {unreadNotifications > 0 && (
                <SidebarMenuBadge className="bg-sidebar-accent text-sidebar-accent-foreground">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </SidebarMenuBadge>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8",
              },
            }}
          />
          <span className="text-sm text-sidebar-foreground">Profile</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
