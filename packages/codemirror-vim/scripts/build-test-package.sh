#!/bin/bash
set -euxo pipefail

# Navigate to the package root
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# pnpm pack the package
rm -f replit-codemirror-vim-*.tgz
pnpm pack

# Get the name of the packed file
PACKAGE_FILE=$(ls replit-codemirror-vim-*.tgz | sort -V | tail -n 1)

mv "$PACKAGE_FILE" replit-codemirror-vim-latest.tgz

# Also pack the core package; the main tarball depends on it and it may not
# be published yet, so the test package consumes it via a pnpm override.
CORE_DIR="$(cd "$ROOT"/../codemirror-vim-core && pwd)"
rm -f "$CORE_DIR"/replit-codemirror-vim-core-*.tgz
(cd "$CORE_DIR" && pnpm pack)
CORE_FILE=$(ls "$CORE_DIR"/replit-codemirror-vim-core-*.tgz | sort -V | tail -n 1)
mv "$CORE_FILE" "$CORE_DIR"/replit-codemirror-vim-core-latest.tgz
CORE_TGZ="$CORE_DIR"/replit-codemirror-vim-core-latest.tgz

rm -rf "$ROOT"/../../../.test_package
mkdir -p "$ROOT"/../../../.test_package
cd "$ROOT"/../../../.test_package

cp "$ROOT"/dev/index.ts index.ts
cp "$ROOT"/dev/index.html index.html
node -e "
const fs = require('fs');
const filePath = 'index.ts';
let data = fs.readFileSync(filePath, 'utf8');
data = data.replace(/\"..\/src\/index\" \/\//g, '');
fs.writeFileSync(filePath, data, 'utf8');
"

echo '{
    "name": "test_package",
    "scripts": {
        "build": "tsc",
        "test": "echo \"No tests yet\""
    }
}' > package.json

# The main tarball depends on @replit/codemirror-vim-core, which may not be
# published yet; point pnpm at the locally packed tarball.
echo 'overrides:
  "@replit/codemirror-vim-core": file:'"$CORE_TGZ" > pnpm-workspace.yaml

echo '
import { defineConfig } from "vite";
export default defineConfig({
  base: "",
});' > vite.config.js

echo '{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "module": "node16",
    "target": "es2020",
    "moduleResolution": "node16"
  },
  "include": ["*.ts"],
  "exclude": ["node_modules"]
}
' > tsconfig.json

# Install the ace package from the pnpm pack result
pnpm add "$ROOT"/replit-codemirror-vim-latest.tgz
pnpm add codemirror @codemirror/lang-javascript @codemirror/lang-xml @codemirror/commands @codemirror/state @codemirror/view

# Install TypeScript
pnpm add typescript@latest
rm -f index.js
pnpm run build

# Install old version of TypeScript
pnpm add typescript@4
rm -f index.js
pnpm run build
