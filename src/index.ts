import {Vim} from "./vim"
import { CodeMirror } from "./cm_adapter"

import {drawSelection} from "./draw-selection"


import { Extension } from "@codemirror/state"
import { ViewPlugin, PluginValue } from "@codemirror/view"
import { EditorView } from "@codemirror/view"


import {showPanel} from "@codemirror/panel"
import {StateField, StateEffect} from "@codemirror/state"
 

const vimStyle = EditorView.theme({
  ".cm-selectionLayer": {
    zIndex: -2,
  },
  ".cm-cursorLayer": {
    zIndex: -1,
  },
  ".cm-activeLine": {
    background: "transparent" // bug activeline hides markers
  },
  ".cm-fat-cursor": {
    position: "absolute",
    background: "#ff9696",
    border: "none",
  },
  
  ".cm-vim-panel": {
    padding: "5px 10px",
    backgroundColor: "#fffa8f",
    fontFamily: "monospace",
  },
  ".cm-vim-panel input": {
    border: "none",
    outline: "none",
    backgroundColor: "#fffa8f",
  },
})
type EditorViewExtended = EditorView&{cm:CodeMirror}

const vimPlugin = ViewPlugin.fromClass(class implements PluginValue {
  private dom: HTMLElement;
  public listener: Function;
  public view: EditorView;
  public cm: CodeMirror;
  public status = ""
  constructor(view: EditorViewExtended) {
    this.view = view
    var cm = this.cm = new CodeMirror(view);
    Vim.maybeInitVimState_(this.cm);

    view.cm = this.cm

    this.cm.on('vim-command-done', () => {
      this.status = ""
      if (cm.state.vim) cm.state.vim.status = "";
    });

    this.cm.on("dialog", function() {
      view.dispatch({
        effects: showVimPanel.of(view.cm.state.dialog)
      })
    });

    this.listener = (e: KeyboardEvent) => {
      var key = CodeMirror.vimKey(e)
      if (!key) return
      this.status += key
      cm.state.vim.status = this.status;
      var result = Vim.handleKey(this.cm, key, "user");

      if (result) {
        e.preventDefault()
        e.stopPropagation()
      }
      this.update()
    }
    view.contentDOM.addEventListener("keydown", this.listener, true)
    this.dom = view.dom.appendChild(document.createElement("div"))
    this.dom.style.cssText =
      "position: absolute; inset-block-start: 2px; inset-inline-end: 5px"
    window.cm = this.cm
    this.dom.textContent = ""
  }

  update(update?) {
    this.dom.textContent = this.status
  }

  destroy() {
    this.dom.remove()
    this.view.contentDOM.addEventListener("keydown", this.listener, true)
  }
})





const showVimPanel = StateEffect.define<boolean>()

const vimPanelState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(showVimPanel)) value = e.value
    return value
  },
  provide: f => showPanel.from(f, on => on ? createVimPanel : null)
})

function createVimPanel(view: EditorViewExtended) {
  let dom = document.createElement("div")
  dom.className = "cm-vim-panel"
  if (view.cm.state.dialog) {
    dom.appendChild(view.cm.state.dialog)
  }
  return {top: false, dom}
}

export function vim(options: {} = {}): Extension {
  return [
    vimStyle,
    vimPlugin,
    drawSelection(),
    vimPanelState
  ]
}

export {CodeMirror, Vim}