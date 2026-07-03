import type { Metadata } from "next";
import Link from "next/link";
import { Languages } from "lucide-react";
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
            <div className="min-h-screen bg-[#f5f7f8]">
              <header className="sticky top-0 z-40 border-b border-[#cfd8df] bg-[#f5f7f8]/95 px-4 py-2.5 backdrop-blur lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <Link className="flex min-w-64 items-center gap-3" href="/overview">
                    <span className="grid h-10 w-10 place-items-center rounded-md border border-[#164e63] bg-[#164e63] font-mono text-sm font-bold text-white">
                      HA
                    </span>
                    <span>
                      <strong className="block text-lg leading-5 text-[#17212b]">HealthAxis</strong>
                      <small className="mt-1 flex items-center gap-1 text-[11px] font-semibold uppercase text-[#5c6873]">
                        <Languages size={12} strokeWidth={1.75} /> District operations command
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
