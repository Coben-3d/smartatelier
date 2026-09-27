# État des validations

Version 0.4.0 bêta préparée le 27 septembre 2026.

## Vérifié

- Installation depuis le lockfile dans un dossier distinct, puis depuis l’archive distribuable extraite dans un dossier neuf ; compilation de production et 16 tests réussis.
- Tests automatiques sur schémas, cadres, validation des lots, persistance des champs et poids, unicité des validations, stock non négatif, partage de disponibilité, crops et orientation EXIF, sources de réglages, sélection de modèles et environnement sans clé API.
- Lecture réelle de l’offre et du catalogue sur un compte ChatGPT Pro via le protocole officiel Codex. Aucun token ni email exposé à l’interface. Sélection/enregistrement d’un modèle depuis l’interface et exécution réelle courte avec sortie JSON vérifiées.
- Dans le prototype local : imports photo et vidéo, seconde analyse sur gros plan, recherche fabricant réelle et enregistrement de bobines.

## À valider avant d’élargir les promesses

- Authentification initiale avec un nouveau compte et parcours réels Plus / Free / Go. Leurs catalogues sont simulés dans les tests de sélection ; cela ne prouve pas un accès réel au CLI sur ces offres.
- Exécution sur Linux, WSL2 et Windows natif. Un workflow GitHub Actions est fourni ; il n’a pas encore tourné sur GitHub.
- Fiabilité de la reconnaissance d’une scène contenant plusieurs bobines : pas de photo utilisateur de ce type disponible pour les essais. Le schéma et la validation des lots mixtes sont testés.
- Détection/déduplication des très petits objets, occultations et bobines identiques : validation humaine toujours requise.

Les tests automatiques ne contactent aucun modèle et ne consomment aucun quota. Les résultats d’analyse ne sont pas une certification technique ou une mesure physique.

## Ajouts 0.3 : vérifications et limites

- 22 tests locaux réussis, dont transport d’images Claude, sorties structurées/refus des réponses invalides, confirmation d’une recherche web, séparation des modèles et échange ACP Gemini simulé (images, réponse fragmentée, permission refusée, environnement sans clé API).
- Compilation de production réussie. Aperçu navigateur séparé sur 3212, avec un stock de démonstration local exclu de la distribution.
- ChatGPT reste connecté. Claude Code 2.1.143 détecte le compte Pro. L’essai avec une image synthétique a été refusé : 401, session OAuth invalide. Une reconnexion est nécessaire ; aucune analyse Claude réelle réussie n’est revendiquée.
- Gemini CLI 0.42.0 a bien annoncé sa capacité image via ACP ; Google a ensuite refusé l’accès au compte d’essai avec `UNSUPPORTED_CLIENT` / `IneligibleTierError`. Aucun résultat de vision réel Gemini n’est revendiqué. L’interface affiche ce blocage sans proposer de relais API payant.
- L’analyse des photos, la recherche fabricant et les quotas effectifs de Claude/Gemini restent à vérifier avec des comptes éligibles. Les tests simulés ne prouvent ni l’accès commercial ni la fiabilité de reconnaissance.
- Aucune publication GitHub faite pour cette version ; le workflow CI distant n’a pas été exécuté.

- Après ajout du routage, ChatGPT a reconnu les deux couleurs et le nombre de formes dans une image synthétique : JSON `{ "colors": ["rouge", "bleu"], "count": 2 }`. Ce contrôle ne mesure pas la précision sur de vrais composants.

## Parcours photo des bobines

Le 27 septembre 2026, un import via le bouton photo a été testé avec une illustration contrôlée de trois bobines rouge, bleue et verte. Le modèle a renvoyé trois fiches distinctes, leurs cadres et teintes ; les informations techniques sans étiquette sont restées inconnues. Sélection d’une bobine par son cadre et correction par la palette vérifiées dans le navigateur. Ce test sur illustration ne mesure pas la précision sur des photos réelles, particulièrement pour des bobines empilées ou masquées. Un test de persistance couvre trois fiches, trois couleurs, les cadres et la catégorie Filaments 3D après validation.

## Préparation 0.4

- Installation depuis l’archive 0.4.0 extraite dans un dossier neuf : 23 tests automatiques réussis et compilation de production validée sur macOS.
- Encart de soutien et nom vérifiés dans le navigateur ; aucun paiement déclenché.
- Sources distribuées par liste explicite : inventaires, médias personnels, fichiers de connexion, dépendances et fichiers temporaires exclus.
- Nouveau nom SmartAtelier, guides GitHub et encart de soutien facultatif. La page de don PayPal du créateur est configurée ; aucun paiement déclenché.
