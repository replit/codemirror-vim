import { basicSetup, EditorView } from 'codemirror'
import { highlightActiveLine, keymap, Decoration, DecorationSet, ViewPlugin } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { css } from '@codemirror/lang-css';
import { Vim, vim } from "../src/index"
import {syntaxTree} from "@codemirror/language"

import { colorPicker } from '@replit/codemirror-css-color-picker';

import * as commands from "@codemirror/commands";
import { Annotation, Compartment, EditorState, Extension, Transaction } from '@codemirror/state';

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

true false
`;

function addOption(name, description?, onclick?) {
  let checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = name;
  let label = document.createElement("label");
  label.setAttribute("for", name);
  label.textContent = description || name;
  
  let value = localStorage[name] == "true"
  checkbox.checked = value;
  checkbox.onclick = function() {
    options[name] = checkbox.checked;
    updateView();
    if (onclick) onclick(options[name])
    localStorage[name] = checkbox.checked;
  }
  document.getElementById("toolbar")?.append(checkbox, label, " ")
  return value
}

import {WidgetType} from "@codemirror/view"

class CheckboxWidget1 extends WidgetType {
  constructor(readonly checked: boolean) { super() }

  eq(other: CheckboxWidget) { return other.checked == this.checked }

  toDOM() {
    let wrap = document.createElement("span")
    wrap.setAttribute("aria-hidden", "true")
    wrap.className = "cm-boolean-toggle"
    let box = wrap.appendChild(document.createElement("input"))
    box.type = "checkbox"
    box.checked = this.checked
    return wrap
  }

  ignoreEvent() { return false }
}

class CheckboxWidget extends WidgetType {
    constructor(_a) {
        super(); 
        this.a = _a
    }
    eq(other) {
        return (true);
    }
    toDOM() {
        const picker = document.createElement('span');
        // picker.type = 'color';
        picker.value = this.a // "#4488aa";
        const wrapper = document.createElement('span');
        // wrapper.appendChild(picker);
wrapper.textContent =  this.a
        wrapper.className = 'cm-css-color-picker-wrapper';
        return wrapper;
    }
    ignoreEvent() {
        return false;
    }
}

function checkboxes(view: EditorView) {
  let widgets = []
  var last = 0
  for (let {from, to} of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
          last = node.to - node.from
        if ( last > 20 || last < 4 || widgets.length > 10) return
          let isTrue = view.state.doc.sliceString(node.from, node.to) == "true"
            let side = widgets.length % 2 ? 1 : -1
          let deco = Decoration.widget({
            widget: new CheckboxWidget(side),
            side: side
          })
          widgets.push(deco.range(node.to-1))
        
      }
    })
  }
  widgets.sort((a,b)=> {
      return a.from - b.from
  })
  console.log(widgets)
  return Decoration.set(widgets)
}

const checkboxPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = checkboxes(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = checkboxes(update.view)
  }
}, {
  decorations: v => v.decorations,

  eventHandlers: {
    mousedown: (e, view) => {
      let target = e.target as HTMLElement
      if (target.nodeName == "INPUT" &&
          target.parentElement!.classList.contains("cm-boolean-toggle"))
        return toggleBoolean(view, view.posAtDOM(target))
    }
  }
})

function toggleBoolean(view: EditorView, pos: number) {
  let before = view.state.doc.sliceString(Math.max(0, pos - 5), pos)
  let change
  if (before == "false")
    change = {from: pos - 5, to: pos, insert: "true"}
  else if (before.endsWith("true"))
    change = {from: pos - 4, to: pos, insert: "false"}
  else
    return false
  view.dispatch({changes: change})
  return true
}

var options = {
  wrap: addOption("wrap"),
  html: addOption("html"),
  status: addOption("status", "status bar"),
  jj: addOption("jj", "map jj to Esc", function(on) {
    if (on)
      Vim.map("jj", "<Esc>", "insert");
    else 
      Vim.unmap("jj", "insert")
  }),
  split: addOption("split", "",  function() {

  }),
};

var focusEditorButton = document.createElement("button");
focusEditorButton.onclick = function(e) {
  e.preventDefault();
  view?.focus();
}
focusEditorButton.textContent = "focusEditor";
focusEditorButton.onmousedown = function(e) {
  e.preventDefault();
}
document.getElementById("toolbar")?.append(focusEditorButton," ")
  
 
let global = window as any;
global._commands = commands;
global._Vim = Vim;

let container = document.querySelector('#editor')!;
let view: EditorView|undefined, view2: EditorView|undefined;
let enableVim = true;
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
  colorPicker,
  checkboxPlugin,
]

function saveTab(name) {
  return EditorView.updateListener.of((v) => {
    if (v.docChanged) {
      tabs[name] = v.state;
    }
  })
}

var tabs = {
  js: EditorState.create({
    doc: doc,
    extensions: [...defaultExtensions, javascript(), saveTab("js")]
  }),
  html: EditorState.create({
    doc: document.documentElement.outerHTML,
    extensions: [...defaultExtensions, css(), saveTab("html")]
  })
}

function updateView() {
  if (options.split && !view2) createSplit();
  if (!options.split && view2) deleteSplit();

  if (!view) view = createView();

  selectTab(options.html ? "html": "js")

  var extensions = [
    enableVim && vim({status: options.status}),
    options.wrap && EditorView.lineWrapping,
  ].filter((x)=>!!x) as Extension[];
  
  view.dispatch({
    effects: vimCompartement.reconfigure(extensions)
  })
}

function selectTab(tab: string) {
  if (view) view.setState(tabs[tab])
  if (view2) view2.setState(tabs[tab])
}

Vim.defineEx("tabnext", "tabn", () => {
  tabs["scratch"] = EditorState.create({
    doc: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
    extensions: [defaultExtensions, saveTab("scratch")],
  })
  selectTab("scratch")
});



Vim.defineEx("split", "sp", () => {
  options.split = !options.split;
  updateView();
});



// splitting 
let syncAnnotation = Annotation.define<boolean>()

function syncDispatch(tr: Transaction, view: EditorView, other: EditorView) {
  view.update([tr])
  if (!tr.changes.empty && !tr.annotation(syncAnnotation)) {
    let annotations: Annotation<any>[] = [syncAnnotation.of(true)]
    let userEvent = tr.annotation(Transaction.userEvent)
    if (userEvent) annotations.push(Transaction.userEvent.of(userEvent))
    other.dispatch({changes: tr.changes, annotations})
  }
}


function createSplit() {
  deleteSplit();

  view = global._view = new EditorView({
    doc: "",
    extensions: defaultExtensions,
    parent: container,
    dispatch: tr => syncDispatch(tr, view!, view2!)
  });
  view2 = global._view2 = new EditorView({
    doc: "",
    extensions: defaultExtensions,
    parent: container,
    dispatch: tr => syncDispatch(tr, view2!, view!)
  });

  container.classList.add("split")
}

function deleteSplit() {
  if (view) view.destroy();
  if (view2) view2.destroy();
  view = view2 = undefined;
  container.classList.remove("split");
}

function createView() {
  if (view) view.destroy();
  view = global._view = new EditorView({
    doc: "",
    extensions: defaultExtensions,
    parent: container,
  });
  return view;
}


updateView()

// save and  restor search history


function saveHistory(name) {
  var controller = Vim.getVimGlobalState_()[name];
  var json = JSON.stringify(controller);
  if (json.length > 10000) {
    var toTrim = JSON.parse(json);
    toTrim.historyBuffer = toTrim.historyBuffer.slice(toTrim.historyBuffer.lenght/2);
    toTrim.iterator = toTrim.historyBuffer.lenght;
    json = JSON.stringify(toTrim);
  }
  localStorage[name] = json;
}
function restoreHistory(name) {
  try {
    var json = JSON.parse(localStorage[name]);
    var controller = Vim.getVimGlobalState_()[name];
    controller.historyBuffer = json.historyBuffer.filter(x => typeof x == "string" && x)
    controller.iterator = Math.min(parseInt(json.iterator) || Infinity, controller.historyBuffer.length)
  } catch(e) {

  }
}

restoreHistory('exCommandHistoryController');
restoreHistory('searchHistoryController');

window.onunload = function() {
  saveHistory('exCommandHistoryController');
  saveHistory('searchHistoryController');
}
