import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OrganizationRole =
  | "ADMIN_AGENCY"
  | "MANAGER"
  | "OWNER"
  | "TENANT";

type ActiveMembership = {
  organization_id: string;
  role: OrganizationRole;
  is_active: boolean;
};

export async function requireActiveMembership() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    redirect("/login?access=disabled");
  }

  return {
    supabase,
    user,
    membership: membership as ActiveMembership,
  };
}

export async function requireRoles(
  allowedRoles: OrganizationRole[]
) {
  const access = await requireActiveMembership();

  if (!allowedRoles.includes(access.membership.role)) {
    redirect("/dashboard");
  }

  return access;
}

export async function requireAdminOrManager() {
  return requireRoles([
    "ADMIN_AGENCY",
    "MANAGER",
  ]);
}

export async function requireAdminAgency() {
  return requireRoles([
    "ADMIN_AGENCY",
  ]);
}
