import { NextResponse } from "next/server";

import { requireAdminOrManager } from "@/lib/auth/access";
import { assertAgencyWritable } from "@/lib/subscriptions/assert-agency-writable";

const DOCUMENT_TYPES = [
  "LEASE",
  "RECEIPT",
  "QUITTANCE",
  "INVOICE",
  "IDENTITY",
  "PROPERTY",
  "MAINTENANCE",
  "OTHER",
] as const;

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function cleanOptional(value: FormDataEntryValue | null) {
  const result = typeof value === "string" ? value.trim() : "";
  return result || null;
}

function safeFilename(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "document";
}

async function validateReference(
  supabase: Awaited<ReturnType<typeof requireAdminOrManager>>["supabase"],
  table: string,
  id: string | null,
  organizationId: string
) {
  if (!id) return true;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function POST(request: Request) {
  try {
    const { supabase, membership, user } = await requireAdminOrManager();
    await assertAgencyWritable(membership.organization_id);

    const formData = await request.formData();

    const title = String(formData.get("title") ?? "").trim();
    const documentType = String(formData.get("document_type") ?? "").trim();
    const file = formData.get("file");

    if (!title || title.length > 180) {
      return NextResponse.json(
        { message: "Le titre du document est obligatoire." },
        { status: 400 }
      );
    }

    if (
      !DOCUMENT_TYPES.includes(
        documentType as (typeof DOCUMENT_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { message: "Le type de document est invalide." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "Sélectionnez un fichier." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Le fichier ne doit pas dépasser 15 Mo." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          message:
            "Format non autorisé. Utilisez PDF, JPG, PNG, WEBP, DOC ou DOCX.",
        },
        { status: 415 }
      );
    }

    const ownerId = cleanOptional(formData.get("owner_id"));
    const tenantId = cleanOptional(formData.get("tenant_id"));
    let propertyId = cleanOptional(formData.get("property_id"));
    const unitId = cleanOptional(formData.get("unit_id"));
    const leaseId = cleanOptional(formData.get("lease_id"));

    const isVisibleToOwner =
      String(formData.get("is_visible_to_owner") ?? "") === "true";
    const isVisibleToTenant =
      String(formData.get("is_visible_to_tenant") ?? "") === "true";

    const organizationId = membership.organization_id;

    const [ownerOk, tenantOk, propertyOk, leaseOk] = await Promise.all([
      validateReference(supabase, "owners", ownerId, organizationId),
      validateReference(supabase, "tenants", tenantId, organizationId),
      validateReference(supabase, "properties", propertyId, organizationId),
      validateReference(supabase, "leases", leaseId, organizationId),
    ]);

    if (!ownerOk || !tenantOk || !propertyOk || !leaseOk) {
      return NextResponse.json(
        { message: "Un rattachement sélectionné n’appartient pas à votre organisation." },
        { status: 400 }
      );
    }

    if (unitId) {
      const { data: unit, error: unitError } = await supabase
        .from("units")
        .select("id, property_id")
        .eq("id", unitId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (unitError || !unit) {
        return NextResponse.json(
          { message: "L’unité sélectionnée est invalide." },
          { status: 400 }
        );
      }

      if (propertyId && propertyId !== unit.property_id) {
        return NextResponse.json(
          { message: "L’unité n’appartient pas au bien sélectionné." },
          { status: 400 }
        );
      }

      propertyId = unit.property_id;
    }

    if (leaseId) {
      const { data: lease, error: leaseError } = await supabase
        .from("leases")
        .select("id, tenant_id, unit_id")
        .eq("id", leaseId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (leaseError || !lease) {
        return NextResponse.json(
          { message: "Le bail sélectionné est invalide." },
          { status: 400 }
        );
      }

      if (tenantId && lease.tenant_id !== tenantId) {
        return NextResponse.json(
          { message: "Le bail n’appartient pas au locataire sélectionné." },
          { status: 400 }
        );
      }

      if (unitId && lease.unit_id !== unitId) {
        return NextResponse.json(
          { message: "Le bail n’appartient pas à l’unité sélectionnée." },
          { status: 400 }
        );
      }
    }

    if (isVisibleToOwner && !ownerId && !propertyId) {
      return NextResponse.json(
        {
          message:
            "Pour rendre le document visible au propriétaire, rattachez-le à un propriétaire ou à un bien.",
        },
        { status: 400 }
      );
    }

    if (isVisibleToTenant && !tenantId && !leaseId) {
      return NextResponse.json(
        {
          message:
            "Pour rendre le document visible au locataire, rattachez-le à un locataire ou à un bail.",
        },
        { status: 400 }
      );
    }

    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase()}`
      : "";

    const storagePath = `${organizationId}/${crypto.randomUUID()}-${safeFilename(
      file.name.replace(extension, "")
    )}${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (storageError) {
      console.error("Erreur upload document:", storageError);

      return NextResponse.json(
        { message: "Le fichier n’a pas pu être enregistré dans le stockage privé." },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase.from("documents").insert({
      organization_id: organizationId,
      owner_id: ownerId,
      tenant_id: tenantId,
      property_id: propertyId,
      unit_id: unitId,
      lease_id: leaseId,
      title,
      document_type: documentType,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      is_visible_to_owner: isVisibleToOwner,
      is_visible_to_tenant: isVisibleToTenant,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Erreur création document:", insertError);

      try {
        const { error: cleanupError } = await supabase.storage
          .from("documents")
          .remove([storagePath]);

        if (cleanupError) {
          console.error("ALERTE : fichier potentiellement orphelin:", {
            organizationId,
            storagePath,
            cleanupError,
          });
        }
      } catch (cleanupException) {
        console.error("ALERTE : nettoyage Storage interrompu:", {
          organizationId,
          storagePath,
          cleanupException,
        });
      }

      return NextResponse.json(
        { message: "Le fichier a été envoyé mais son enregistrement a échoué." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Document ajouté avec succès." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur API documents POST:", error);

    return NextResponse.json(
      { message: "Accès refusé ou erreur serveur." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, membership } = await requireAdminOrManager();
    await assertAgencyWritable(membership.organization_id);

    const url = new URL(request.url);
    const documentId = url.searchParams.get("id")?.trim();

    if (!documentId) {
      return NextResponse.json(
        { message: "Identifiant du document manquant." },
        { status: 400 }
      );
    }

    const { data: document, error } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", documentId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle();

    if (error || !document) {
      return NextResponse.json(
        { message: "Document introuvable." },
        { status: 404 }
      );
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("organization_id", membership.organization_id)
      .select("id");

    if (deleteError || !deletedRows?.length) {
      console.error("Erreur suppression fiche document:", deleteError);

      return NextResponse.json(
        { message: "La fiche du document n'a pas pu être supprimée." },
        { status: 500 }
      );
    }

    try {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.storage_path]);

      if (storageError) {
        console.error("ALERTE : fichier Storage potentiellement orphelin:", {
          organizationId: membership.organization_id,
          documentId,
          storagePath: document.storage_path,
          storageError,
        });

        return NextResponse.json(
          { message: "La fiche a été supprimée, mais le nettoyage du fichier a échoué." },
          { status: 500 }
        );
      }
    } catch (storageException) {
      console.error("ALERTE : suppression Storage interrompue:", {
        organizationId: membership.organization_id,
        documentId,
        storagePath: document.storage_path,
        storageException,
      });

      return NextResponse.json(
        { message: "La fiche a été supprimée, mais le nettoyage du fichier a échoué." },
        { status: 500 }
      );
    }
    return NextResponse.json({ message: "Document supprimé." });
  } catch (error) {
    console.error("Erreur API documents DELETE:", error);

    return NextResponse.json(
      { message: "Accès refusé ou erreur serveur." },
      { status: 500 }
    );
  }
}
