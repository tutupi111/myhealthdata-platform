"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { AppRole } from "@/types/layout";
import type { NavItem } from "@/types/layout";

export interface RoleLayoutShellProps {
  role: AppRole;
  navItems: NavItem[];
  title: string;
  children: React.ReactNode;
  /** Topbar 右侧插槽 */
  topbarRightSlot?: React.ReactNode;
}

export function RoleLayoutShell({
  role,
  navItems,
  title,
  children,
  topbarRightSlot,
}: RoleLayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* 桌面端侧栏：md 及以上常驻 */}
      <div className="hidden md:block">
        <AppSidebar role={role} navItems={navItems} title={title} showHeader />
      </div>

      {/* 移动端侧栏：抽屉 */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" showClose className="p-0 w-64">
          <AppSidebar
            role={role}
            navItems={navItems}
            title={title}
            showHeader
            onNavigate={() => setMobileMenuOpen(false)}
            className="h-full border-0"
          />
        </SheetContent>
      </Sheet>

      {/* 主内容区：Topbar + 页面 */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopbar
          title={title}
          rightSlot={
            <>
              {topbarRightSlot}
              <LanguageSwitcher />
            </>
          }
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
