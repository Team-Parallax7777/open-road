import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open Road — Drive without a destination",
  description:
    "A relaxing 3D browser-based open-world driving experience. No timers, no scores, no missions. Only the road, the weather, and the rhythm of the journey.",
  keywords: [
    "driving game",
    "open world",
    "relaxing",
    "browser game",
    "3D driving",
    "scenic drive",
  ],
  authors: [{ name: "Open Road" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Open Road",
    description: "Drive without a destination. The journey is the destination.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Road",
    description: "Drive without a destination. The journey is the destination.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
