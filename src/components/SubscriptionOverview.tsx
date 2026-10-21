import { CreditCard, ShieldCheck } from "lucide-react";

const offers = [
  { name: "Silver", limit: "50 logements · 10 collaborateurs", prices: [19500, 37000, 70000] },
  { name: "Gold", limit: "Logements et collaborateurs illimités", prices: [29700, 56500, 107000] },
] as const;
const periods = ["3 mois", "6 mois", "12 mois"] as const;
const formatXof = (value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

export default function SubscriptionOverview() {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="subscription-heading">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <CreditCard className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 id="subscription-heading" className="text-[16px] font-extrabold text-slate-900">Abonnement et facturation</h2>
            <p className="mt-1 text-[12px] text-slate-500">Découvrez les offres de lancement Alteract. La souscription en ligne sera activée après la mise en place des contrôles de paiement.</p>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          {offers.map((offer) => (
            <div key={offer.name} className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-[17px] font-extrabold text-slate-900">{offer.name}</h3>
              <p className="mt-1 text-[12px] text-slate-500">{offer.limit}</p>
              <div className="mt-4 space-y-2">
                {periods.map((period, index) => (
                  <div key={period} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                    <span className="text-slate-600">{period}</span>
                    <strong className="text-slate-900">{formatXof(offer.prices[index])}</strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[12px] leading-5 text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p>Paiement prévu par Orange Money, Wave ou MTN MoMo, avec finalisation sur WhatsApp au +225 05 01 68 81 81. Aucun paiement ni changement d'offre n'est déclenché depuis cet écran de présentation.</p>
        </div>
      </div>
    </section>
  );
}
