import type { NavItem } from "@/types/layout";

export const patientNavItems: NavItem[] = [
  { title: "首页", href: "/patient/dashboard" },
  { title: "健康档案", href: "/patient/records" },
  { title: "上传资料", href: "/patient/upload" },
  { title: "研究项目", href: "/patient/studies" },
  { title: "授权记录", href: "/patient/consents" },
  { title: "账户与隐私", href: "/patient/settings" },
];

export const researcherNavItems: NavItem[] = [
  { title: "首页", href: "/researcher/dashboard" },
  { title: "我的项目", href: "/researcher/projects" },
  { title: "创建研究", href: "/researcher/projects/new" },
  { title: "资料请求", href: "/researcher/requests" },
];

export const adminNavItems: NavItem[] = [
  { title: "系统概览", href: "/admin/dashboard" },
  { title: "患者管理", href: "/admin/patients" },
  { title: "研究者管理", href: "/admin/researchers" },
  { title: "项目管理", href: "/admin/projects" },
  { title: "资料审核", href: "/admin/records" },
  { title: "授权记录", href: "/admin/consents" },
  { title: "AI 模型", href: "/admin/ai-models" },
  { title: "AI 任务", href: "/admin/ai-tasks" },
  { title: "AI 日志", href: "/admin/ai-logs" },
  { title: "审计日志", href: "/admin/audit-logs" },
];
