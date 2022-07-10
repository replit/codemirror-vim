import { initVim as initVimInternal } from "../../src/vim.js";

export function initVim(CodeMirror5) {
  return CodeMirror5.Vim = initVimInternal(CodeMirror5);
}
