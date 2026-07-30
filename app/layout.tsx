import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const metadataBase = new URL(host ? `${protocol}://${host}` : "http://localhost:3000");

  return {
    metadataBase,
    title: "草坪守卫战 · Lawn Guardians",
    description:
      "收集阳光、布置七种原创植物防线，挑战三座机制各异的战场与跨关保留的无尽模式。",
    openGraph: {
      title: "草坪守卫战 · Lawn Guardians",
      description: "三个关卡、七种植物与无尽模式，一款可直接在浏览器游玩的原创五路植物塔防游戏。",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1536, height: 1024 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "草坪守卫战 · Lawn Guardians",
      description: "种下防线，守住花园。",
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
