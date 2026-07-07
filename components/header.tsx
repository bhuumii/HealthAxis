"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, Route, ShieldAlert, SlidersHorizontal, UserCircle } from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import { useAuth } from "@/components/auth-provider";
import { useDistrictSelection } from "@/components/district-provider";
import { languageNames, useLanguage, type Language } from "@/components/language-provider";

const navItems = [
  { href: "/overview", labelKey: "overview", icon: LayoutDashboard },
  { href: "/alerts", labelKey: "alerts", icon: Bell },
  { href: "/redistribution", labelKey: "redistribution", icon: Route },
  { href: "/intervention", labelKey: "intervention", icon: ShieldAlert },
  { href: "/simulator", labelKey: "simulator", icon: SlidersHorizontal }
];

export function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { hrefWithDistrict } = useDistrictSelection();
  const authPage = pathname === "/login" || pathname === "/signup";

  return (
    <div className="flex w-full flex-col gap-3 lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      {!authPage ? (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href === "/overview" && pathname === "/");
            return (
              <Link
                key={item.href}
                href={hrefWithDistrict(item.href)}
                className={`inline-flex h-9 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${
                  active ? "border-[#164e63] bg-white text-[#164e63]" : "border-transparent text-[#46515c] hover:border-[#b8c7d0] hover:bg-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={15} strokeWidth={1.75} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:gap-3">
        <CustomSelect
          value={language}
          options={Object.entries(languageNames).map(([value, label]) => ({ value: value as Language, label }))}
          onChange={setLanguage}
          ariaLabel="Dashboard language"
          className="w-full sm:w-56"
          menuClassName="sm:left-0 sm:right-auto"
        />
      {user ? (
        <div className="flex items-center gap-2 rounded-md border border-[#cfd8df] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#46515c]">
          <UserCircle size={15} strokeWidth={1.75} className="text-[#5c6873]" />
          <span className="max-w-44 truncate">{user.email ?? "Signed in"}</span>
          <button className="inline-flex items-center gap-1 text-[#5c6873] hover:text-[#9f3a38]" type="button" onClick={() => void signOut()}>
            <LogOut size={14} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      ) : authPage ? null : (
        <Link className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cfd8df] bg-white px-3 text-sm font-semibold text-[#46515c] hover:bg-[#eef3f5]" href="/login">
          <UserCircle size={15} strokeWidth={1.75} />
          Sign in
        </Link>
      )}
      </div>
    </div>
  );
}
