# SmartAtelier pour Windows (version portable)

Cette version contient tout ce qu’il faut : Node.js, l’application déjà compilée, Codex (ChatGPT), Gemini CLI et FFmpeg. **Rien à installer**, sauf Claude Code si vous choisissez Claude (voir plus bas).

## Démarrer

1. Décompressez tout le ZIP dans un dossier où vous avez le droit d’écrire, par exemple `Documents\SmartAtelier`. Évitez `Program Files` et ne lancez pas depuis l’intérieur du ZIP.
2. Double-cliquez sur **Connexion.bat** et choisissez votre assistant IA (une seule fois). Vous pouvez sauter cette étape pour un inventaire manuel.
3. Double-cliquez sur **SmartAtelier.bat**. Le navigateur s’ouvre sur http://127.0.0.1:3210 après quelques secondes.

Gardez la fenêtre noire ouverte pendant l’utilisation ; la fermer arrête l’application. Si Windows SmartScreen affiche un avertissement, cliquez sur **Informations complémentaires → Exécuter quand même** (les fichiers ne sont pas signés).

**Diagnostic.bat** vérifie l’installation en cas de problème.

## Utiliser Claude

Claude Code n’est pas redistribuable, il faut donc l’installer une fois avec l’installateur officiel d’Anthropic, qui ne demande pas Node.js. Dans PowerShell :

```powershell
irm https://claude.ai/install.ps1 | iex
```

Fermez puis relancez SmartAtelier ; il trouve Claude Code automatiquement. Utilisez ensuite **Connexion.bat → 2**.

## Vos données

L’inventaire, les photos et les réglages sont enregistrés dans le dossier `data` à côté de ces fichiers. Choisissez l’emplacement définitif du dossier avant d’importer des photos : les chemins des médias sont enregistrés en absolu.

**Mettre à jour :** fermez SmartAtelier, décompressez la nouvelle version, puis copiez-y votre dossier `data`.

## Limites

Cette version Windows native n’a pas encore été validée sur autant de machines que macOS. Les quotas et conditions de ChatGPT, Claude et Gemini restent ceux de votre compte. Voir `README.md` et `docs/` pour le reste.

Composants tiers : Node.js (`node/LICENSE`), FFmpeg en build LGPL (`ffmpeg/LICENSE.txt`), Codex et Gemini CLI (licence Apache 2.0).
