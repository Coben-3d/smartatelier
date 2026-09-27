# Préparer la publication GitHub

Nom : **SmartAtelier** · dépôt suggéré : **smartatelier** · première bêta publique : **0.4.0**.

Dépôt officiel : [Coben-3d/smartatelier](https://github.com/Coben-3d/smartatelier). Ce guide sert aussi aux prochaines publications depuis un dossier source propre. Aucun dépôt distant n’est créé par les scripts du projet.

## Présentation du dépôt

**Description :** Inventaire local de composants électroniques et filaments 3D. Photos, vidéos, couleurs, rangement et projets, avec validation humaine et assistants IA via leurs CLI.

**Sujets :** `inventory`, `electronics`, `3d-printing`, `filament`, `local-first`, `nextjs`, `sqlite`, `codex`, `claude-code`, `gemini-cli`.

**Licence préparée :** MIT. Le soutien financier est facultatif et ne conditionne aucun accès. Le nom du dépôt doit être libre sur le compte qui l’héberge ; la recherche web préliminaire n’est pas une vérification de marque.

## Éléments à finaliser

- Le lien de don PayPal est configuré dans `project.config.json`, le README et `.github/FUNDING.yml` (voir [Soutien](SOUTIEN.md)).
- Le dépôt public est hébergé sur le compte Coben-3d. Pour un fork, choisissez votre propre compte et un dépôt vide.

## Contrôles locaux

Depuis une copie neuve des sources :

```sh
npm ci
npm test
npm run build
npm run release:check
npm run release:pack
```

L’archive `dist/smartatelier-0.4.0.tgz` est construite à partir d’une liste d’inclusion. Elle contient les sources, guides et ressources visuelles génériques, sans base SQLite, photos personnelles, identifiants ni sorties réelles d’analyse.

## Envoyer les sources

Si le dossier fourni contient déjà un dépôt Git local, ne le réinitialisez pas. Sinon :

```sh
git init -b main
```

Puis :

```sh
git add .
git diff --cached --stat
git diff --cached --name-only
```

Vérifiez la liste : pas de `data/`, `data-preview/`, `.env`, média privé, clé, fichier de connexion ou journal. Le dossier de développement contenant votre stock ne doit pas servir de dossier de publication.

Créez ensuite un commit avec votre identité Git habituelle :

```sh
git commit -m "Préparer SmartAtelier 0.4.0 beta"
```

Ajoutez comme remote l’URL exacte du dépôt vide créé sur **votre** compte, puis poussez `main`. Ne copiez pas une URL de compte d’exemple.

## Réglages GitHub

- Renseigner la description et les sujets ci-dessus.
- Activer Issues et le signalement privé des vulnérabilités.
- Activer Sponsorships après ajout du lien PayPal.
- Attendre le workflow de vérification sur macOS, Linux et Windows. Les tests locaux ne remplacent pas ces résultats distants.
- Créer une release **v0.4.0**, cocher **préversion**, utiliser [le texte de release](RELEASE-0.4.0.md) et joindre l’archive source.

Les connecteurs Claude/Gemini sont expérimentaux : ne les annoncer comme testés de bout en bout qu’après des essais réussis sur des comptes éligibles. Aucun compte Free/Plus/Pro n’est promis illimité. Le stock manuel est utilisable indépendamment des assistants.
