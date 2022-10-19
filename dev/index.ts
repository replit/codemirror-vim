import { basicSetup, EditorView } from 'codemirror'
import { highlightActiveLine, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { Vim, vim } from "../src/"

import * as commands from "@codemirror/commands";
import { Compartment, EditorState } from '@codemirror/state';

const doc = `//🌞
import { basicSetup, EditorView } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript';
import { vim } from "../src/"

const doc = \`
console.log('hi')
\`

new EditorView({
  doc,
  extensions: [vim(), basicSetup, javascript()],
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
let enableVim = true
let vimCompartement = new Compartment();

var defaultExtensions = [
  // make sure vim is included before all other keymaps
  vimCompartement.of([
    vim({status: true}),
  ]),
  // include the default keymap and all other keymaps you want to use in insert mode
  basicSetup,
  highlightActiveLine(),
  keymap.of([
    {
      key: "Alt-v",
      run: () => {
        enableVim = !enableVim
        updateView()
        return true
      }
    }
  ])
]

var tabs = {
  js: EditorState.create({
    doc: doc,
    extensions: [...defaultExtensions, javascript()]
  }),
  html: EditorState.create({
    doc: document.documentElement.outerHTML,
    extensions: [...defaultExtensions, xml()]
  })
}
var selectedTab = ""


function updateView() {
  if (!view) {
    view = global._view = new EditorView({
      doc: "",
      extensions: defaultExtensions,
      parent: document.querySelector('#editor'),
    });
  }

  selectTab(htmlCheckbox.checked ? "html": "js")

  view.dispatch({
    effects: vimCompartement.reconfigure([
      enableVim && vim({status: statusBox.checked}),
      wrapCheckbox.checked && EditorView.lineWrapping,
    ].filter(Boolean))  
  })
}

function selectTab(tab: string) {
  if (selectedTab != tab) {
    tabs[selectedTab] = view.state;
    selectedTab = tab
    view.setState(tabs[selectedTab])
  }
}

Vim.defineEx("tabnext", "tabn", () => {
  tabs["scratch"] = EditorState.create({
    doc: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
    extensions: defaultExtensions,
  })
  selectTab("scratch")
});


updateView()