# Architecture

Next.js sert l’interface React et les routes locales. SQLite (`node:sqlite`) conserve des fiches JSON ; Sharp et FFmpeg préparent les images. Une file de traitement unique limite les analyses concurrentes.

## Accès IA

`lib/connection.ts` appelle le protocole stdio officiel de Codex : `initialize`, `account/read`, `model/list`. Il transmet au navigateur uniquement le statut, le type d’offre et les caractéristiques des modèles ; aucun email, token ou identifiant de compte. Les résultats du catalogue sont mis en cache 60 secondes.

`lib/codex.ts` lance `codex exec` avec images, sortie JSON structurée, sandbox lecture seule, outils shell désactivés et authentification ChatGPT imposée. Les variables de clé API sont retirées de l’environnement du sous-processus. Le modèle est choisi parmi les modèles annoncés, en tenant compte des entrées image et des efforts autorisés. Les règles du compte sont encore vérifiées par le fournisseur lors de l’exécution. Pas de fallback vers une API payante.

La recherche fabricant autorise uniquement l’outil web ; les journaux doivent prouver un appel web avant que son résultat soit accepté. Les recommandations comportent des sources. La qualité factuelle et la correspondance produit demandent encore la vérification humaine.

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
