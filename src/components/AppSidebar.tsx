"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleUserRound,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  ReceiptText,
  Settings,
  UserRound,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  href?: string;
};

const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Propriétaires",
    icon: CircleUserRound,
    href: "/owners",
  },
  {
    label: "Biens",
    icon: Building2,
    href: "/properties",
  },
  {
    label: "Unités",
    icon: Home,
    href: "/units",
  },
  {
    label: "Locataires",
    icon: Users,
    href: "/tenants",
  },
  {
    label: "Baux",
    icon: FileText,
    href: "/leases",
  },
  {
    label: "Échéances",
    icon: CalendarDays,
    href: "/schedules",
  },
  {
    label: "Paiements",
    icon: CreditCard,
    href: "/payments",
  },
  {
    label: "Dépenses",
    icon: WalletCards,
    href: "/expenses",
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/maintenance",
  },
  {
    label: "Documents",
    icon: ReceiptText,
    href: "/documents",
  },
  {
    label: "Rapports",
    icon: BarChart3,
    href: "/reports",
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  const baseClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition";

  const activeClass =
    "bg-gradient-to-r from-red-500 to-[#ff675b] text-white shadow-[0_10px_24px_rgba(239,68,68,0.22)]";

  const inactiveClass =
    "text-white/75 hover:bg-white/5 hover:text-white";

  const settingsActive =
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  return (
    <aside className="sticky top-0 hidden h-screen w-[218px] shrink-0 flex-col bg-[#151515] px-3 py-4 text-white lg:flex">
      <div className="flex h-12 items-center gap-3 px-2">
        <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-xl border border-red-400/40 bg-[#232323] p-2 shadow-inner">
          <span className="rounded-sm bg-red-400" />
          <span className="rounded-sm bg-red-400" />
          <span className="rounded-sm bg-red-400" />
          <span className="rounded-sm bg-red-400" />
        </div>

        <div>
          <p className="text-[17px] font-extrabold tracking-tight">
            Alteract
          </p>

          <p className="text-[14px] text-white/45">
            Gestion locative
          </p>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href
                ? pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)
                : false;

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  baseClass,
                  isActive ? activeClass : inactiveClass,
                ].join(" ")}
              >
                <Icon className="h-[17px] w-[17px]" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              disabled
              title="Module à venir"
              className={[
                baseClass,
                "cursor-not-allowed text-white/35",
              ].join(" ")}
            >
              <Icon className="h-[17px] w-[17px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          href="/settings"
          className={[
            baseClass,
            settingsActive ? activeClass : inactiveClass,
          ].join(" ")}
        >
          <Settings className="h-[17px] w-[17px]" />
          <span>Paramètres</span>
        </Link>

        <div className="mt-3 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <UserRound className="h-5 w-5 text-white/80" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">
              Administrateur
            </p>

            <p className="truncate text-[11px] text-white/40">
              Agence Alteract
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
