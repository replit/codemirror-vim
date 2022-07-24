var fs = require("fs");
var { rollup } = require('rollup');

rollup({
  input: "./index"
}).then(function(a) {
  return a.write({
    file: "./bin/.bundle.js",
    format: "es",
  });
}).then(function(a) {
  var bundle = fs.readFileSync("./bin/.bundle.js", "utf8");
  bundle = bundle.replace(/export {\s*initVim\s*};?/, "");

  bundle = `(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      mod(require("../lib/codemirror"), require("../addon/search/searchcursor"), require("../addon/dialog/dialog"), require("../addon/edit/matchbrackets.js"));
    else if (typeof define == "function" && define.amd) // AMD
      define(["../lib/codemirror", "../addon/search/searchcursor", "../addon/dialog/dialog", "../addon/edit/matchbrackets"], mod);
    else // Plain browser env
      mod(CodeMirror);
  })(function(CodeMirror) {
    'use strict';
  ` 
  + bundle + 
  `
    CodeMirror.Vim = initVim(CodeMirror);
  });
  `;

  fs.writeFileSync("vim.js", bundle, "utf8");
});


var test = fs.readFileSync("../../test/vim_test.js", "utf8");
test = test.replace(/export function/, "function") +  "\nvimTests(CodeMirror, test);";
fs.writeFileSync("vim_test.js", test, "utf8");

// update version
var version = require("../../../package.json").version;
var package = require("../package.json");
package.version = version;
fs.writeFileSync("./package.json", JSON.stringify(package, null, 2), "utf8");
