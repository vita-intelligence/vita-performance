import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/providers/AppProviders";

export const metadata: Metadata = {
  title: "Vita Performance",
  description: "Vita Performance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="default">
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}