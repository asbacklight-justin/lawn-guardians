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
      "收集阳光、布置原创植物防线，在三波夜行入侵者面前守住五条草坪。",
    openGraph: {
      title: "草坪守卫战 · Lawn Guardians",
      description: "一款原创、可直接在浏览器游玩的五路植物塔防游戏。",
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
