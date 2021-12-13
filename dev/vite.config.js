import { fileURLToPath } from 'url';
import * as path from "path"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  server: {
    host: '0.0.0.0',
    /*hmr: {
      port: 443,
    }*/
  },
  resolve:{
    alias:[
        { find: /^..$/, replacement:  __dirname + '/../src/index.ts' },
      ]
    
  },
}
