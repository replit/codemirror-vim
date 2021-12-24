import { fileURLToPath } from 'url';
import * as path from "path"

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default {
  server: {
    host: '0.0.0.0',
    /*hmr: {
      port: 443,
    }*/
  },
  resolve:{
    alias:[
        { find: /^..$/, replacement:  dirname + '/../src/index.ts' },
      ]
    
  },
}
