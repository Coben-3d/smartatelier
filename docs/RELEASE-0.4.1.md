# SmartAtelier 0.4.1 — SDK Codex officiel

Les analyses OpenAI passent maintenant par `@openai/codex-sdk`, qui pilote Codex local avec votre propre connexion ChatGPT. Les images, frames vidéo, gros plans de revérification, projets et recherches fabricant gardent leur validation commune avant ajout au stock.

- Aucun identifiant ChatGPT copié dans SmartAtelier, aucune clé API ou bascule payante automatique. Les limites de votre compte s’appliquent.
- Moteur d’outils web activé uniquement pour les recherches fabricant ; shell, MCP personnels, hooks et plugins désactivés pendant les analyses.
- SDK et CLI verrouillés en 0.157.1. Connexion guidée et catalogue des modèles conservés.
- Documentation détaillée des connexions, quotas et transcriptions locales que Codex peut conserver.

Mise à jour : téléchargez les sources, gardez votre dossier de données, puis lancez `npm ci` et `npm run launch`. N’exécutez pas deux serveurs sur le même dossier de données.

Validation : 32 tests locaux et compilation de production réussis sur macOS ; essais réels photo, projet et recherche web avec un compte ChatGPT Pro. Les autres systèmes et offres restent à valider. Le workflow GitHub est fourni, mais ses jobs distants n’ont pas pu démarrer lors des publications précédentes. Claude et Gemini restent expérimentaux ; voir [les validations détaillées](https://github.com/Coben-3d/smartatelier/blob/main/docs/VALIDATION.md).

L’archive source ne contient aucun inventaire, média personnel ni identifiant. Logiciel gratuit sous licence MIT, soutien PayPal facultatif.
