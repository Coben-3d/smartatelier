# Soutenir le projet

Le logiciel reste gratuit et open source, sous licence MIT. Les contributions sont facultatives et ne débloquent aucune fonctionnalité. Elles aident le créateur à consacrer du temps au développement, à la documentation et à ses prochains projets.

L’encart se trouve en bas de l’application. Le bouton « Faire un don via PayPal » ouvre la page de don du créateur dans un nouvel onglet. Aucun paiement, montant, identifiant PayPal ou donnée bancaire n’est traité ou stocké par SmartAtelier. Aucun script PayPal n’est chargé dans l’application.

## Configuration du mainteneur

1. Renseignez votre **lien public de votre page de don PayPal** dans `project.config.json`, champ `paypalUrl`. Ne renseignez jamais de mot de passe, clé ou jeton.
2. Reportez la même URL dans `.github/FUNDING.yml`, sous `custom`, et dans la section Soutien du README.
3. Reconstruisez l’application (`npm run build`) ou relancez `npm run launch`.
4. Vérifiez vous-même la destination et le nom du bénéficiaire avant publication. Le lien fait partie du code distribué ; le modifier nécessite une nouvelle version.

En l’absence de lien, l’encart affiche un bouton désactivé et « Lien de soutien bientôt disponible ». Les autres fonctionnalités restent utilisables. Le code n’accepte que des liens HTTPS sur paypal.me ou paypal.com (avec ou sans www).

Sur GitHub, le bouton de soutien est configuré par [le fichier FUNDING.yml](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository). Activez Sponsorships dans les réglages du dépôt si nécessaire.

Les éventuels abonnements IA sont facturés par leurs fournisseurs et restent indépendants du soutien au créateur.
