import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">EHF 患者数据钱包</h1>
        <p className="text-muted-foreground">以患者为中心的健康数据管理与共享平台 · 中国 POC</p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild>
          <Link href="/login?role=patient">患者端</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/login?role=researcher">研究者端</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login?role=admin">管理后台</Link>
        </Button>
      </div>
    </main>
  );
}
