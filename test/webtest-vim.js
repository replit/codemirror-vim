import { EditorView, basicSetup } from "codemirror";
import { CodeMirror, Vim, vim } from "..";
import { xml } from "@codemirror/lang-xml";
import { javascript } from "@codemirror/lang-javascript";
import {vimTests} from "./vim_test.js"
import { indentUnit } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {indentWithTab} from "@codemirror/commands";
import { keymap } from "@codemirror/view";

/**@type {any}*/
var disabled = {
  vim_ex_set_filetype: 1,
  vim_ex_set_filetype_null: 1,

  vim_ex_global_substitute_join: 1,
  vim_ex_global_substitute_split: 1,

  vim_zb_to_bottom: 1,
  vim_zt_to_top: 1,
  "vim_zb<zz": 1,
};

describe("Vim extension", () => {
  /**@type {HTMLDivElement}*/
  var root;
  var Pos = CodeMirror.Pos;
  function addRoot() {
    if (!root) {
      root = document.createElement("div");
      root.id = "testground";
      root.style.height = "300px";
      root.style.position = "fixed";
      root.style.top = "100px";
      root.style.left = "200px";
      root.style.width = "500px";
    }
    document.body.appendChild(root);
  }
  addRoot();
  /**@type {EditorView|null}*/
  var lastView;
  function CM(place, options) {
    addRoot();
    if (lastView) lastView.destroy();

    var view = new EditorView({
      doc: options.value,
      extensions: [
        vim({}),
        basicSetup,
        options.mode == "xml" ? xml() : javascript(),
        EditorState.tabSize.of(options.tabSize || 4),
        indentUnit.of(
          options.indentWithTabs ? "\t" : " ".repeat(options.indentUnit || 2)
        ),
        options.lineWrapping && EditorView.lineWrapping,
        keymap.of([indentWithTab]),
    ].filter(Boolean),
      parent: root,
    });
    lastView = view;
    window.view = view;

    view.cm.getInputField()._handleInputEventForTest = function (text) {
      view.cm.replaceSelection(text);
    };

    view.dom.style.backgroundColor = "white";
    view.cm.setSize(420, 300);
    // without calling refresh cursor movement commands of codemirror 6 do not work
    view.cm.refresh();

    return view.cm;
  }

  CM.defineMode = () => {};
  CM.on = CodeMirror.on;
  CM.off = CodeMirror.off;
  CM.Vim = Vim;
  CM.Pos = function (a, b) {
    return new Pos(a, b);
  };
  CM.commands = CodeMirror.commands;
  // workaround for cm6 not indenting after unclosed {
  CM.commands.newlineAndIndent = function (cm) {
    var oldCursor = cm.getCursor();
    var oldLine = cm.getLine(oldCursor.line).slice(0, oldCursor.ch);
    var indent = /^\s*/.exec(oldLine)?.[0];
    if (/[{[(]$/.test(oldLine)) {
      if (cm.getOption("indentWithTabs")) {
        indent += "\t";
      } else {
        indent += " ".repeat(cm.getOption("indentUnit"));
      }
    }
    cm.replaceSelection("\n" + indent);
  };
  var onlyType = /\bonly=(\w+)\b/.exec(location.search)?.[1];
  /**
   * @param {string} name
   * @param {() => void} fn
   */
  function transformTest(name, fn) {
    if (disabled[name]) {
      return it.skip(name, function () {});
    }
    if (onlyType && localStorage[name] && localStorage[name] !== onlyType)
      return;
    return it(name, function () {
      if (onlyType) localStorage[name] = "fail";
      fn();
      if (onlyType) localStorage[name] = "pass";
      if (lastView) {
        // TODO without calling destroy old cm instances throw errors and break the test runner
        lastView.destroy();
        lastView = null;
      }
    });
  }
  vimTests(CM, transformTest);
});
