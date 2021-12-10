import {initVim} from "./vim"
import { CodeMirror } from "./cm_adapter"

import {BlockCursorPlugin, hideNativeSelection} from "./block-cursor"

import { Extension } from "@codemirror/state"
import { ViewPlugin, PluginValue, ViewUpdate } from "@codemirror/view"
import { EditorView } from "@codemirror/view"

import {showPanel} from "@codemirror/panel"
import {StateField, StateEffect} from "@codemirror/state"

const Vim = initVim(CodeMirror)

const vimStyle = EditorView.theme({
  ".cm-vimMode .cm-cursorLayer:not(.cm-vimCursorLayer)": {
    display: "none",
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
  public view: EditorViewExtended;
  public cm: CodeMirror;
  public status = ""
  blockCursor: BlockCursorPlugin 
  constructor(view: EditorView) {
    this.view = view as EditorViewExtended
    const cm = this.cm = new CodeMirror(view);
    Vim.enterVimMode(this.cm);

    this.view.cm = this.cm

    this.blockCursor = new BlockCursorPlugin(view, cm)
    this.updateClass()

    this.cm.on('vim-command-done', () => {
      this.status = ""
      if (cm.state.vim) cm.state.vim.status = "";
      this.blockCursor.scheduleRedraw();
    });
    this.cm.on('vim-mode-change', () => {
      this.blockCursor.scheduleRedraw();
      this.updateClass()
    });
    

    this.cm.on("dialog", () => {
      view.dispatch({
        effects: showVimPanel.of(!!this.cm.state.dialog)
      })
    });

    this.dom = view.dom.appendChild(document.createElement("div"))
    this.dom.style.cssText =
      "position: absolute; inset-block-start: 2px; inset-inline-end: 5px"
    this.dom.textContent = ""
  }

  update(update: ViewUpdate) {
    if (update.docChanged) {
      this.cm.onChange(update)
    } 
    if (update.selectionSet) {
      this.cm.onSelectionChange()
    } 
    if (update.viewportChanged) {
      // scroll
    }
    if (this.cm.curOp && !this.cm.curOp.isVimOp) {
      this.cm.onBeforeEndOperation();
    }

    this.blockCursor.update(update);
    this.dom.textContent = this.status
  }
  updateClass() {
    const state = this.cm.state;
    if (!state.vim || (state.vim.insertMode && !state.overwrite))
      this.view.scrollDOM.classList.remove("cm-vimMode")
    else 
      this.view.scrollDOM.classList.add("cm-vimMode")
  }

  destroy() {
    this.cm.state.vim = null;
    this.updateClass()
    this.blockCursor.destroy();
    this.dom.remove()
    delete (this.view as any).cm;
  }
}, {
  eventHandlers: {
    keydown: function name(e: KeyboardEvent, view: EditorView) {
      const key = CodeMirror.vimKey(e)
      const cm = this.cm
      if (!key) return
      this.status += key
      let result = Vim.handleKey(cm, key, "user");

      // insert mode
      if (!result && cm.state.vim.insertMode && cm.state.overwrite) {
        if (key.length == 1 && e.key && !/\n/.test(e.key)) {
          result = true;
          cm.overWriteSelection(e.key)
        } else if (e.key == "Backspace") {
          result = true;
          CodeMirror.commands.cursorCharLeft(cm)
        }
      }
      if (result) {
        e.preventDefault()
        e.stopPropagation()
        this.blockCursor.scheduleRedraw();
      }
      cm.state.vim.status = this.status;

      return !!result;
    }
  }
})

const showVimPanel = StateEffect.define<boolean>()

const vimPanelState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(showVimPanel)) value = e.value
    return value
  },
  provide: f =>{
    return showPanel.from(f, on => on ? createVimPanel : null)
  }
})

function createVimPanel(view: EditorView) {
  let dom = document.createElement("div")
  dom.className = "cm-vim-panel"
  let cm = (view as EditorViewExtended).cm;
  if (cm.state.dialog) {
    dom.appendChild(cm.state.dialog)
  }
  return {top: false, dom}
}

export function vim(options: {} = {}): Extension {
  return [
    vimStyle,
    vimPlugin,
    hideNativeSelection,
    vimPanelState
  ]
}

export {CodeMirror, Vim}