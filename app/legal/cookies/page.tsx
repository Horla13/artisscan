export default function CookiesPage() {
  return (
    <>
      <h1>Politique de cookies</h1>

      <p className="lead">
        Cette politique explique comment <strong>ArtisScan</strong> utilise des cookies et technologies similaires sur le
        site et l’application web, conformément à la réglementation applicable (RGPD et directives CNIL).
      </p>

      <section>
        <h2>1. Qu’est-ce qu’un cookie ?</h2>
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, mobile) lors de la consultation
          d’un site ou de l’utilisation d’un service en ligne. Il permet, par exemple, de mémoriser une session, des
          préférences, ou de contribuer à la sécurité.
        </p>
      </section>

      <section>
        <h2>2. Cookies utilisés par ArtisScan</h2>
        <p>ArtisScan utilise des cookies appartenant aux catégories suivantes :</p>

        <h3>2.1. Cookies essentiels (obligatoires)</h3>
        <p>
          Ces cookies sont nécessaires au fonctionnement du service (authentification, maintien de session, sécurité,
          prévention de la fraude, équilibrage technique). Sans eux, le service ne peut pas fonctionner correctement.
        </p>

        <h3>2.2. Cookies de sécurité et performance</h3>
        <p>
          Nous pouvons utiliser des traceurs strictement nécessaires à la sécurité (détection d’abus, protection contre
          les attaques) et à l’amélioration des performances (diagnostic de pannes, stabilité).
        </p>

        <h3>2.3. Cookies de mesure d’audience (analytics)</h3>
        <p>
          ArtisScan peut utiliser des outils de mesure d’audience afin de mieux comprendre l’usage du service et
          d’améliorer l’expérience utilisateur. Lorsque ces cookies ne sont pas strictement nécessaires, ils ne sont
          déposés qu’après recueil de votre consentement, conformément à la réglementation.
        </p>
      </section>

      <section>
        <h2>3. Gestion de votre consentement</h2>
        <p>
          Vous pouvez accepter ou refuser les cookies non essentiels à tout moment, notamment via les paramètres de
          votre navigateur ou via les mécanismes de consentement lorsqu’ils sont proposés. Le refus des cookies non
          essentiels n’empêche pas l’utilisation du service.
        </p>
      </section>

      <section>
        <h2>4. Durée de conservation</h2>
        <p>
          Les cookies ont une durée de conservation limitée, proportionnée à leur finalité. Les cookies essentiels
          peuvent être des cookies de session (supprimés à la fermeture du navigateur) ou persistants, selon les besoins
          de sécurité et d’authentification.
        </p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>
          Pour toute question relative aux cookies : <a href="mailto:contact@artisscan.fr">contact@artisscan.fr</a>.
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


