"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getRequiredText(
  formData: FormData,
  key: string,
  label: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`${label} est obligatoire.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} est trop long.`);
  }

  return value;
}

function getOptionalText(
  formData: FormData,
  key: string,
  maxLength: number
) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new Error(`Le champ ${key} est trop long.`);
  }

  return value;
}

export async function updateOrganizationAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      "Impossible de vérifier votre accès à l’organisation."
    );
  }

  if (!membership?.organization_id) {
    throw new Error("Aucune organisation active n’a été trouvée.");
  }

  if (membership.role !== "ADMIN_AGENCY") {
    throw new Error(
      "Seul un administrateur d’agence peut modifier ces informations."
    );
  }

  const name = getRequiredText(
    formData,
    "name",
    "Le nom de l’agence",
    120
  );

  const email = getOptionalText(formData, "email", 160);
  const phone = getOptionalText(formData, "phone", 40);
  const address = getOptionalText(formData, "address", 240);
  const city = getOptionalText(formData, "city", 120);
  const country = getOptionalText(formData, "country", 120);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L’adresse e-mail de l’agence n’est pas valide.");
  }

  const { error: updateError } = await supabase
    .from("organizations")
    .update({
      name,
      email,
      phone,
      address,
      city,
      country,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.organization_id);

  if (updateError) {
    throw new Error(
      `Impossible de mettre à jour l’agence : ${updateError.message}`
    );
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
