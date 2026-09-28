# IA, connexions et quotas

## Conversation classique et connexion automatique

Vous pouvez demander manuellement à un assistant d’identifier une photo dans son application de discussion. SmartAtelier automatise l’envoi des vues, récupère une réponse structurée et la présente pour validation. Il utilise pour cela un outil officiel du fournisseur, installé sur l’ordinateur : Codex CLI pour OpenAI, Claude Code pour Anthropic, Gemini CLI pour Google. Le nom de l’outil ne signifie pas que l’analyse de votre stock génère du code.

Parcours : **photo ou frames vidéo → outil du fournisseur choisi → modèle IA distant → résultat structuré → correction et validation → inventaire local**. Les originaux restent conservés sur l’ordinateur ; les vues à analyser sont envoyées au fournisseur. Un fournisseur choisi n’est pas un relais vers les deux autres.

## Votre compte et votre consommation

| Choix | Compte et accès | Quota utilisé et consultation |
| --- | --- | --- |
| ChatGPT / OpenAI → Codex CLI | Connexion ChatGPT avec droit d’accès à Codex ; modèles compatibles proposés par ce compte. | Usage Codex du compte, partagé avec vos autres sessions Codex. Consultez le suivi d’usage Codex ou `/status` dans le CLI. Ne supposez pas que le quota de conversation classique est interchangeable. |
| Claude → Claude Code | Connexion au compte Claude avec accès Claude Code ; pour les particuliers, les offres Pro/Max incluent cet accès selon la documentation citée. | Sur Pro/Max, Claude et Claude Code partagent leurs limites : les analyses peuvent réduire ce qui reste pour vos conversations Claude. Consultez les paramètres d’utilisation de votre compte. |
| Gemini → Gemini CLI | Connexion **Login with Google**. Une offre gratuite éligible existe via Gemini Code Assist pour les particuliers ; certaines offres payantes donnent des limites supérieures. | Quotas propres à Gemini CLI / Code Assist selon le compte et l’offre. Consultez `/stats model` dans Gemini CLI et les informations de votre offre. Ces limites ne sont pas celles promises pour le site de conversation Gemini. |

L’accès à une application de discussion gratuite ou payante ne suffit pas à prouver l’accès à son outil CLI. Les offres, modèles, limites et conditions peuvent changer ; le fournisseur reste l’autorité. SmartAtelier ne calcule pas un nombre garanti de photos par abonnement.

Sources officielles consultées le 28 septembre 2026 : [authentification Codex](https://learn.chatgpt.com/docs/auth), [consommation et limites Codex](https://learn.chatgpt.com/docs/pricing), [Claude Code avec Pro/Max et limites partagées](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan), [connexion Google](https://geminicli.com/docs/get-started/authentication/), [quotas et offres Gemini CLI](https://geminicli.com/docs/resources/quota-and-pricing/).

## Quelles actions utilisent l’IA ?

| Action | Traitement et consommation |
| --- | --- |
| Importer une photo ou une vidéo | Préparation locale, puis analyse des vues par le fournisseur choisi : consomme son quota. |
| Revérifier un composant dans son cadre | Nouveau traitement des gros plans par l’IA : consommation supplémentaire. |
| Analyser une description de projet | Description et fiches de stock envoyées à l’IA : consomme son quota. |
| Rechercher les paramètres d’un filament | Recherche fabricant par l’IA avec accès web : consomme son quota. Peut démarrer automatiquement après validation, ajout ou modification d’une fiche suffisamment renseignée, si aucun résultat correspondant n’est déjà conservé. Une relance forcée consomme à nouveau. |
| Préparer les frames vidéo et recadrer les aperçus | Calcul local avec FFmpeg/Sharp, sans appel au modèle pour cette préparation. |
| Consulter le stock, rechercher, filtrer, modifier les quantités, exporter | Traitements locaux sans appel IA. La recherche fabricant automatique des filaments constitue l’exception lors de l’enregistrement d’une fiche. |
| « Montre-moi quoi prendre » sur un projet déjà analysé et cocher les objets | Affichage des résultats enregistrés, sans nouvelle analyse IA. |

La quantité d’images et de texte, le modèle, le raisonnement et les recherches influencent l’usage. Un clic ne correspond pas forcément à un seul échange ni à une unité fixe. Réessayer une analyse peut consommer à nouveau, même si le résultat précédent était inutilisable.

La dictée dépend du service vocal du navigateur ou du système ; elle n’est pas une transcription envoyée au CLI par SmartAtelier. L’analyse du texte de projet qui suit utilise, elle, le fournisseur sélectionné.

## Logiciel gratuit, service IA soumis à ses propres règles

SmartAtelier n’utilise pas de clé API comme solution de secours et ne souscrit aucun abonnement. Il ne gère ni n’achète de crédits. Vos éventuels crédits ou options de dépassement déjà activés auprès d’un fournisseur restent soumis à ses règles ; l’absence de clé API n’est pas une garantie universelle d’absence de frais. Vérifiez ces réglages dans votre compte si vous souhaitez rester dans votre usage inclus.

Si le fournisseur refuse une demande faute de droits ou de quota, SmartAtelier affiche une erreur et ne change pas automatiquement de fournisseur. L’inventaire manuel reste utilisable ; vous pouvez attendre le renouvellement annoncé puis relancer l’analyse.

## État de la bêta

Le parcours OpenAI a été essayé avec un compte ChatGPT Pro. Claude et Gemini sont intégrés mais leurs essais réels de vision n’ont pas abouti lors de la préparation : session Claude expirée et accès Gemini refusé au compte d’essai. Les tests automatisés de protocole ne prouvent pas leur fonctionnement de bout en bout. Voir [les validations](VALIDATION.md) et [la connexion de chaque outil](INSTALLATION.md).
