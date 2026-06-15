import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import "leaflet/dist/leaflet.css";

import "@/app/globals.css";
import { cn } from "@/lib/utils";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BikeLog",
  description: "A bike maintenance tracker with dashboard-first navigation.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(sora.variable, inter.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const mode = localStorage.getItem("bikelog-theme-mode") || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch {}
})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
