"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import type { NavItem } from "@/types/layout";
import { LogOut } from "lucide-react";

export interface AppSidebarProps {
  role: "patient" | "researcher" | "admin";
  navItems: NavItem[];
  title: string;
  /** 移动端作为抽屉时隐藏头部（与 Topbar 重复），桌面端始终显示 */
  showHeader?: boolean;
  /** 导航点击后回调（如关闭移动端抽屉） */
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({
  role,
  navItems,
  title,
  showHeader = true,
  onNavigate,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLocale();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    router.replace("/");
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground",
        "w-64 shrink-0",
        className
      )}
    >
      {showHeader && (
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Link
            href={`/${role}/dashboard`}
            className="font-semibold text-sidebar-primary hover:underline"
          >
            {title}
          </Link>
        </div>
      )}
      <nav className="flex-1 space-y-1 overflow-auto p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {t("common.backHome")}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t("common.logout")}
        </button>
      </div>
    </aside>
  );
}
