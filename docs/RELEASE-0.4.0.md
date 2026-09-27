# SmartAtelier 0.4.0 — première bêta publique

**Moins chercher. Plus fabriquer.**

SmartAtelier organise les composants électroniques et les bobines de filament de votre atelier, sur votre ordinateur. Importez des photos ou des vidéos, vérifiez les objets proposés, puis retrouvez ce dont vous avez besoin dans les images d’origine.

## Dans cette bêta

- Analyse de photos et de vues extraites des vidéos, estimation des quantités et regroupement des vues d’un même objet.
- Validation avant ajout au stock, aperçus recadrés, quantités, recherche et emplacements.
- Bobines de filament : cadres individuels, palette de couleurs, marque, polymère et poids à compléter.
- Projets : comparaison des besoins avec le stock et sélection visuelle du matériel à prendre.
- Choix de ChatGPT, Claude ou Gemini via leurs CLI officiels, sans clé API de secours.
- Logiciel gratuit sous licence MIT ; soutien du créateur entièrement facultatif.

## Installation

Installez Node.js 24 LTS, décompressez les sources, puis lancez dans le dossier du projet :

```sh
npm ci
npm run setup
npm run launch
```

Ouvrez http://127.0.0.1:3210. FFmpeg/FFprobe sont nécessaires aux vidéos. L’inventaire manuel fonctionne sans assistant connecté.

## Limites connues

La validation humaine reste indispensable : l’identification, les cadres, les couleurs et la déduplication peuvent être incorrects. Les caractéristiques invisibles et le poids restant ne sont pas déduits d’une photo.

ChatGPT a été testé avec un compte Pro. Les connecteurs Claude et Gemini sont expérimentaux : les essais réels n’ont pas abouti lors de la préparation (session Claude expirée ; client refusé par Google sur le compte d’essai). Leur accès dépend des conditions du fournisseur.

Application locale mono-utilisateur ; aucun hébergement public sécurisé ni synchronisation entre ordinateurs. Sauvegardez tout le dossier `data/` avant une mise à jour.

Les guides Installation, Utilisation, FAQ et Validation sont inclus dans le dépôt. Les retours reproductibles et contributions sont bienvenus.

Validation : 23 tests locaux et compilation de production réussis sur macOS. Les contrôles GitHub Actions n’ont pas pu démarrer ; compatibilité Windows/Linux non encore confirmée.

[❤️ Soutenir les projets de Coben3D](https://www.paypal.com/donate/?hosted_button_id=S2MTT95UDGFZ2) — facultatif, SmartAtelier reste gratuit.
