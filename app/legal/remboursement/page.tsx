export default function RemboursementPage() {
  return (
    <>
      <h1>Politique de remboursement</h1>

      <p className="lead">
        Cette politique précise les conditions de remboursement applicables au service <strong>ArtisScan</strong>. Elle
        complète les conditions d’abonnement et de facturation.
      </p>

      <section>
        <h2>1. Essai gratuit de 14 jours</h2>
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
        <h2>2. Aucun remboursement après paiement</h2>
        <p>
          <strong>Principe :</strong> Aucun remboursement n’est accordé après paiement, y compris en cas de non-utilisation
          du service, d’erreur de commande, de résiliation anticipée ou d’insatisfaction, sauf obligation légale
          contraire.
        </p>
      </section>

      <section>
        <h2>3. Résiliation à tout moment</h2>
        <p>
          Vous pouvez résilier votre abonnement à tout moment. La résiliation empêche le renouvellement automatique.
          <strong> L’accès reste actif jusqu’à la fin de la période payée</strong>.
        </p>
        <p>Il n’existe pas de remboursement prorata temporis.</p>
      </section>

      <section>
        <h2>4. Paiement via Paddle (Merchant of Record)</h2>
        <p>
          Les paiements et la facturation sont gérés par <strong>Paddle</strong>, agissant en tant que{' '}
          <strong>Merchant of Record</strong> (vendeur officiel). Les éventuelles demandes relatives au paiement, au
          reçu/facture ou aux taxes peuvent être traitées par Paddle conformément à ses politiques.
        </p>
      </section>

      <section>
        <h2>5. Clause anti-abus</h2>
        <p>
          Toute tentative de fraude, de rétrofacturation abusive (chargeback) ou de contournement des conditions peut
          entraîner la suspension du compte et la résiliation de l’accès au service, sans remboursement.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
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


