import type { Metadata } from "next";
import type { ReactNode } from "react";
import "leaflet/dist/leaflet.css";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "BikeLog",
  description: "A bike maintenance tracker with dashboard-first navigation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
