
type SubscriptionCardProps = {
  plan: "free" | "silver" | "gold";
  unitsUsed: number;
  unitsLimit: number | null;
  collaboratorsUsed: number;
  collaboratorsLimit: number | null;
};

function UsageLine({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const percentage =
    limit === null
      ? 0
      : limit > 0
        ? Math.min(100, Math.round((used / limit) * 100))
        : 100;

  const reached = limit !== null && used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">
          {used} / {limit === null ? "Illimité" : limit}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            reached ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {reached && (
        <p className="text-xs font-medium text-amber-700">
          Limite atteinte pour votre abonnement.
        </p>
      )}
    </div>
  );
}

export default function SubscriptionCard({
  plan,
  unitsUsed,
  unitsLimit,
  collaboratorsUsed,
  collaboratorsLimit,
}: SubscriptionCardProps) {
  const planLabel = {
    free: "Free",
    silver: "Silver",
    gold: "Gold",
  }[plan];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Mon abonnement
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Utilisation de votre offre Alteract
          </p>
        </div>

        <span className="rounded-full bg-red-50 px-4 py-1.5 text-sm font-bold text-red-600">
          {planLabel}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <UsageLine
          label="Logements"
          used={unitsUsed}
          limit={unitsLimit}
        />

        <UsageLine
          label="Collaborateurs actifs"
          used={collaboratorsUsed}
          limit={collaboratorsLimit}
        />
      </div>

      {plan !== "gold" && (
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
          Besoin de plus de capacité ? Contactez
          l’administrateur Alteract pour faire évoluer votre offre.
        </p>
      )}
    </section>
  );
}
