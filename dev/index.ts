import { basicSetup, EditorState } from '@codemirror/basic-setup';
import { EditorView, highlightActiveLine } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { vim } from "../src/"

const doc = `
import { basicSetup, EditorState } from '@codemirror/basic-setup';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { vim } from "../src/"

const doc = \`
console.log('hi')
\`

new EditorView({
  state: EditorState.create({
    doc,
    extensions: [vim(), basicSetup, javascript()],
  }),
  parent: document.querySelector('#editor'),
});

`;

(window as any)._view = new EditorView({
  state: EditorState.create({
    doc,
    extensions: [vim(), basicSetup, javascript(), highlightActiveLine() ],
  }),
  parent: document.querySelector('#editor'),
});
