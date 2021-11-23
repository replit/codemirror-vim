import { basicSetup, EditorState } from '@codemirror/basic-setup';
import { EditorView } from '@codemirror/view';
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

`

new EditorView({
  state: EditorState.create({
    doc,
    extensions: [vim(), basicSetup, javascript()],
  }),
  parent: document.querySelector('#editor'),
});
