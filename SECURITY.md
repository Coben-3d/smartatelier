# Sécurité et confidentialité

SmartAtelier est un serveur local mono-utilisateur, sans authentification applicative. Gardez l’écoute sur 127.0.0.1. N’exposez pas son port sur Internet et ne partagez pas une connexion CLI entre plusieurs utilisateurs.

Les contenus des médias, noms d’articles et pages web sont traités comme des données non fiables dans les prompts. Les sorties sont validées par schémas. Cela ne garantit pas l’absence d’erreur d’identification ou de recommandation.

`data/` et `data-preview/` peuvent contenir des photos personnelles, positions de rangement, chemins locaux, prompts et résultats. Les fichiers OAuth restent gérés par le fournisseur officiel. Ne les commitez jamais. Le paquet de distribution est construit à partir d’une liste explicite de fichiers autorisés.

Pour une vulnérabilité, utilisez le signalement privé de GitHub **si le mainteneur l’a activé**. Sinon, ouvrez une issue demandant un canal privé, sans publier les détails exploitables ni aucune donnée personnelle. Les mainteneurs doivent activer ce canal avant la publication publique.
