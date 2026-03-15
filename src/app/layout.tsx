import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { TopNav } from "@/components/top-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Billing Control",
  description: "Controle financeiro pessoal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-10 border-b border-border bg-background/70 backdrop-blur">
            <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                    <path
                      fill="currentColor"
                      d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 15.5h-2v-1h2a2 2 0 0 0 0-4h-2a4 4 0 0 1 0-8h2v1h-2a2 2 0 0 0 0 4h2a4 4 0 0 1 0 8Z"
                    />
                  </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wide">Billing Control</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">Controle financeiro pessoal</div>
                </div>
              </div>

              <TopNav />
            </div>
          </header>

          <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
