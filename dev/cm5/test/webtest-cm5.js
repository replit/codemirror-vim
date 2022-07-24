import { vimTests } from "../../../test/vim_test.js"
import "codemirror/lib/codemirror.js"
import "codemirror/addon/dialog/dialog.js"
import "codemirror/addon/search/searchcursor.js"
import "codemirror/addon/edit/matchbrackets.js"
import "codemirror/addon/fold/foldcode.js"
import "codemirror/addon/fold/xml-fold.js"
import "codemirror/addon/fold/brace-fold.js"
import "codemirror/addon/mode/simple.js"
import "codemirror/mode/css/css.js"
import "codemirror/mode/clike/clike.js"
import "codemirror/mode/xml/xml.js"

import "../vim.js"
function addStyleSheet(href) {
  var link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = "/cm5/node_modules/codemirror/" + href
  document.body.appendChild(link);
}
;[
  "lib/codemirror.css",
  "addon/dialog/dialog.css",
  "addon/fold/foldgutter.css"
].forEach(addStyleSheet)



var disabled = {};

describe("Vim CM5", () => {
  var onlyType, lastView

  function transformTest(name, fn) {
    if (disabled[name]) {
      return it.skip(name, function () { });
    }
    
    if (onlyType && localStorage[name] && localStorage[name] !== onlyType)
      return;
    return it(name, function () {
      var oldContainer = document.getElementById("testground");
      if (oldContainer) oldContainer.remove();
      var container = document.createElement("div");
      document.body.appendChild(container);
      container.id = "testground";

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
  vimTests(CodeMirror, transformTest);
});
