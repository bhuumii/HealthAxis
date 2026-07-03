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
        <div className="rounded-md border border-[#cfd8df] bg-white p-4 text-sm font-semibold text-[#46515c]">
          Checking your HealthAxis session...
        </div>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
