#!/bin/zsh
cd -- "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  echo "Installez Node.js 24 LTS depuis https://nodejs.org puis réessayez."
  read
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci || exit 1
fi
npm run launch
read
