import { basicSetup, EditorView } from 'codemirror'
import { highlightActiveLine, keymap, Decoration, DecorationSet,
   ViewPlugin, ViewUpdate, WidgetType, drawSelection } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { Vim, vim } from "../src/index"

import * as commands from "@codemirror/commands";
import { Annotation, Compartment, EditorState, Extension, Transaction, Range } from '@codemirror/state';

const doc = `//\t🌞 אבג
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

class TestWidget extends WidgetType {
    constructor(private side: number) {
        super(); 
    }
    eq(other) {
        return (true);
    }
    toDOM() {
        const wrapper = document.createElement('span');
        wrapper.textContent =  " widget" + this.side + " "
        wrapper.style.opacity = '0.4';
        return wrapper;
    }
    ignoreEvent() {
        return false;
    }
}

function widgets(view: EditorView) {
  let widgets: Range<Decoration>[] = [];
  for (let i = 0; i < 10; i++) {
    let side = widgets.length % 2 ? 1 : -1
    let deco = Decoration.widget({
      widget: new TestWidget(side),
      side: side
    })
    widgets.push(deco.range(200 + 10 * i))
  }
  console.log(widgets)
  return Decoration.set(widgets)
}

const testWidgetPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = widgets(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = widgets(update.view)
  }
}, {
  decorations: v => v.decorations,

  eventHandlers: {
    mousedown: (e, view) => {
    }
  }
})

if (!localStorage.status) localStorage.status = "true";
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
  readOnly: addOption("readOnly")
};



Vim.defineOption('wrap', false, 'boolean', null, function(val, cm) {
  if (val == undefined) return options.wrap;
  var checkbox = document.getElementById("wrap");
  if (checkbox) {
    checkbox.checked = val;
    checkbox.onclick();
  }
});

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
  ]),
]

function saveTab(name) {
  return EditorView.updateListener.of((v) => {
    tabs[name] = v.state;
  })
}

var tabs = {
  js: EditorState.create({
    doc: doc,
    extensions: [...defaultExtensions, javascript(), saveTab("js")]
  }),
  html: EditorState.create({
    doc: document.documentElement.outerHTML,
    extensions: [...defaultExtensions, testWidgetPlugin, xml(), saveTab("html")]
  })
}

function updateView() {
  if (options.split && !view2) createSplit();
  if (!options.split && view2) deleteSplit();

  if (!view) view = createView();
  addLogListeners();

  selectTab(options.html ? "html": "js")

  var extensions = [
    EditorState.readOnly.of(options.readOnly),
    enableVim && vim({status: options.status}),
    options.wrap && EditorView.lineWrapping,
    drawSelection({cursorBlinkRate: window.blinkRate})
  ].filter((x)=>!!x) as Extension[];
  
  view.dispatch({
    effects: vimCompartement.reconfigure(extensions)
  })
}

function selectTab(tab: string) {
  if (view) view.setState(tabs[tab])
  if (view2) view2.setState(tabs[tab])
  addLogListeners();
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

function addLogListeners() {
  var cm = (view as any)?.cm;
  if (cm) {
    cm.off("inputEvent", logHandler);
    cm.on("inputEvent", logHandler);
  }
}
var i = 0;
function logHandler(e: any) {
  var message = [i++, e.type.padEnd(10), e.key, e.code].join(" ");
  var entry = logContainer.childNodes.length < 1000
    ? document.createElement("div")
    : logContainer.lastChild! as HTMLElement;
  entry.textContent = message
  logContainer.insertBefore(entry, logContainer.firstChild);
}
var logContainer = document.createElement("pre");
document.body.appendChild(logContainer);
logContainer.className = ".logContainer"



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
