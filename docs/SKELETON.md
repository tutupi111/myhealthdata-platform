# EHF 患者数据钱包 · 项目骨架说明

本文档描述当前骨架范围：三套角色路由、布局与导航、占位页及响应式适配。不含数据库、API、认证。

---

## 一、新增 / 修改文件清单

### 根配置与样式
| 路径 | 说明 |
|------|------|
| `package.json` | 依赖（含 `@radix-ui/react-dialog` 用于 Sheet） |
| `tsconfig.json` | TypeScript 配置 |
| `next.config.mjs` | Next.js 配置 |
| `tailwind.config.ts` | Tailwind + shadcn 主题变量 |
| `postcss.config.mjs` | PostCSS |
| `components.json` | shadcn 配置 |
| `next-env.d.ts` | Next 类型 |
| `.eslintrc.json` | ESLint |
| `.gitignore` | Git 忽略 |
| `app/globals.css` | 全局样式与 CSS 变量 |
| `app/layout.tsx` | 根 layout（含 viewport） |
| `app/page.tsx` | 首页入口（三端入口按钮） |

### 类型与配置
| 路径 | 说明 |
|------|------|
| `types/layout.ts` | `AppRole`、`NavItem` 类型定义 |
| `config/navigation.ts` | 三端导航配置（patient / researcher / admin） |
| `lib/utils.ts` | `cn()` 等工具 |

### 布局组件（可复用）
| 路径 | 说明 |
|------|------|
| `components/layout/AppSidebar.tsx` | 侧栏（支持桌面常驻 + 移动端传入抽屉） |
| `components/layout/AppTopbar.tsx` | 顶栏（标题 + 可选右侧插槽 + 移动端菜单按钮） |
| `components/layout/RoleLayoutShell.tsx` | 角色壳：侧栏 + 顶栏 + 主内容区，含移动端抽屉逻辑 |
| `components/layout/index.ts` | 统一导出 `AppSidebar`、`AppTopbar`、`RoleLayoutShell` |

### UI 组件
| 路径 | 说明 |
|------|------|
| `components/ui/button.tsx` | 按钮（shadcn 风格，支持 asChild） |
| `components/ui/sheet.tsx` | 抽屉（Radix Dialog，用于移动端侧栏） |

### 角色 layout（仅用 RoleLayoutShell + 导航配置）
| 路径 | 说明 |
|------|------|
| `app/patient/layout.tsx` | 患者端 layout |
| `app/researcher/layout.tsx` | 研究者端 layout |
| `app/admin/layout.tsx` | 管理端 layout |

### 占位页
| 路径 | 说明 |
|------|------|
| `app/patient/dashboard/page.tsx` | 患者首页占位 |
| `app/researcher/dashboard/page.tsx` | 研究者首页占位 |
| `app/admin/dashboard/page.tsx` | 管理后台首页占位 |

---

## 二、路由结构

```
/                         → 首页（三端入口）
/patient/
  layout                   → 患者端壳（Sidebar + Topbar + main）
  dashboard                → 患者首页占位
  records                  → 仅侧栏有链接，页面未建
  upload
  studies
  consents
  settings

/researcher/
  layout                   → 研究者端壳
  dashboard                → 研究者首页占位
  projects                 → 仅侧栏有链接，页面未建
  projects/new
  requests

/admin/
  layout                   → 管理端壳
  dashboard                → 后台首页占位
  patients
  researchers
  projects
  records
  consents
  audit-logs
```

当前**已实现并可访问**的路由只有：

- `/`
- `/patient/dashboard`
- `/researcher/dashboard`
- `/admin/dashboard`

其余路径仅在侧栏有链接，点击会 404，后续按需新增页面即可。

---

## 三、建议验收顺序

1. **首页**
   - 打开 `/`
   - 检查：标题、三个入口按钮（患者端 / 研究者端 / 管理后台）可点击并跳转到对应 dashboard。

2. **患者端**
   - 打开 `/patient/dashboard`
   - 桌面：左侧固定侧栏、顶部顶栏、主区为「患者首页」占位内容。
   - 移动：顶栏左侧有菜单图标，点击后左侧滑出侧栏抽屉；主区内容可读、不溢出。

3. **研究者端**
   - 打开 `/researcher/dashboard`
   - 布局同患者端，侧栏为研究者导航（首页、我的项目、创建研究、资料请求）。
   - 移动端同样用顶栏菜单打开侧栏。

4. **管理后台**
   - 打开 `/admin/dashboard`
   - 布局一致，侧栏为管理项（系统概览、患者/研究者/项目管理、资料审核、授权记录、审计日志）。
   - 移动端行为同上。

5. **导航与返回**
   - 在各端侧栏点击「首页」「健康档案」等，当前项高亮正确。
   - 点击「返回首页」回到 `/`。

6. **响应式**
   - 桌面（≥768px）：侧栏常驻，顶栏在主内容区上方。
   - 移动（<768px）：仅顶栏 + 主内容；侧栏通过顶栏菜单以抽屉形式打开。

---

## 四、运行方式

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:3000`，按上面顺序验收即可。

---

## 五、后续可做

- 为 `records`、`upload`、`studies` 等路由新增占位页或真实页面。
- 在 `RoleLayoutShell` 的 `topbarRightSlot` 接入用户信息、退出等（认证未实现前可用占位）。
- 按需增加更多 shadcn 组件（如 Card、Table、Form），保持从 `@/components/ui` 和 `@/components/layout` 引用。
