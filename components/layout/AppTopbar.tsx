"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppTopbarProps {
  title: string;
  /** 右侧可选内容，如用户菜单、通知等 */
  rightSlot?: React.ReactNode;
  /** 移动端菜单点击回调，由父组件打开侧栏抽屉 */
  onMenuClick?: () => void;
  className?: string;
}

export function AppTopbar({ title, rightSlot, onMenuClick, className }: AppTopbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-md md:hidden hover:bg-accent hover:text-accent-foreground"
          aria-label="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </header>
  );
}
