
"use client";

import { useEffect, useState } from "react";

type OrganizationUser = {
  id: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

type UsersPanelProps = {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
};

const roleLabels: Record<string, string> = {
  ADMIN_AGENCY: "Administrateur d'agence",
  MANAGER: "Gestionnaire",
  OWNER: "Propriétaire",
  TENANT: "Locataire",
};

export function UsersPanel({
  organizationId,
  organizationName,
  onClose,
}: UsersPanelProps) {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setLoading(true);
      setError("");
      setUsers([]);

      try {
        const response = await fetch(
  `/api/alteract-admin/users?organization_id=${encodeURIComponent(
    organizationId
  )}`,
  {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Impossible de charger les utilisateurs."
          );
        }

        const result: { users?: OrganizationUser[] } =
          await response.json();

        if (!Array.isArray(result.users)) {
          throw new Error(
            "Réponse invalide du serveur."
          );
        }

        if (!controller.signal.aborted) {
  setUsers(result.users);
}
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      controller.abort();
    };
  }, [organizationId]);

  const activeUsers = users.filter(
    (user) => user.is_active
  ).length;

  const inactiveUsers = users.length - activeUsers;

  return (
    <section
      style={{
        marginTop: 24,
        padding: 24,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        color: "#172338",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            Utilisateurs de l'organisation
          </h2>

          <p
            style={{
              marginTop: 8,
              color: "#667085",
            }}
          >
            {organizationName}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 16px",
            border: "1px solid #d0d5dd",
            background: "#ffffff",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </header>

      {loading && (
        <p role="status">
          Chargement des utilisateurs...
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{ color: "#b91c1c" }}
        >
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {[
              ["Total utilisateurs", users.length],
              ["Actifs", activeUsers],
              ["Inactifs", inactiveUsers],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                style={{
                  minWidth: 150,
                  padding: 18,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#f9fafb",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: 26,
                  }}
                >
                  {value}
                </strong>

                <span
                  style={{
                    color: "#667085",
                    fontSize: 13,
                  }}
                >
                  {label}
                </span>
              </article>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Utilisateur",
                    "Rôle",
                    "Statut",
                    "Date d'ajout",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      style={{
                        padding: 12,
                        borderBottom:
                          "1px solid #e5e7eb",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td
                      style={{
                        padding: 12,
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      <code>
                        {user.user_id.slice(0, 8)}…
                      </code>
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      {roleLabels[user.role] ??
                        user.role}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      <span
                        style={{
                          color: user.is_active
                            ? "#166534"
                            : "#b91c1c",
                          fontWeight: 600,
                        }}
                      >
                        {user.is_active
                          ? "Actif"
                          : "Inactif"}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: 12,
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      {new Date(
                        user.created_at
                      ).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <p style={{ color: "#667085" }}>
              Aucun utilisateur trouvé pour cette
              organisation.
            </p>
          )}

          <p
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#667085",
            }}
          >
            Consultation uniquement. La modification
            des rôles et l'activation des comptes
            seront disponibles après validation
            des contrôles de sécurité.
          </p>
        </>
      )}
    </section>
  );
}
