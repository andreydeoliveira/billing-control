"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lancamentos", label: "Lançamentos" },
  { href: "/cadastros", label: "Cadastros" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="flex items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-lg bg-black/5 px-3 py-2 text-sm font-medium text-foreground dark:bg-white/10"
                : "rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-black/5 hover:text-foreground dark:text-zinc-300 dark:hover:bg-white/10"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
