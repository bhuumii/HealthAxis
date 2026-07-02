"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-8 lg:px-8">
        <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
          Checking your HealthAxis session...
        </div>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
