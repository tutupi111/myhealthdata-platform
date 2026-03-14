import type { ReactNode } from "react";

export type AppRole = "patient" | "researcher" | "admin";

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}
