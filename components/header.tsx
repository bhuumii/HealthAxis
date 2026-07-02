"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, Route, ShieldAlert, UserCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { languageNames, useLanguage } from "@/components/language-provider";

const navItems = [
  { href: "/overview", labelKey: "overview", icon: LayoutDashboard },
  { href: "/alerts", labelKey: "alerts", icon: Bell },
  { href: "/redistribution", labelKey: "redistribution", icon: Route },
  { href: "/intervention", labelKey: "intervention", icon: ShieldAlert }
];

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const authPage = pathname === "/login" || pathname === "/signup";

  return (
    <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
      {!authPage ? (
        <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/overview" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                  active ? "bg-emerald-700 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={16} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
        value={language}
        aria-label="Dashboard language"
        onChange={(event) => setLanguage(event.target.value as typeof language)}
      >
        {Object.entries(languageNames).map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      {user ? (
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          <UserCircle size={16} className="text-emerald-700" />
          <span className="max-w-44 truncate">{user.email ?? "Signed in"}</span>
          <button className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700" type="button" onClick={() => void signOut()}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      ) : authPage ? null : (
        <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50" href="/login">
          <UserCircle size={16} />
          Sign in
        </Link>
      )}
    </div>
  );
}
