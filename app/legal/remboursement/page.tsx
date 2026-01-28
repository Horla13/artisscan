export default function RemboursementPage() {
  return (
    <>
      <h1>Conditions Générales de Vente (CGV) – Abonnement</h1>

      <p className="lead">
        Les présentes conditions encadrent l’abonnement au service <strong>ArtisScan</strong> (logiciel SaaS) et précisent
        également notre politique de remboursement. Elles complètent les <a href="/legal/cgu">CGU</a>.
      </p>

      <section>
        <h2>1. Nature du service</h2>
        <p>
          ArtisScan est un <strong>logiciel en ligne (SaaS)</strong> destiné à la numérisation et à l’organisation de
          factures, ainsi qu’à l’export de données comptables. ArtisScan n’est pas un cabinet comptable et ne fournit pas
          de conseil comptable, fiscal ou juridique.
        </p>
      </section>

      <section>
        <h2>2. Abonnement (mensuel / annuel) et reconduction</h2>
        <p>
          L’accès au service repose sur un abonnement <strong>mensuel</strong> ou <strong>annuel</strong>, sauf mention
          contraire lors de la souscription.
        </p>
        <p>
          Sauf résiliation, l’abonnement est <strong>reconduit tacitement</strong> à chaque échéance, pour une période
          équivalente.
        </p>
      </section>

      <section>
        <h2>3. Paiement et facturation (Stripe)</h2>
        <p>
          Les paiements sont traités de manière sécurisée via <strong>Stripe</strong>.
          <br />
          <strong>ArtisScan / VertexLab ne stocke aucune donnée bancaire</strong>. Les informations de paiement sont
          traitées directement par Stripe.
        </p>
      </section>

      <section>
        <h2>4. Résiliation</h2>
        <p>
          Vous pouvez résilier votre abonnement à tout moment depuis votre dashboard. La résiliation empêche le
          renouvellement automatique.
        </p>
        <p>
          <strong>L’accès reste actif jusqu’à la fin de la période payée</strong>. Il n’existe pas de remboursement prorata temporis.
        </p>
      </section>

      <section>
        <h2>5. Essai gratuit de 14 jours</h2>
        <p>
          ArtisScan propose un <strong>essai gratuit de 14 jours</strong> permettant de tester le service avant tout
          paiement. L’essai est destiné à une évaluation réelle du service.
        </p>
        <p>
          En cas d’abus (comptes multiples, automatisation, contournement), ArtisScan se réserve le droit de suspendre
          l’essai ou l’accès au service.
        </p>
      </section>

      <section>
        <h2>6. Aucun remboursement après paiement</h2>
        <p>
          <strong>Principe :</strong> Aucun remboursement n’est accordé après paiement, y compris en cas de non-utilisation
          du service, d’erreur de commande, de résiliation anticipée ou d’insatisfaction, sauf obligation légale
          contraire.
        </p>
      </section>

      <section>
        <h2>7. Contestations et rétrofacturations (chargeback)</h2>
        <p>
          En cas de contestation de paiement ou de rétrofacturation abusive (chargeback), ArtisScan se réserve le droit
          de limiter ou suspendre l’accès au service, dans le respect des obligations légales.
        </p>
      </section>

      <section>
        <h2>8. Clause anti-abus</h2>
        <p>
          Toute tentative de fraude, de rétrofacturation abusive (chargeback) ou de contournement des conditions peut
          entraîner la suspension du compte et la résiliation de l’accès au service, sans remboursement.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Pour toute question : <a href="mailto:contact@artisscan.fr">contact@artisscan.fr</a>.
        </p>
      </section>

      <div className="mt-12 pt-8 border-t border-slate-200 not-prose">
        <p className="text-sm text-slate-500">
          <strong>Dernière mise à jour :</strong> Janvier 2026
        </p>
      </div>
    </>
  );
}


