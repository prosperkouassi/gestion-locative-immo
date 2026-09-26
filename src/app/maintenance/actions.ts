"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveMembership } from "@/lib/auth/access";

const ALLOWED_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

type MaintenancePriority =
  (typeof ALLOWED_PRIORITIES)[number];

function getString(
  formData: FormData,
  key: string
) {
  const value = formData.get(key);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function maintenanceUrl(params: {
  success?: string;
  error?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.success) {
    searchParams.set("success", params.success);
  }

  if (params.error) {
    searchParams.set("error", params.error);
  }

  const query = searchParams.toString();

  return query
    ? `/maintenance?${query}`
    : "/maintenance";
}

export async function createMaintenanceRequest(
  formData: FormData
) {
  const { supabase, membership } =
    await requireActiveMembership();

  const canCreate = [
    "ADMIN_AGENCY",
    "MANAGER",
    "TENANT",
  ].includes(membership.role);

  if (!canCreate) {
    redirect(
      maintenanceUrl({
        error:
          "Votre rôle ne permet pas de créer une intervention.",
      })
    );
  }

  const unitId = getString(formData, "unit_id");
  const title = getString(formData, "title");
  const description = getString(
    formData,
    "description"
  );
  const priorityValue = getString(
    formData,
    "priority"
  );

  if (!unitId) {
    redirect(
      maintenanceUrl({
        error: "Veuillez sélectionner un logement.",
      })
    );
  }

  if (title.length < 3) {
    redirect(
      maintenanceUrl({
        error:
          "Le titre doit contenir au moins 3 caractères.",
      })
    );
  }

  if (title.length > 160) {
    redirect(
      maintenanceUrl({
        error:
          "Le titre ne peut pas dépasser 160 caractères.",
      })
    );
  }

  if (description.length > 3000) {
    redirect(
      maintenanceUrl({
        error:
          "La description ne peut pas dépasser 3000 caractères.",
      })
    );
  }

  const priority = ALLOWED_PRIORITIES.includes(
    priorityValue as MaintenancePriority
  )
    ? (priorityValue as MaintenancePriority)
    : "MEDIUM";

  const { data: unit, error: unitError } =
    await supabase
      .from("units")
      .select(
        "id, property_id, organization_id"
      )
      .eq("id", unitId)
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();

  if (
    unitError ||
    !unit ||
    !unit.property_id
  ) {
    redirect(
      maintenanceUrl({
        error:
          "Ce logement n’est pas accessible avec votre compte.",
      })
    );
  }

  const { error: insertError } = await supabase
    .from("maintenance_requests")
    .insert({
      organization_id:
        membership.organization_id,
      property_id: unit.property_id,
      unit_id: unit.id,
      title,
      description:
        description || null,
      priority,
      status: "OPEN",
      currency: "XOF",
    });

  if (insertError) {
    console.error(
      "createMaintenanceRequest:",
      insertError
    );

    redirect(
      maintenanceUrl({
        error:
          "Impossible d’enregistrer la demande de maintenance.",
      })
    );
  }

  revalidatePath("/maintenance");

  redirect(
    maintenanceUrl({
      success:
        "Votre demande de maintenance a été enregistrée.",
    })
  );
}
