import { fileURLToPath } from 'url';
import * as path from 'path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const isReplit = Boolean(process.env.REPL_SLUG);

export default {
  server: {
    host: '0.0.0.0',

    ...(isReplit
      ? {
          hmr: {
            clientPort: 443,
          },
        }
      : {}),
  },
  resolve: {
    alias: [{ find: /^..$/, replacement: dirname + '/../src/index.ts' }],
  },
};
