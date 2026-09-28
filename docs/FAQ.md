# Questions fréquentes

## Est-ce gratuit ?

Oui, le logiciel est gratuit et open source sous licence MIT. Le soutien PayPal est facultatif. Les droits et quotas d’un assistant IA dépendent du compte utilisé auprès de son fournisseur ; une offre gratuite dans une application de discussion ne garantit pas l’accès au CLI correspondant.

## Faut-il une clé API ?

Non. L’application passe par les CLI officiels, avec votre propre compte. Elle ne remplace jamais une connexion refusée par une API payante. Le stock manuel fonctionne sans IA.

## Est-ce le ChatGPT, Claude ou Gemini conversationnel ?

SmartAtelier ne pilote pas leur site de discussion : il appelle **Codex CLI**, **Claude Code** ou **Gemini CLI** selon votre choix. Les demandes utilisent votre compte et consomment les quotas de cet outil. Sur Claude Pro/Max, les limites sont partagées avec vos conversations Claude. Gemini utilise son propre outil, jamais Codex. Voir [le tableau des connexions et quotas](IA-ET-QUOTAS.md).

## Une correction manuelle consomme-t-elle du quota ?

Les quantités, notes et recherches dans le stock sont traitées localement. Une revérification IA, une analyse de projet ou une recherche fabricant consomme du quota. L’enregistrement d’une bobine suffisamment renseignée peut lancer automatiquement la recherche de ses réglages ; cette recherche utilise aussi l’IA.

## Mes photos restent-elles sur mon ordinateur ?

Les originaux, le stock et les résultats sont enregistrés localement. Pour une analyse, les vues sélectionnées sont envoyées au fournisseur choisi. Les informations de stock utiles sont également transmises pour un projet. Le fonctionnement IA n’est donc pas hors ligne.

## Les composants CMS sont-ils pris en charge ?

Vous pouvez enregistrer manuellement un composant CMS : nom, référence, quantité, emplacement et notes. Les formats de boîtier, valeurs et tolérances peuvent être précisés dans ces champs ; il n’y a pas encore de champs CMS spécialisés ni de gestion de bobines CMS par longueur de bande.

La reconnaissance photo de petits composants sans marquage n’est pas garantie. Photographier l’étiquette du sachet ou de la bande peut aider, mais vérifiez la référence et les quantités avant validation. Le logiciel ne déduit pas une valeur électrique invisible.

## Peut-on gérer des tiroirs et des cases ?

Chaque article possède un emplacement libre, par exemple « Meuble A · tiroir C17 · case 4 ». Cet emplacement est inclus dans la recherche. Il n’y a pas encore de plan interactif du meuble, de grille de compartiments ni d’étiquettes QR.

## Plusieurs bobines de filament sur la même photo ?

Oui : le logiciel propose une fiche par bobine physique, avec cadre, couleur estimée et informations lisibles sur l’étiquette. Le total est à confirmer. Le polymère invisible et le poids restant ne sont pas devinés. Les bobines masquées, empilées ou très semblables peuvent être mal détectées.

## Puis-je réimporter la même photo pour compléter le stock ?

Les répétitions entre vues d’un même lot sont dédupliquées par l’assistant, avec une fiabilité limitée. Un nouvel import ne se fusionne pas automatiquement avec le stock existant : valider deux fois le même matériel dans deux lots différents crée des doublons.

## Claude ou Gemini ne répond pas : est-ce un bug du logiciel ?

Pas nécessairement. Vérifiez la connexion officielle du CLI, le modèle choisi, les quotas et les offres éligibles. Les connecteurs sont présents mais la reconnaissance réelle n’a pas été validée avec succès pour ces deux fournisseurs lors de la préparation de cette bêta. Consultez [l’état des validations](VALIDATION.md).

## Puis-je l’héberger sur un serveur public ou le partager ?

Cette version est prévue pour une seule personne sur son ordinateur. Elle n’a pas d’authentification applicative ni d’isolation entre utilisateurs. Gardez l’adresse locale 127.0.0.1.

## Comment sauvegarder et mettre à jour ?

Arrêtez l’application, copiez tout le dossier `data/`, puis mettez à jour uniquement le code. Réinstallez les dépendances avec `npm ci` et relancez `npm run launch`. Ne remplacez jamais votre dossier de données par celui d’un exemple. Le déplacement sur un autre ordinateur demande encore d’adapter les chemins absolus des médias ; l’export JSON seul ne contient pas les photos.
