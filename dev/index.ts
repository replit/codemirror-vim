import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state';
import { highlightActiveLine } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { Vim, vim } from "../src/"

import * as commands from "@codemirror/commands";

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


let wrapCheckbox = document.getElementById("wrap") as HTMLInputElement
wrapCheckbox.checked = localStorage.wrap == "true"
wrapCheckbox.onclick = function() {
  updateView();
  localStorage.wrap = wrapCheckbox.checked;
}
let htmlCheckbox = document.getElementById("html") as HTMLInputElement
htmlCheckbox.checked = localStorage.html == "true"
htmlCheckbox.onclick = function() {
  updateView();
  localStorage.html = htmlCheckbox.checked;
}
let statusBox = document.getElementById("status") as HTMLInputElement
statusBox.checked = localStorage.status == "true"
statusBox.onclick = function() {
  updateView();
  localStorage.status = statusBox.checked;
}
let jjBox = document.getElementById("jj") as HTMLInputElement
jjBox.checked = localStorage.jj == "true"
jjBox.onclick = function() {
  if (jjBox.checked)
    Vim.map("jj", "<Esc>", "insert");
  else 
    Vim.unmap("jj", "insert")
  localStorage.status = statusBox.checked;
}
jjBox.onclick()


let global = window as any;
global._commands = commands;
global._Vim = Vim;

let view
function updateView() {
  if (view) view.destroy()
  view = global._view = new EditorView({
    state: EditorState.create({
      doc: htmlCheckbox.checked ? document.documentElement.outerHTML : doc,
      extensions: [
        // make sure vim is included before all other keymaps
        vim({status: statusBox.checked}), 
        // include the default keymap and all other keymaps you want to use in insert mode
        basicSetup,
        htmlCheckbox.checked ? xml(): javascript(), 
        highlightActiveLine(),
        wrapCheckbox.checked && EditorView.lineWrapping,
      ].filter(Boolean),
    }),
    parent: document.querySelector('#editor'),
  });

  if (jjBox.checked) {
    Vim.map
  }
}

updateView()