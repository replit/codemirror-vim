import { initVim } from "./vim";
import { CodeMirror } from "./cm_adapter";
import { BlockCursorPlugin, hideNativeSelection } from "./block-cursor";
import {
  Extension,
  StateField,
  StateEffect,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  ViewPlugin,
  PluginValue,
  ViewUpdate,
  Decoration,
  EditorView,
  showPanel,
  Panel,
} from "@codemirror/view";
import { setSearchQuery } from "@codemirror/search";

const Vim = initVim(CodeMirror);

const HighlightMargin = 250;

const vimStyle = EditorView.baseTheme({
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

  "&light .cm-searchMatch": { backgroundColor: "#ffff0054" },
  "&dark .cm-searchMatch": { backgroundColor: "#00ffff8a" },
});
type EditorViewExtended = EditorView & { cm: CodeMirror };

const vimPlugin = ViewPlugin.fromClass(
  class implements PluginValue {
    private dom: HTMLElement;
    public view: EditorViewExtended;
    public cm: CodeMirror;
    public status = "";
    blockCursor: BlockCursorPlugin;
    constructor(view: EditorView) {
      this.view = view as EditorViewExtended;
      const cm = (this.cm = new CodeMirror(view));
      Vim.enterVimMode(this.cm);

      this.view.cm = this.cm;
      this.cm.state.vimPlugin = this;

      this.blockCursor = new BlockCursorPlugin(view, cm);
      this.updateClass();

      this.cm.on("vim-command-done", () => {
        if (cm.state.vim) cm.state.vim.status = "";
        this.blockCursor.scheduleRedraw();
        this.updateStatus();
      });
      this.cm.on("vim-mode-change", (e: any) => {
        cm.state.vim.mode = e.mode;
        if (e.subMode) {
          cm.state.vim.mode += " block";
        }
        cm.state.vim.status = "";
        this.blockCursor.scheduleRedraw();
        this.updateClass();
        this.updateStatus();
      });

      this.cm.on("dialog", () => {
        if (this.cm.state.statusbar) {
          this.updateStatus();
        } else {
          view.dispatch({
            effects: showVimPanel.of(!!this.cm.state.dialog),
          });
        }
      });

      this.dom = document.createElement("span");
      this.dom.style.cssText = "position: absolute; right: 10px; top: 1px";
    }

    update(update: ViewUpdate) {
      if ((update.viewportChanged || update.docChanged) && this.query) {
        this.highlight(this.query);
      }
      if (update.docChanged) {
        this.cm.onChange(update);
      }
      if (update.selectionSet) {
        this.cm.onSelectionChange();
      }
      if (update.viewportChanged) {
        // scroll
      }
      if (this.cm.curOp && !this.cm.curOp.isVimOp) {
        this.cm.onBeforeEndOperation();
      }
      if (update.transactions) {
        for (let tr of update.transactions)
          for (let effect of tr.effects) {
            if (effect.is(setSearchQuery)) {
              let forVim = (effect.value as any)?.forVim;
              if (!forVim) {
                this.highlight(null);
              } else {
                let query = (effect.value as any).create();
                this.highlight(query);
              }
            }
          }
      }

      this.blockCursor.update(update);
    }
    updateClass() {
      const state = this.cm.state;
      if (!state.vim || (state.vim.insertMode && !state.overwrite))
        this.view.scrollDOM.classList.remove("cm-vimMode");
      else this.view.scrollDOM.classList.add("cm-vimMode");
    }
    updateStatus() {
      let dom = this.cm.state.statusbar;
      if (!dom) return;
      let dialog = this.cm.state.dialog;
      let vim = this.cm.state.vim;
      if (dialog) {
        if (dialog.parentElement != dom) {
          dom.textContent = "";
          dom.appendChild(dialog);
        }
      } else {
        dom.textContent = `--${(vim.mode || "normal").toUpperCase()}--`;
      }

      this.dom.textContent = vim.status;
      dom.appendChild(this.dom);
    }

    destroy() {
      this.cm.state.vim = null;
      this.updateClass();
      this.blockCursor.destroy();
      delete (this.view as any).cm;
    }

    highlight(query: any) {
      this.query = query;
      if (!query) return (this.decorations = Decoration.none);
      let { view } = this;
      let builder = new RangeSetBuilder<Decoration>();
      for (
        let i = 0, ranges = view.visibleRanges, l = ranges.length;
        i < l;
        i++
      ) {
        let { from, to } = ranges[i];
        while (i < l - 1 && to > ranges[i + 1].from - 2 * HighlightMargin)
          to = ranges[++i].to;
        query.highlight(
          view.state.doc,
          from,
          to,
          (from: number, to: number) => {
            builder.add(from, to, matchMark);
          }
        );
      }
      return (this.decorations = builder.finish());
    }
    query = null;
    decorations = Decoration.none;
  },
  {
    eventHandlers: {
      keydown: function (e: KeyboardEvent, view: EditorView) {
        const key = CodeMirror.vimKey(e);
        const cm = this.cm;
        if (!key) return;

        // clear search highlight
        let vim = cm.state.vim;
        if (
          key == "<Esc>" &&
          !vim.insertMode &&
          !vim.visualMode &&
          this.query /* && !cm.inMultiSelectMode*/
        ) {
          cm.removeOverlay(null);
        }

        cm.state.vim.status = (cm.state.vim.status || "") + key;
        let result = Vim.multiSelectHandleKey(cm, key, "user");

        // insert mode
        if (!result && cm.state.vim.insertMode && cm.state.overwrite) {
          if (e.key && e.key.length == 1 && !/\n/.test(e.key)) {
            result = true;
            cm.overWriteSelection(e.key);
          } else if (e.key == "Backspace") {
            result = true;
            CodeMirror.commands.cursorCharLeft(cm);
          }
        }
        if (result) {
          CodeMirror.signal(this.cm, 'vim-keypress', key);
          e.preventDefault();
          e.stopPropagation();
          this.blockCursor.scheduleRedraw();
        }

        this.updateStatus();

        return !!result;
      },
    },

    decorations: (v) => v.decorations,
  }
);

const matchMark = Decoration.mark({ class: "cm-searchMatch" });

const showVimPanel = StateEffect.define<boolean>();

const vimPanelState = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (let e of tr.effects) if (e.is(showVimPanel)) value = e.value;
    return value;
  },
  provide: (f) => {
    return showPanel.from(f, (on) => (on ? createVimPanel : null));
  },
});

function createVimPanel(view: EditorView) {
  let dom = document.createElement("div");
  dom.className = "cm-vim-panel";
  let cm = (view as EditorViewExtended).cm;
  if (cm.state.dialog) {
    dom.appendChild(cm.state.dialog);
  }
  return { top: false, dom };
}

function statusPanel(view: EditorView): Panel {
  let dom = document.createElement("div");
  dom.className = "cm-vim-panel";
  let cm = (view as EditorViewExtended).cm;
  cm.state.statusbar = dom;
  cm.state.vimPlugin.updateStatus();
  return { dom };
}

export function vim(options: { status?: boolean } = {}): Extension {
  return [
    vimStyle,
    vimPlugin,
    hideNativeSelection,
    options.status ? showPanel.of(statusPanel) : vimPanelState,
  ];
}

export { CodeMirror, Vim };

export function getCM(view: EditorView): CodeMirror | null {
  return (view as EditorViewExtended).cm || null;
}

