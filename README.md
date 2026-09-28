# SmartAtelier

![SmartAtelier — Moins chercher. Plus fabriquer.](docs/assets/cover.svg)

**Photographiez votre atelier. Retrouvez ce que vous avez. Fabriquez avec.**

Un inventaire local, en français, pour les composants électroniques et les bobines de filament 3D. Importez des photos ou des vidéos, corrigez les propositions de l’IA, puis retrouvez chaque objet dans son image d’origine.

> Version 0.4.1 bêta. Logiciel gratuit et open source (MIT). Choisissez ChatGPT (Codex), Claude (Claude Code) ou Gemini (Gemini CLI). Le stockage est local ; l’analyse utilise Internet et votre compte chez le fournisseur choisi. Projet indépendant de ces fournisseurs.

## Quelle IA est utilisée, et quels quotas sont consommés ?

**SmartAtelier utilise les outils officiels ci-dessous pour automatiser les demandes. Il ne pilote pas une conversation dans les sites ChatGPT, Claude ou Gemini.** « CLI » signifie simplement un programme installé sur votre ordinateur auquel l’application peut envoyer du texte et des images.

| Choix dans SmartAtelier | Outil réellement lancé | Connexion nécessaire | Usage décompté |
| --- | --- | --- | --- |
| **ChatGPT / OpenAI** | **SDK Codex officiel → Codex local** (inclus avec le projet) | Compte ChatGPT autorisé à utiliser Codex | Limites d’usage Codex de votre compte, partagées avec vos autres usages Codex ; ce n’est pas une conversation classique sur chatgpt.com. |
| **Claude** | **Claude Code** (à installer) | Compte Claude avec accès à Claude Code, notamment Pro/Max | Usage Claude Code ; sur Pro/Max, les limites sont **partagées avec vos conversations Claude**. |
| **Gemini** | **Gemini CLI** (à installer) | **Login with Google**, compte éligible | Quotas Gemini CLI / Gemini Code Assist associés au compte ; ne pas les confondre avec les limites de l’application Gemini. |

Sources : [SDK Codex officiel](https://learn.chatgpt.com/docs/codex-sdk), [connexion Codex](https://learn.chatgpt.com/docs/auth), [usage Codex](https://learn.chatgpt.com/docs/pricing), [limites Claude et Claude Code](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan), [quotas Gemini CLI](https://geminicli.com/docs/resources/quota-and-pricing/). Vérification : 28 septembre 2026.

**Chaque analyse photo/vidéo, revérification, préparation de projet ou recherche fabricant consomme l’usage du fournisseur choisi.** Une vidéo contient plusieurs vues ; une recherche peut nécessiter plusieurs échanges. Il n’y a pas de quota IA supplémentaire offert par SmartAtelier. La recherche des réglages d’une bobine peut aussi démarrer automatiquement après l’enregistrement de ses caractéristiques.

Le logiciel est gratuit et ne demande aucune clé API. Cela ne rend pas les services IA gratuits ou illimités : accès, abonnements, quotas et éventuels crédits supplémentaires restent ceux de votre fournisseur. SmartAtelier n’achète aucun crédit, ne change pas votre offre et ne bascule pas vers une API payante. Des crédits ou options de dépassement déjà activés sur votre compte peuvent toutefois s’appliquer selon ses règles.

Pour OpenAI, le serveur local utilise `@openai/codex-sdk`. Ce SDK lance lui-même Codex en sous-processus et réutilise la connexion ChatGPT personnelle gérée par Codex. Chaque utilisateur utilise son propre compte et ses propres limites ; SmartAtelier ne collecte aucun identifiant et ne fournit pas de relais IA distant. [Architecture détaillée](docs/ARCHITECTURE.md).

Gemini ne passe pas par Codex, et Claude non plus. Pour comprendre le fonctionnement, les actions locales et le suivi de consommation, consultez [IA, connexions et quotas](docs/IA-ET-QUOTAS.md). Les connecteurs Claude/Gemini restent expérimentaux dans cette bêta ; voir [les essais réellement effectués](docs/VALIDATION.md).

## Soutenir mon travail

**Le projet reste gratuit.** Si SmartAtelier vous rend service, vous pouvez soutenir mon travail et m’aider à créer mes prochains projets. Merci pour chaque coup de pouce !

[❤️ Faire un don via PayPal](https://www.paypal.com/donate/?hosted_button_id=S2MTT95UDGFZ2) Le soutien est entièrement facultatif : toutes les fonctionnalités restent accessibles sans contribution. Vous pouvez aussi aider en signalant un problème, en améliorant la documentation ou en partageant le projet.

Les éventuels abonnements aux assistants IA restent indépendants du logiciel et de ce soutien.

## Démarrage rapide

1. Installez **Node.js 24 LTS** depuis [nodejs.org](https://nodejs.org/) (minimum 22.18).
2. Téléchargez le code du dépôt avec **Code → Download ZIP**, ou l’archive source d’une release. Décompressez-la puis ouvrez un terminal dans le dossier contenant `package.json`.
3. Exécutez :

```sh
npm ci
npm run setup
npm run launch
```

4. Ouvrez **http://127.0.0.1:3210**. Gardez le terminal ouvert. Pour arrêter : **Ctrl+C**.

L’assistant propose la connexion officielle ChatGPT. Vous pouvez aussi utiliser **Connexion & modèles → Se connecter avec ChatGPT** dans l’application, ou `npm run connect`. Aucun mot de passe ni clé API n’est saisi dans SmartAtelier. Si vous utilisez déjà Codex avec ChatGPT, votre connexion peut être reconnue directement. L’application Codex de bureau n’est pas nécessaire : le CLI est installé avec les dépendances du projet.

**Sans IA :** sautez la connexion et ajoutez les articles manuellement. Votre inventaire reste utilisable.

**Vidéos :** installez [FFmpeg et FFprobe](https://ffmpeg.org/download.html). Sous macOS avec Homebrew : `brew install ffmpeg`. Sous Debian/Ubuntu/WSL : `sudo apt install ffmpeg`. Les photos JPG/PNG ne nécessitent pas FFmpeg. Le support HEIC dépend des codecs disponibles.

Les lanceurs `Lancer.command` (macOS) et `Lancer.bat` (Windows) installent les dépendances si besoin puis démarrent l’application. La voie recommandée sous Windows pour l’IA reste **WSL2** ; voir [Installation](docs/INSTALLATION.md). Les parcours macOS ont été testés ; les autres plateformes demandent encore des retours utilisateurs.

## Ce que l’application fait

- Photos et vidéos : identification, quantités estimées, cadres et déduplication entre vues ; **validation humaine avant ajout au stock**.
- Inventaire : aperçus recadrés, recherche, filtres, quantités +/−, emplacement, notes et modifications manuelles.
- Revérification ciblée d’un module depuis des gros plans, avec indices, alternatives et incertitudes.
- Filaments : ajout par photo, comptage estimé, cadres par bobine, palette de couleurs modifiable, marque, gamme, polymère, diamètre, poids nominal et restant. Le polymère est lu sur l’étiquette ou renseigné ; le poids restant n’est jamais estimé par photo.
- Réglages de filament : recherche de fiches fabricant après enregistrement, sources et conditions affichées ; pas de réglages applicables pour une référence ambiguë.
- Projets : décrire une idée et comparer les besoins à son stock. « Montre-moi quoi prendre » retrouve les objets dans les photos ou frames.

Il n’y a pas de compte SmartAtelier, de cloud de stockage, de partage entre utilisateurs ni d’achat automatique.

## Choisir son assistant

Ouvrez **Connexion & modèles** : sélectionnez ChatGPT, Claude ou Gemini, suivez la connexion, puis cliquez **Utiliser…**. Chaque fournisseur conserve ses propres modèles d’analyse et de revérification. Le changement concerne les prochaines opérations ; terminez les analyses en cours avant de changer.

| Assistant | Connexion | Installation |
| --- | --- | --- |
| ChatGPT | `npm run connect -- codex` | Inclus dans `npm ci` |
| Claude | `npm run connect -- claude` | `npm install -g @anthropic-ai/claude-code` |
| Gemini | `npm run connect -- gemini`, puis **Login with Google** et `/quit` | `npm install -g @google/gemini-cli` |

Le compte doit autoriser **le CLI**, pas uniquement l’application de discussion. SmartAtelier n’achète rien et n’utilise pas de clé API comme solution de secours. Claude propose les familles Sonnet / Opus / Haiku ; leur disponibilité est décidée par Claude Code. Les catalogues Codex et Gemini sont lus auprès des CLI. Choisissez Automatique en cas de doute.

**État réel de cette version :** ChatGPT testé avec un compte Pro. Claude : compte Pro détecté, mais l’essai image réel est refusé avec une session OAuth invalide (401) ; reconnexion nécessaire. Gemini : protocole image testé automatiquement ; le compte utilisé pour l’essai a reçu un refus Google `UNSUPPORTED_CLIENT`. Son analyse réelle n’est donc pas validée. Voir [les limites vérifiées](docs/VALIDATION.md).

## Aperçu dans le navigateur

```sh
npm run preview
```

Ouvrez **http://127.0.0.1:3212**. Le terminal doit rester ouvert. Les modifications du code apparaissent automatiquement. Cet aperçu utilise **`data-preview/`**, un inventaire séparé de `data/`. Il est vide à la première installation. Les connexions aux fournisseurs restent celles des CLI de cet ordinateur. Rien n’est publié en ligne.

## Free, Plus ou Pro ?

L’application ne choisit pas arbitrairement un modèle d’après le nom de votre abonnement. Elle lit le type de compte et le catalogue fourni par Codex, puis utilise son modèle par défaut compatible avec les images. Dans **Connexion & modèles**, vous pouvez choisir un autre modèle proposé pour l’analyse et la revérification. L’effort de raisonnement est également adapté aux valeurs annoncées par le modèle.

| Compte | Comportement |
| --- | --- |
| Sans connexion | Inventaire manuel, consultation, corrections et export |
| ChatGPT Free / Go | Connexion proposée ; l’accès IA dépend des droits effectifs du CLI. La gratuité de l’accès dans l’app ChatGPT ne garantit pas cet accès CLI. |
| ChatGPT Plus / Pro | Utilisation du CLI avec les modèles et quotas autorisés par le compte |
| Compte géré par une organisation | Dépend aussi des règles de l’administrateur |

Les catalogues, déploiements et quotas changent. **Pas de garantie « gratuit et illimité »**, pas de contournement des limites et pas de relais automatique vers une API payante. Un modèle proposé peut encore être refusé lors de l’exécution ; le fournisseur reste l’autorité. En cas de quota épuisé, attendez son renouvellement et relancez votre lot. [Offres officielles](https://learn.chatgpt.com/docs/pricing), [authentification](https://learn.chatgpt.com/docs/auth), [catalogue des modèles](https://learn.chatgpt.com/docs/app-server#list-models-modellist). Vérification documentaire : 27 septembre 2026.

## Vos données

Tout le stock, les originaux, les frames et les résultats sont dans **`data/`**, créé au premier lancement et exclu de Git. Les identifiants restent gérés par le CLI officiel ; aucun fichier de connexion n’est copié dans le projet.

Les vues sélectionnées sont transmises au fournisseur choisi (OpenAI, Anthropic ou Google) pour identification. Les projets transmettent les fiches nécessaires, et la recherche fabricant transmet les caractéristiques du filament. Les règles de confidentialité de votre fournisseur s’appliquent. La dictée du navigateur peut utiliser le service vocal de ce navigateur ; elle n’est pas un enregistrement audio conservé par SmartAtelier.

**Sauvegarde :** arrêtez l’application et copiez tout `data/`. L’export JSON ne contient pas les fichiers médias. Une seule instance doit écrire dans un même dossier de données. Le déplacement sur un autre ordinateur nécessite actuellement d’adapter les chemins absolus des médias ; l’import de sauvegarde portable n’est pas encore fourni.

## Guides

- [IA, connexions et quotas](docs/IA-ET-QUOTAS.md)
- [Questions fréquentes : CMS, tiroirs et limites](docs/FAQ.md)
- [Soutien facultatif](docs/SOUTIEN.md)
- [Installation et connexion](docs/INSTALLATION.md)
- [Utilisation, photos, vidéos et filaments](docs/UTILISATION.md)
- [Architecture et accès à l’inventaire](docs/ARCHITECTURE.md)
- [Tests et limites connues](docs/VALIDATION.md)
- [Préparer une publication GitHub](docs/PUBLICATION.md)
- [Contribuer](CONTRIBUTING.md) · [Sécurité](SECURITY.md) · [Historique](CHANGELOG.md)

## Développement

```sh
npm ci
npm test
npm run build
npm run dev
```

Diagnostic : `npm run doctor`. Export : `npm run export`. Vérification des fichiers distribuables : `npm run release:check`. Paquet sans données personnelles : `npm run release:pack`.

Next.js, React, TypeScript, SQLite intégré à Node.js et Sharp. FFmpeg pour les vidéos. Licence [MIT](LICENSE).
