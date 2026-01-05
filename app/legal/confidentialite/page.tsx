export default function Confidentialite() {
  return (
    <>
      <h1>Politique de Confidentialité</h1>
      
      <p className="lead">
        ArtisScan s'engage à protéger la confidentialité de vos données personnelles. 
        Cette politique vous informe sur la manière dont nous collectons, utilisons et protégeons vos informations, 
        conformément au Règlement Général sur la Protection des Données (RGPD).
      </p>

      <section>
        <h2>1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données personnelles est :<br />
          <strong>[Votre Nom et Prénom]</strong>, Entrepreneur Individuel<br />
          Email : <a href="mailto:contact@artisscan.fr">contact@artisscan.fr</a>
        </p>
      </section>

      <section>
        <h2>2. Données collectées</h2>
        <p>Dans le cadre de l'utilisation du service ArtisScan, nous collectons les données suivantes :</p>
        <ul>
          <li><strong>Données d'identification :</strong> Nom, prénom, adresse email</li>
          <li><strong>Données de facturation :</strong> Informations de paiement (traitées de manière sécurisée par Stripe)</li>
          <li><strong>Données professionnelles :</strong> Nom de l'entreprise, données de factures numérisées (fournisseurs, montants, dates)</li>
          <li><strong>Données de connexion :</strong> Adresse IP, logs de connexion, données de navigation</li>
        </ul>
      </section>

      <section>
        <h2>3. Finalités du traitement</h2>
        <p>Vos données personnelles sont collectées et traitées pour les finalités suivantes :</p>
        <ul>
          <li>Création et gestion de votre compte utilisateur</li>
          <li>Fourniture du service de numérisation et de gestion de factures</li>
          <li>Traitement des paiements et gestion de l'abonnement</li>
          <li>Envoi d'emails liés au service (confirmations, notifications, support)</li>
          <li>Amélioration du service et support client</li>
          <li>Respect de nos obligations légales et réglementaires</li>
        </ul>
      </section>

      <section>
        <h2>4. Base légale du traitement</h2>
        <p>Le traitement de vos données personnelles repose sur :</p>
        <ul>
          <li><strong>L'exécution du contrat :</strong> Fourniture du service ArtisScan</li>
          <li><strong>Votre consentement :</strong> Pour l'envoi de communications marketing (si applicable)</li>
          <li><strong>Nos obligations légales :</strong> Facturation, archivage comptable</li>
          <li><strong>Notre intérêt légitime :</strong> Amélioration du service, prévention de la fraude</li>
        </ul>
      </section>

      <section>
        <h2>5. Destinataires des données</h2>
        <p>Vos données personnelles sont traitées par :</p>
        <ul>
          <li><strong>ArtisScan :</strong> Accès limité aux données nécessaires à la fourniture du service</li>
          <li><strong>Supabase :</strong> Hébergement sécurisé de la base de données</li>
          <li><strong>Stripe :</strong> Traitement sécurisé des paiements (soumis à ses propres conditions)</li>
          <li><strong>Resend / Google Workspace :</strong> Envoi d'emails transactionnels</li>
          <li><strong>Vercel :</strong> Hébergement de l'application web</li>
        </ul>
        <p>
          <strong>Nous ne vendons, ne louons ni ne partageons vos données personnelles avec des tiers à des fins commerciales.</strong>
        </p>
      </section>

      <section>
        <h2>6. Durée de conservation</h2>
        <p>Vos données personnelles sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles sont traitées :</p>
        <ul>
          <li><strong>Données de compte :</strong> Pendant toute la durée de votre abonnement + 3 ans après résiliation</li>
          <li><strong>Données de facturation :</strong> 10 ans (obligations comptables et fiscales)</li>
          <li><strong>Logs de connexion :</strong> 12 mois maximum</li>
        </ul>
        <p>À l'issue de ces délais, vos données sont supprimées ou anonymisées.</p>
      </section>

      <section>
        <h2>7. Sécurité des données</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données personnelles 
          contre la destruction accidentelle ou illicite, la perte, l'altération, la divulgation ou l'accès non autorisé.
        </p>
        <ul>
          <li>Chiffrement des données en transit (HTTPS/TLS)</li>
          <li>Authentification sécurisée (Supabase Auth)</li>
          <li>Hébergement sur des serveurs sécurisés (Vercel, Supabase)</li>
          <li>Accès limité aux données (politique du moindre privilège)</li>
        </ul>
      </section>

      <section>
        <h2>8. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :</p>
        <ul>
          <li><strong>Droit d'accès :</strong> Obtenir la confirmation que vos données sont traitées et accéder à celles-ci</li>
          <li><strong>Droit de rectification :</strong> Faire corriger des données inexactes ou incomplètes</li>
          <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données (« droit à l'oubli »)</li>
          <li><strong>Droit à la limitation :</strong> Demander la limitation du traitement de vos données</li>
          <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré et lisible</li>
          <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données pour des motifs légitimes</li>
          <li><strong>Droit de retirer votre consentement :</strong> À tout moment, sans affecter la licéité du traitement antérieur</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à l'adresse : <a href="mailto:contact@artisscan.fr"><strong>contact@artisscan.fr</strong></a>
        </p>
        <p>
          Vous disposez également du droit d'introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) : 
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          ArtisScan utilise des cookies strictement nécessaires au fonctionnement du service :
        </p>
        <ul>
          <li><strong>Cookies d'authentification :</strong> Pour maintenir votre session active</li>
          <li><strong>Cookies de préférences :</strong> Pour mémoriser vos choix (langue, paramètres d'affichage)</li>
        </ul>
        <p>
          Nous n'utilisons pas de cookies publicitaires ou de suivi à des fins marketing.
        </p>
      </section>

      <section>
        <h2>10. Transferts de données hors UE</h2>
        <p>
          Certains de nos prestataires techniques (Vercel, Supabase, Stripe) peuvent être situés en dehors de l'Union Européenne. 
          Dans ce cas, nous nous assurons que des garanties appropriées sont en place, conformément au RGPD (clauses contractuelles types, Privacy Shield, etc.).
        </p>
      </section>

      <section>
        <h2>11. Modifications de la politique</h2>
        <p>
          Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
          Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour.
        </p>
        <p>
          Nous vous encourageons à consulter régulièrement cette page pour rester informé de la manière dont nous protégeons vos données.
        </p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>
          Pour toute question concernant cette politique de confidentialité ou l'utilisation de vos données personnelles, 
          vous pouvez nous contacter à :
        </p>
        <p>
          <strong>Email :</strong> <a href="mailto:contact@artisscan.fr">contact@artisscan.fr</a>
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

