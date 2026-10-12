"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CircleUserRound,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  UserRound,
  Users,
  WalletCards,
  Wrench,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type OrganizationRole =
  | "ADMIN_AGENCY"
  | "MANAGER"
  | "OWNER"
  | "TENANT";

type NavItem = {
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  href: string;
  roles: OrganizationRole[];
};

const ALL_ROLES: OrganizationRole[] = [
  "ADMIN_AGENCY",
  "MANAGER",
  "OWNER",
  "TENANT",
];

const ADMIN_AND_MANAGER: OrganizationRole[] = [
  "ADMIN_AGENCY",
  "MANAGER",
];

const navItems: NavItem[] = [
  {
    label: "Tableau de bord",
    icon: LayoutDashboard,
    href: "/dashboard",
    roles: ALL_ROLES,
  },
  {
    label: "Propriétaires",
    icon: CircleUserRound,
    href: "/owners",
    roles: ADMIN_AND_MANAGER,
  },
  {
    label: "Biens",
    icon: Building2,
    href: "/properties",
    roles: ["ADMIN_AGENCY", "MANAGER", "OWNER"],
  },
  {
    label: "Unités",
    icon: Home,
    href: "/units",
    roles: ["ADMIN_AGENCY", "MANAGER", "OWNER"],
  },
  {
    label: "Locataires",
    icon: Users,
    href: "/tenants",
    roles: ADMIN_AND_MANAGER,
  },
  {
    label: "Baux",
    icon: FileText,
    href: "/leases",
    roles: ALL_ROLES,
  },
  {
    label: "Échéances",
    icon: CalendarDays,
    href: "/schedules",
    roles: ALL_ROLES,
  },
  {
    label: "Paiements",
    icon: CreditCard,
    href: "/payments",
    roles: ALL_ROLES,
  },
  {
    label: "Dépenses",
    icon: WalletCards,
    href: "/expenses",
    roles: ["ADMIN_AGENCY", "MANAGER", "OWNER"],
  },
  {
    label: "Maintenance",
    icon: Wrench,
    href: "/maintenance",
    roles: ALL_ROLES,
  },
  {
    label: "Documents",
    icon: ReceiptText,
    href: "/documents",
    roles: ALL_ROLES,
  },
  {
    label: "Rapports",
    icon: BarChart3,
    href: "/reports",
    roles: ["ADMIN_AGENCY", "MANAGER", "OWNER"],
  },
];

function formatRole(role: OrganizationRole | null) {
  switch (role) {
    case "ADMIN_AGENCY":
      return "Administrateur";
    case "MANAGER":
      return "Gestionnaire";
    case "OWNER":
      return "Propriétaire";
    case "TENANT":
      return "Locataire";
    default:
      return "Utilisateur";
  }
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [organizationName, setOrganizationName] =
    useState("Chargement...");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAccess() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !isMounted) {
        return;
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!membership || !isMounted) {
        return;
      }

      const membershipRole =
        membership.role as OrganizationRole;

      setRole(membershipRole);

      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", membership.organization_id)
        .maybeSingle();

      if (organization?.name && isMounted) {
        setOrganizationName(organization.name);
      }
    }

    void loadAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Erreur de déconnexion :", error);
        setIsSigningOut(false);
        return;
      }

      setRole(null);
      setOrganizationName("Chargement...");

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Erreur inattendue pendant la déconnexion :",
        error
      );

      setIsSigningOut(false);
    }
  }

  const visibleNavItems = useMemo(() => {
    if (!role) {
      return [];
    }

    return navItems.filter((item) =>
      item.roles.includes(role)
    );
  }, [role]);

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
        {role ? (
          visibleNavItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

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
          })
        ) : (
          <div className="space-y-2 px-2 py-2">
            <div className="h-9 animate-pulse rounded-xl bg-white/5" />
            <div className="h-9 animate-pulse rounded-xl bg-white/5" />
            <div className="h-9 animate-pulse rounded-xl bg-white/5" />
          </div>
        )}
      </nav>

      <div className="mt-auto">
        {role ? (
          <>
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

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className={[
                baseClass,
                "mt-1 text-white/75 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            >
              <LogOut className="h-[17px] w-[17px]" />

              <span>
                {isSigningOut
                  ? "Déconnexion..."
                  : "Déconnexion"}
              </span>
            </button>
          </>
        ) : null}

        <div className="mt-3 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <UserRound className="h-5 w-5 text-white/80" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">
              {formatRole(role)}
            </p>

            <p className="truncate text-[11px] text-white/40">
              {organizationName}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}