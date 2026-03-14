import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { MockStoreProvider } from "@/context/MockStoreContext";

export const metadata: Metadata = {
  title: "EHF 患者数据钱包",
  description: "以患者为中心的健康数据管理与共享平台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <MockStoreProvider>
            {children}
          </MockStoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
