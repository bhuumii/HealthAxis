import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Languages } from "lucide-react";
import { AuthProvider } from "@/components/auth-provider";
import { LanguageProvider } from "@/components/language-provider";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "HealthAxis",
  description: "AI-assisted district health centre operations dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <LanguageProvider>
            <div className="min-h-screen bg-slate-50">
              <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <Link className="flex min-w-64 items-center gap-3" href="/overview">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm">
                      <Activity size={23} />
                    </span>
                    <span>
                      <strong className="block text-lg leading-5 text-slate-950">HealthAxis</strong>
                      <small className="mt-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-normal text-slate-500">
                        <Languages size={13} /> District command centre
                      </small>
                    </span>
                  </Link>
                  <Header />
                </div>
              </header>
              {children}
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
