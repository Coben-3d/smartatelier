# Installation et connexion

## macOS et Linux

Installez Node.js 24 LTS. Téléchargez le ZIP GitHub, décompressez-le et ouvrez ce dossier dans un terminal. `node --version` doit afficher au moins 22.18.

```sh
npm ci
npm run setup
npm run launch
```

Ouvrez http://127.0.0.1:3210. Le premier lancement compile l’application. Les lancements suivants recompilent aussi pour éviter d’afficher une ancienne version après une mise à jour. Il n’est pas nécessaire d’installer l’app Codex de bureau ou un CLI global : une version de `@openai/codex` est verrouillée dans le projet.

## Connexion ChatGPT

Dans l’app, ouvrez **Connexion & modèles**, puis **Se connecter avec ChatGPT**. Le CLI officiel ouvre le navigateur. Terminez la connexion sur le domaine officiel, puis cliquez **Actualiser la connexion**. SmartAtelier ne demande et ne collecte pas votre mot de passe.

Si le navigateur ne s’ouvre pas, utilisez :

```sh
npm run connect
```

Autre possibilité depuis le terminal : `npm run connect -- --device`. Ce flux exige que l’authentification par appareil soit autorisée pour le compte. Ne partagez jamais le code de connexion. SmartAtelier n’enregistre pas ce code.

Une connexion CLI existante par clé API n’est pas acceptée. Reconnectez-vous avec ChatGPT. Cette connexion est partagée avec vos autres usages de Codex sur cet ordinateur ; SmartAtelier ne modifie pas votre fichier de configuration global et ne lance pas de déconnexion automatique.

Choisissez **Automatique** pour utiliser le modèle compatible recommandé par le compte. Les choix manuels sont enregistrés uniquement dans `data/settings.json`. Si un choix n’existe plus, actualisez le catalogue et repassez sur Automatique. Les variables `CODEX_MODEL` et `CODEX_RECHECK_MODEL`, si vous les définissez explicitement dans l’environnement du serveur, priment sur ces choix.

## Windows

Voie conseillée : WSL2 (Ubuntu), avec le projet et Node installés dans le système de fichiers Linux de WSL. Exécutez les mêmes commandes depuis WSL, puis ouvrez l’adresse locale dans le navigateur Windows. Installez FFmpeg dans WSL, pas uniquement dans Windows.

Le lanceur `Lancer.bat` et l’appel du CLI via Node sont également prévus pour Windows natif, mais ce parcours n’a pas été validé sur une machine Windows. La disponibilité du CLI et de ses fonctions sous Windows dépend de sa version. Ne présentez pas cette voie comme certifiée avant test.

## Photos et vidéos

Pour les vidéos et certains HEIC : FFmpeg **et** FFprobe doivent être dans le PATH. `npm run doctor` vérifie leur présence. Vous pouvez définir `FFMPEG_BIN` et `FFPROBE_BIN` vers des exécutables précis. Privilégiez les sources liées par https://ffmpeg.org/download.html.

## Problèmes courants

- **Port 3210 occupé** : une instance est peut-être déjà ouverte. Ouvrez l’adresse locale ou arrêtez l’autre instance. Ne lancez pas deux serveurs sur les mêmes données.
- **Codex introuvable** : relancez `npm ci`. `CODEX_BIN` permet de pointer vers un autre exécutable natif, si nécessaire.
- **Connexion sans modèle utilisable** : vérifiez les droits du compte. L’offre Free peut exposer l’app de bureau sans le même accès au CLI. L’inventaire manuel reste disponible.
- **Quota dépassé** : attendez la réinitialisation indiquée par Codex. Aucun achat ni changement d’offre ne se fait automatiquement.
- **Analyse interrompue** : les médias restent conservés. Cliquez Réessayer sur le lot, ou relancez la recherche de filament depuis la fiche.
- **HEIC illisible** : exportez la photo en JPEG.
- **Dictée indisponible** : utilisez la dictée du système ou saisissez du texte.

## Mise à jour

Arrêtez SmartAtelier et sauvegardez `data/`. Remplacez uniquement le code par la nouvelle version, conservez `data/`, puis exécutez `npm ci` et `npm run launch`.

## Hébergement

Cette version écoute seulement sur `127.0.0.1`, sans authentification applicative. Elle est destinée à un ordinateur personnel. Ne la publiez pas telle quelle derrière un accès Internet : aucune gestion d’utilisateurs ou isolation de comptes n’est fournie.

## Claude et Gemini (0.3)

Dans **Connexion & modèles**, choisissez votre fournisseur. Le statut n’envoie pas de photo. Utilisez la commande affichée pour terminer sa connexion officielle :

```sh
npm install -g @anthropic-ai/claude-code
npm run connect -- claude
```

Ou pour Gemini :

```sh
npm install -g @google/gemini-cli
npm run connect -- gemini
```

Dans Gemini, choisissez **Login with Google** ; quittez ensuite avec `/quit`. Dans SmartAtelier, actualisez puis cliquez **Utiliser Gemini**. Les identifiants restent gérés par le CLI. Un refus d’offre/client chez Google reste bloquant ; SmartAtelier ne remplace jamais cette connexion par Vertex AI ou une clé API. Une offre web gratuite ou payante ne garantit pas l’accès CLI.

Versions de protocole examinées : Claude Code 2.1.143 et Gemini CLI 0.42.0. Claude doit supporter `--input-format stream-json`, `--json-schema` et `auth status` ; Gemini doit supporter ACP avec images. Sous Windows, WSL2 est recommandé ; les parcours des nouveaux fournisseurs n’ont pas été validés en natif. `CLAUDE_BIN` et `GEMINI_BIN` peuvent désigner un exécutable natif alternatif.

**Aperçu séparé :** `npm run preview`, puis http://127.0.0.1:3212. Données dans `data-preview/`, bannière « Aperçu » visible. Arrêt par Ctrl+C. Le lancement habituel reste sur le port 3210 avec `data/`.

Sources officielles : [Claude CLI](https://code.claude.com/docs/en/cli-reference), [sorties structurées Claude](https://code.claude.com/docs/en/headless), [authentification Gemini](https://geminicli.com/docs/get-started/authentication/), [protocole ACP Gemini](https://geminicli.com/docs/cli/acp-mode/). Documentation consultée le 27 septembre 2026 ; l’accès réel dépend du compte et du serveur du fournisseur.
