#!/bin/bash
set -euxo pipefail

# Navigate to the repository root
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

# npm pack the repository
rm -f replit-codemirror-vim-*.tgz
npm pack

# Get the name of the packed file
PACKAGE_FILE=$(ls replit-codemirror-vim-*.tgz | sort -V | tail -n 1)

mv "$PACKAGE_FILE" replit-codemirror-vim-latest.tgz

rm -rf ../.test_package
mkdir -p ../.test_package
cd ../.test_package

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
    "module": "commonjs",
    "target": "es2020",
    "moduleResolution": "node"
  },
  "include": ["*.ts"],
  "exclude": ["node_modules"]
}
' > tsconfig.json

# Install the ace package from the npm pack result
npm i "$ROOT"/replit-codemirror-vim-latest.tgz 
npm i codemirror @codemirror/lang-javascript @codemirror/lang-xml

# Install TypeScript
npm i typescript@latest
rm -f index.js 
npm run build

# Install old version of TypeScript
npm i typescript@4
rm -f index.js 
npm run build
