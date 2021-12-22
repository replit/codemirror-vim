import {initVim} from "./vim"
import { CodeMirror } from "./cm_adapter"

import {BlockCursorPlugin, hideNativeSelection} from "./block-cursor"

import { Extension } from "@codemirror/state"
import { ViewPlugin, PluginValue, ViewUpdate } from "@codemirror/view"
import { EditorView } from "@codemirror/view"

import {showPanel, Panel} from "@codemirror/panel"
import {StateField, StateEffect} from "@codemirror/state"

const Vim = initVim(CodeMirror)

const vimStyle = EditorView.theme({
  ".cm-vimMode .cm-cursorLayer:not(.cm-vimCursorLayer)": {
    display: "none",
  },
  ".cm-vim-panel": {
    padding: "0px 10px",
    fontFamily: "monospace",
    minHeight: "1.3em",
  },
  ".cm-vim-panel input": {
    border: "none",
    outline: "none",
    backgroundColor: "inherit",
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
    this.cm.state.vimPlugin = this

    this.blockCursor = new BlockCursorPlugin(view, cm)
    this.updateClass()

    this.cm.on('vim-command-done', () => {
      if (cm.state.vim) cm.state.vim.status = "";
      this.blockCursor.scheduleRedraw();
      this.updateStatus()
    });
    this.cm.on('vim-mode-change', (e: any) => {
      cm.state.vim.mode = e.mode;
      if (e.subMode) {
        cm.state.vim.mode += " block"
      }
      cm.state.vim.status = "";
      this.blockCursor.scheduleRedraw();
      this.updateClass()
      this.updateStatus()
    });
    

    this.cm.on("dialog", () => {
      if (this.cm.state.statusbar) {
        this.updateStatus()
      } else {
        view.dispatch({
          effects: showVimPanel.of(!!this.cm.state.dialog)
        })
      }
    });

    this.dom = document.createElement("span");
    this.dom.style.cssText = "float: right";
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
  }
  updateClass() {
    const state = this.cm.state;
    if (!state.vim || (state.vim.insertMode && !state.overwrite))
      this.view.scrollDOM.classList.remove("cm-vimMode")
    else 
      this.view.scrollDOM.classList.add("cm-vimMode")
  }
  updateStatus() {
    let dom = this.cm.state.statusbar;
    if (!dom) return;
    let dialog = this.cm.state.dialog
    if (dialog) {
      if (dialog.parentElement != dom) {
        dom.textContent = ""
        dom.appendChild(dialog)
      }
    } else {
      let vim = this.cm.state.vim;
      dom.textContent = `--${(vim.mode || "normal").toUpperCase()}--`

      this.dom.textContent = vim.status
      dom.appendChild(this.dom)
    }
  }

  destroy() {
    this.cm.state.vim = null;
    this.updateClass()
    this.blockCursor.destroy();
    delete (this.view as any).cm;
  }
}, {
  eventHandlers: {
    keydown: function(e: KeyboardEvent, view: EditorView) {
      const key = CodeMirror.vimKey(e)
      const cm = this.cm
      if (!key) return
      cm.state.vim.status = (cm.state.vim.status|| "") + key
      let result = Vim.handleKey(cm, key, "user");

      // insert mode
      if (!result && cm.state.vim.insertMode && cm.state.overwrite) {
        if (e.key && e.key.length == 1 && !/\n/.test(e.key)) {
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
      this.updateStatus()

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

function statusPanel(view: EditorView): Panel {
  let dom = document.createElement("div")
  dom.className = "cm-vim-panel"
  let cm = (view as EditorViewExtended).cm;
  cm.state.statusbar = dom
  cm.state.vimPlugin.updateStatus()
  return {dom}
}

export function vim(options: {status?: boolean} = {}): Extension {
  return [
    vimStyle,
    vimPlugin,
    hideNativeSelection,
    options.status ? showPanel.of(statusPanel): vimPanelState
  ]
}

export {CodeMirror, Vim}