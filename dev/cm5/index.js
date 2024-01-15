import { initVim as initVimInternal } from "../../src/vim.js";

export function initVim(CodeMirror) {
  var Vim = CodeMirror.Vim = initVimInternal(CodeMirror);
  var Pos = CodeMirror.Pos;

  function transformCursor(cm, range) {
    var vim = cm.state.vim;
    if (!vim || vim.insertMode) return range.head;
    var head = vim.sel.head;
    if (!head)  return range.head;

    if (vim.visualBlock) {
      if (range.head.line != head.line) {
        return;
      }
    }
    if (range.from() == range.anchor && !range.empty()) {
      if (range.head.line == head.line && range.head.ch != head.ch)
        return new Pos(range.head.line, range.head.ch - 1);
    }

    return range.head;
  }

  CodeMirror.keyMap['vim-insert'] = {
    // TODO: override navigation keys so that Esc will cancel automatic
    // indentation from o, O, i_<CR>
    fallthrough: ['default'],
    attach: attachVimMap,
    detach: detachVimMap,
    call: cmKey
  };

  CodeMirror.keyMap['vim-replace'] = {
    'Backspace': 'goCharLeft',
    fallthrough: ['vim-insert'],
    attach: attachVimMap,
    detach: detachVimMap
  };


  CodeMirror.keyMap.vim = {
    attach: attachVimMap,
    detach: detachVimMap,
    call: cmKey
  };

  // Deprecated, simply setting the keymap works again.
  CodeMirror.defineOption('vimMode', false, function(cm, val, prev) {
    if (val && cm.getOption("keyMap") != "vim")
      cm.setOption("keyMap", "vim");
    else if (!val && prev != CodeMirror.Init && /^vim/.test(cm.getOption("keyMap")))
      cm.setOption("keyMap", "default");
  });

  function cmKey(key, cm) {
    if (!cm) { return undefined; }
    if (this[key]) { return this[key]; }
    var vimKey = cmKeyToVimKey(key);
    if (!vimKey) {
      return false;
    }
    var cmd = Vim.findKey(cm, vimKey);
    if (typeof cmd == 'function') {
      CodeMirror.signal(cm, 'vim-keypress', vimKey);
    }
    return cmd;
  }

  var modifiers = {Shift:'S',Ctrl:'C',Alt:'A',Cmd:'D',Mod:'A',CapsLock:''};
  var specialKeys = {Enter:'CR',Backspace:'BS',Delete:'Del',Insert:'Ins'};

  function cmKeyToVimKey(key) {
    if (key.charAt(0) == '\'') {
      // Keypress character binding of format "'a'"
      return key.charAt(1);
    }
    var pieces = key.split(/-(?!$)/);
    var lastPiece = pieces[pieces.length - 1];
    if (pieces.length == 1 && pieces[0].length == 1) {
      // No-modifier bindings use literal character bindings above. Skip.
      return false;
    } else if (pieces.length == 2 && pieces[0] == 'Shift' && lastPiece.length == 1) {
      // Ignore Shift+char bindings as they should be handled by literal character.
      return false;
    }
    var hasCharacter = false;
    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i];
      if (piece in modifiers) { pieces[i] = modifiers[piece]; }
      else { hasCharacter = true; }
      if (piece in specialKeys) { pieces[i] = specialKeys[piece]; }
    }
    if (!hasCharacter) {
      // Vim does not support modifier only keys.
      return false;
    }
    // TODO: Current bindings expect the character to be lower case, but
    // it looks like vim key notation uses upper case.
    if (/^[A-Z]$/.test(lastPiece))
      pieces[pieces.length - 1] = lastPiece.toLowerCase();

    return '<' + pieces.join('-') + '>';
  }

  function detachVimMap(cm, next) {
    if (this == CodeMirror.keyMap.vim) {
      cm.options.$customCursor = null;
      CodeMirror.rmClass(cm.getWrapperElement(), "cm-fat-cursor");
    }

    if (!next || next.attach != attachVimMap)
    Vim.leaveVimMode(cm);
  }
  function attachVimMap(cm, prev) {
    if (this == CodeMirror.keyMap.vim) {
      if (cm.curOp) cm.curOp.selectionChanged = true;
      cm.options.$customCursor = transformCursor;
      CodeMirror.addClass(cm.getWrapperElement(), "cm-fat-cursor");
    }

    if (!prev || prev.attach != attachVimMap)
    Vim.enterVimMode(cm);
  }

  return CodeMirror.Vim;
}
