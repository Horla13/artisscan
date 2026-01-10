export default function FacturationPage() {
  return (
    <>
      <h1>Conditions de facturation et d’abonnement (Paddle)</h1>

      <p className="lead">
        Les présentes conditions décrivent le fonctionnement des abonnements ArtisScan et de la facturation opérée via{' '}
        <strong>Paddle</strong> en tant que <strong>Merchant of Record</strong> (vendeur officiel).
      </p>

      <section>
        <h2>1. Merchant of Record (Paddle)</h2>
        <p>
          Les paiements, la facturation et la collecte des taxes applicables sont assurés par <strong>Paddle</strong>,
          qui agit en tant que vendeur officiel (Merchant of Record). Cela signifie que :
        </p>
        <ul>
          <li>Votre contrat de vente pour l’abonnement est conclu avec Paddle pour l’aspect paiement/facturation.</li>
          <li>Paddle peut émettre les reçus/factures et gérer les taxes (ex : TVA) selon la réglementation.</li>
          <li>
            ArtisScan (VertexLab) demeure le fournisseur du service logiciel et gère l’accès au produit, le support et
            les fonctionnalités.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Formules et renouvellement</h2>
        <p>ArtisScan propose des abonnements :</p>
        <ul>
          <li><strong>Mensuel</strong></li>
          <li><strong>Annuel</strong></li>
        </ul>
        <p>
          Sauf résiliation avant l’échéance, l’abonnement peut se <strong>renouveler automatiquement</strong> à la fin de
          chaque période (mensuelle/annuelle), selon les conditions de paiement appliquées par Paddle.
        </p>
      </section>

      <section>
        <h2>3. Essai gratuit de 14 jours</h2>
        <p>
          Un <strong>essai gratuit de 14 jours</strong> peut être proposé. À l’issue de l’essai, l’abonnement peut être
          activé selon le parcours d’achat et les conditions Paddle, sauf résiliation préalable.
        </p>
      </section>

      <section>
        <h2>4. Résiliation</h2>
        <p>
          Vous pouvez résilier à tout moment. La résiliation empêche le renouvellement automatique.
          <strong> L’accès reste disponible jusqu’à la fin de la période payée</strong>.
        </p>
      </section>

      <section>
        <h2>5. Absence de remboursement</h2>
        <p>
          <strong>Aucun remboursement après paiement</strong> n’est accordé, sauf obligation légale contraire. Pour le
          détail : <a href="/legal/remboursement">Politique de remboursement</a>.
        </p>
      </section>

      <section>
        <h2>6. Factures, taxes et informations de paiement</h2>
        <p>
          Les factures/reçus, taxes et informations de paiement sont gérés par Paddle. Il peut être nécessaire de
          fournir des informations de facturation (ex : identité, adresse, numéro de TVA intracommunautaire le cas
          échéant) afin d’établir les documents de facturation et calculer les taxes applicables.
        </p>
      </section>

      <section>
        <h2>7. Sécurité et lutte contre la fraude</h2>
        <p>
          Paddle et ArtisScan peuvent mettre en œuvre des mesures de prévention de la fraude et de sécurisation des
          paiements. Toute fraude ou tentative de rétrofacturation abusive peut entraîner la suspension ou la
          résiliation de l’accès au service, sans remboursement.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Pour le support lié au service ArtisScan : <a href="mailto:contact@artisscan.fr">contact@artisscan.fr</a>.
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


