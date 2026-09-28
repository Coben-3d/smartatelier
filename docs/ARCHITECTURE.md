# Architecture

Next.js sert l’interface React et les routes locales. SQLite (`node:sqlite`) conserve des fiches JSON ; Sharp et FFmpeg préparent les images. Une file de traitement unique limite les analyses concurrentes.

## Accès IA

Le chemin OpenAI est **SmartAtelier local → `@openai/codex-sdk` → Codex local → compte ChatGPT personnel → limites Codex de ce compte**. SDK et CLI sont verrouillés en 0.157.1. Le SDK fournit le transport des tâches ; SmartAtelier ne construit plus de commande `codex exec` et ne parse plus lui-même son flux stdout.

- `lib/codex.ts` conserve le routage fournisseur, la vérification d’une connexion ChatGPT, la sélection d’un modèle compatible, les prompts et les schémas métier.
- `lib/codex-sdk.ts` crée un `Codex`, un nouveau `startThread({ workingDirectory, ... })` par tâche, puis appelle `runStreamed(input, { outputSchema, signal })`. Les images sont des entrées `local_image` dans leur ordre d’origine. Aucun thread n’est repris entre analyses.
- Les événements typés du SDK permettent de refuser une erreur, un tour incomplet, une réponse non JSON ou une recherche fabricant sans événement web terminé. Délai de quatre minutes avec annulation. Les sorties restent soumises aux schémas Zod et à la validation humaine avant intégration au stock. L’analyse photo, les frames vidéo, la revérification, les projets et la recherche filament passent tous par ce point commun.

### Compte et configuration

Le SDK ne fournit pas d’API de connexion ou de catalogue. `lib/connection.ts` conserve donc le protocole stdio officiel app-server : `initialize`, `account/read`, `model/list`, ainsi que `codex login` pour ouvrir la connexion officielle. Il ne transmet au navigateur que le statut, l’offre et les caractéristiques des modèles, jamais l’email, les jetons ou les identifiants du compte. Le catalogue est mis en cache 60 secondes.

Le sous-processus reçoit un environnement filtré sans clés API et `forced_login_method="chatgpt"`, avec le fournisseur intégré `openai`. Ni `apiKey` ni `baseUrl` ne sont fournis au SDK. SmartAtelier ne lit, copie ou stocke aucun fichier d’authentification ChatGPT. Codex conserve la responsabilité de sa connexion et de son renouvellement. Chaque utilisateur utilise son propre compte, sans relais distant, compte partagé, achat automatique ou contournement des limites. Les refus du fournisseur sont remontés sans changement automatique de modèle ou de fournisseur.

### Restrictions et historique

Chaque tâche utilise le sandbox lecture seule et refuse les demandes d’approbation (`approvalPolicy: "never"`). Shell, hooks, notifications externes, apps, plugins, sous-agents, navigateur et outils de génération sont désactivés pour cette exécution. L’accès web est désactivé sauf pour la recherche fabricant. Le moteur officiel `code_mode_host` est activé uniquement pendant cette recherche : les outils web des modèles actuels en ont besoin. Les restrictions shell, MCP, plugins et fichiers restent identiques. Les recommandations comportent des sources, qui restent à vérifier humainement.

Le SDK 0.157.1 ne propose ni `--ignore-user-config` ni `--ephemeral`. Nous ne lui ajoutons pas de lanceur shell détourné : les restrictions sont transmises par ses options officielles. Comme une table MCP vide ne supprime pas les entrées héritées, `config/read` lit les noms des serveurs effectifs pour le dossier de travail, puis le SDK les désactive individuellement. Les valeurs de cette configuration ne sont ni conservées ni exposées. Une configuration illisible annule la tâche. Les réglages globaux de l’utilisateur ne sont pas modifiés ; les exigences administrateur restent applicables.

L’historique `history.jsonl` et la génération de mémoire sont désactivés pour ces tâches, **mais cela ne rend pas les sessions éphémères** : le CLI peut conserver leurs transcriptions dans son dossier local de sessions. Ces fichiers peuvent contenir prompts, réponses et informations sur les médias. Ils restent hors du dépôt et de l’export d’inventaire. Aucune promesse d’absence de traces locales n’est faite.

Références : [SDK officiel](https://learn.chatgpt.com/docs/codex-sdk), [authentification](https://learn.chatgpt.com/docs/auth), [configuration](https://learn.chatgpt.com/docs/config-file/config-reference). Les limites de transport ci-dessus ont été vérifiées dans le paquet SDK installé.

## Données

`data/inventory.sqlite` contient `items`, `batches`, `projects`, `rechecks`, `filament_profiles`. `data/settings.json` contient les choix de modèles. Les originaux sont dans `data/originals/`, les vues dans `data/frames/`, les gros plans dans `data/rechecks/`, les prompts et résultats dans `data/runs/`.

`INVENTORY_DATA_DIR` permet de choisir un dossier de données absolu. Ne partagez pas ce dossier entre deux processus serveurs. Les sauvegardes doivent inclure le dossier entier, serveur arrêté. L’export JSON est un instantané lisible, pas une archive restaurable avec médias.

Les cadres sont `{x,y,w,h}` normalisés 0–1, relatifs à la vue entière après orientation EXIF. Les observations relient composant → frame → photo ou vidéo/timestamp.

## Faire lire son inventaire à un assistant

- App ouverte : télécharger **Exporter le stock**, ou lire `http://127.0.0.1:3210/api/export` depuis le même ordinateur.
- Terminal : `npm run export` crée `data/inventory-export.json`.
- Donner volontairement cet export à l’assistant choisi ; il peut contenir noms, notes, emplacements et chemins locaux. Les photos n’y sont pas incluses.

Exemple : « Lis cet export SmartAtelier, propose un projet avec mon stock et signale les pièces manquantes. Ne modifie pas les quantités. »

L’export peut être lu par tout assistant capable de lire un JSON. Les connecteurs intégrés sont décrits ci-dessous ; aucun autre fournisseur n’est appelé automatiquement.

## Routage multi-assistant (0.3)

`data/settings.json` conserve `provider` (codex/claude/gemini) et les modèles propres à chacun. Les anciens réglages sans fournisseur restent des réglages Codex. `structured()` route vers le fournisseur actif sans basculement automatique. Photos et frames vidéo suivent le même pipeline de préparation, de déduplication proposée et de validation humaine.

`lib/providers.ts` pilote Claude Code via son CLI officiel en mode print : contenu multimodal base64, schéma JSON, résultat `structured_output`. Aucun accès shell, fichier, MCP ou hook. La recherche fabricant autorise seulement WebSearch/WebFetch et exige un résultat de recherche confirmé. La connexion doit être `claude.ai`, pas une clé API.

`lib/gemini.ts` utilise le protocole ACP officiel : initialize → session/new → session/prompt, images inline base64. Cela évite que du texte d’inventaire contenant `@chemin` soit interprété comme une demande de lecture locale. `session/set_model` sélectionne un modèle du catalogue annoncé. Le serveur est limité à aucun outil (analyse/projet) ou aux deux outils web (fabricant). MCP, extensions et hooks sont désactivés pour cette exécution ; toute demande de permission au client ACP est refusée. Les règles système existantes restent applicables. L’authentification Google est imposée ; le CLI lit ses identifiants lui-même. Seul le type de connexion est lu dans ses réglages par SmartAtelier.

Gemini ne fournit pas ici une contrainte de schéma native : le schéma est inclus dans la consigne, puis le résultat est parsé et validé par les mêmes schémas Zod et vérifications de références que les autres fournisseurs. Réponse invalide = erreur, aucune intégration au stock. La qualité du JSON et la précision de vision des nouveaux fournisseurs doivent encore être mesurées sur des comptes fonctionnels. Les tokens, emails et identifiants de comptes ne sont pas renvoyés par les routes de connexion.
