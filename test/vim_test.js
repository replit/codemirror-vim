
export function vimTests(CodeMirror, test) {

function eqCursorPos(a, b) {
  if (a.line != b.line || a.ch != b.ch)
    throw failure(
      "Expected cursor position " +
       JSON.stringify([a.line, a.ch]) +
       " to be equal to " +
       JSON.stringify([b.line, b.ch]),
       eqCursorPos
      );
}
function eq(a, b, _reason) {
  if(a != b)
    throw failure("Expected " + a +  " to be equal to " + b, eq);
}
function is(a) {
  if (!a) throw failure("Expected " + a +  " to be truthy", is);
}
function failure(message, root) {
  var error = new Error(message);
  if (Error.captureStackTrace)
    Error.captureStackTrace(error, root);
  return error;
}

var Pos = CodeMirror.Pos;
CodeMirror.Vim.suppressErrorLogging = true;

var isOldCodeMirror = /^5\./.test(CodeMirror.version);

var code = '' +
' wOrd1 (#%\n' +
' word3] \n' +
'aopop pop 0 1 2 3 4\n' +
' (a) [b] {c} \n' +
'int getchar(void) {\n' +
'  static char buf[BUFSIZ];\n' +
'  static char *bufp = buf;\n' +
'  if (n == 0) {  /* buffer is empty */\n' +
'    n = read(0, buf, sizeof buf);\n' +
'    bufp = buf;\n' +
'  }\n' +
'\n' +
'  return (--n >= 0) ? (unsigned char) *bufp++ : EOF;\n' +
' \n' +
'}\n';

var lines = (function() {
  var lineText = code.split('\n');
  var ret = [];
  for (var i = 0; i < lineText.length; i++) {
    ret[i] = {
      line: i,
      length: lineText[i].length,
      lineText: lineText[i],
      textStart: /^\s*/.exec(lineText[i])[0].length
    };
  }
  return ret;
})();
var endOfDocument = makeCursor(lines.length - 1,
    lines[lines.length - 1].length);
var wordLine = lines[0];
var bigWordLine = lines[1];
var charLine = lines[2];
var bracesLine = lines[3];
var seekBraceLine = lines[4];
var foldingStart = lines[7];
var foldingEnd = lines[11];

var word1 = {
  start: new Pos(wordLine.line, 1),
  end: new Pos(wordLine.line, 5)
};
var word2 = {
  start: new Pos(wordLine.line, word1.end.ch + 2),
  end: new Pos(wordLine.line, word1.end.ch + 4)
};
var word3 = {
  start: new Pos(bigWordLine.line, 1),
  end: new Pos(bigWordLine.line, 5)
};
var bigWord1 = word1;
var bigWord2 = word2;
var bigWord3 = {
  start: new Pos(bigWordLine.line, 1),
  end: new Pos(bigWordLine.line, 7)
};
var bigWord4 = {
  start: new Pos(bigWordLine.line, bigWord1.end.ch + 3),
  end: new Pos(bigWordLine.line, bigWord1.end.ch + 7)
};

var oChars = [ new Pos(charLine.line, 1),
    new Pos(charLine.line, 3),
    new Pos(charLine.line, 7) ];
var pChars = [ new Pos(charLine.line, 2),
    new Pos(charLine.line, 4),
    new Pos(charLine.line, 6),
    new Pos(charLine.line, 8) ];
var numChars = [ new Pos(charLine.line, 10),
    new Pos(charLine.line, 12),
    new Pos(charLine.line, 14),
    new Pos(charLine.line, 16),
    new Pos(charLine.line, 18)];
var parens1 = {
  start: new Pos(bracesLine.line, 1),
  end: new Pos(bracesLine.line, 3)
};
var squares1 = {
  start: new Pos(bracesLine.line, 5),
  end: new Pos(bracesLine.line, 7)
};
var curlys1 = {
  start: new Pos(bracesLine.line, 9),
  end: new Pos(bracesLine.line, 11)
};
var seekOutside = {
  start: new Pos(seekBraceLine.line, 1),
  end: new Pos(seekBraceLine.line, 16)
};
var seekInside = {
  start: new Pos(seekBraceLine.line, 14),
  end: new Pos(seekBraceLine.line, 11)
};
var foldingRangeDown = {
  start: new Pos(foldingStart.line, 3),
  end: new Pos(foldingEnd.line, 0)
};
var foldingRangeUp = {
  start: new Pos(foldingEnd.line, 0),
  end: new Pos(foldingStart.line, 0)
};

function searchHighlighted(vim) {
  return vim.searchState_ && (vim.searchState_.getOverlay() || vim.searchState_.highlightTimeout);
}

function forEach(arr, func) {
  for (var i = 0; i < arr.length; i++) {
    func(arr[i], i, arr);
  }
}

function vimKeyToKeyName(key) {
  return key.replace(/[CS]-|CR|BS/g, function(part) {
    return {"C-": "Ctrl-", "S-": "Shift-", CR: "Return", BS: "Backspace"}[part];
  });
}

function testVim(name, run, opts, expectedFail) {
  var vimOpts = {
    lineNumbers: true,
    vimMode: true,
    showCursorWhenSelecting: true,
    value: code
  };
  for (var prop in opts) {
    if (opts.hasOwnProperty(prop)) {
      vimOpts[prop] = opts[prop];
    }
  }
  return test('vim_' + name, async function() {
    var place = document.getElementById("testground");
    place.style.visibility = "visible";
    var cm = CodeMirror(place, vimOpts);
    var vim = CodeMirror.Vim.maybeInitVimState_(cm);
    CodeMirror.Vim.mapclear();
    CodeMirror.Vim.langmap('');

    cm.focus();
    // workaround for cm5 slow polling in blurred window
    Object.defineProperty(cm.state, "focused", {
        set: function(e) {},
        get: function() {
            return document.activeElement == cm.getInputField();
        }
    });

    var helpers = {
      doKeys: function() {
        var args = arguments[0]
        if (!Array.isArray(args)) { args = arguments; }
        for (var i = 0; i < args.length; i++) {
          var key = args[i];
          if (key.length > 1 && key[0] == "<" && key.slice(-1) == ">") {
              key = vimKeyToKeyName(key.slice(1, -1));
          }
          typeKey(key);
        }
      },
      doEx: function(command) {
        helpers.doKeys(':', command, '\n');
      },
      assertCursorAt: function(line, ch) {
        var pos;
        if (ch == null && typeof line.line == 'number') {
          pos = line;
        } else {
          pos = makeCursor(line, ch);
        }
        eqCursorPos(cm.getCursor(), pos);
      },
      getRegisterController: function() {
        return CodeMirror.Vim.getRegisterController();
      },
      getNotificationText: function() {
        var container = cm.getWrapperElement().querySelector(".cm-vim-message");
        return container && container.textContent;
      }
    };
    CodeMirror.Vim.resetVimGlobalState_();
    var successful = false;
    try {
      await run(cm, vim, helpers);
      successful = true;
    } finally {
      if (successful && !window.verbose) {
        cm.getWrapperElement().remove();
      }
    }
  }, expectedFail);
};
testVim('qq@q', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'q', 'l', 'l', 'q');
  helpers.assertCursorAt(0,2);
  helpers.doKeys('@', 'q');
  helpers.assertCursorAt(0,4);
}, { value: '            '});
testVim('@@', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'q', 'l', 'l', 'q');
  helpers.assertCursorAt(0,2);
  helpers.doKeys('@', 'q');
  helpers.assertCursorAt(0,4);
  helpers.doKeys('@', '@');
  helpers.assertCursorAt(0,6);
}, { value: '            '});
var jumplistScene = ''+
  'word\n'+
  '(word)\n'+
  '{word\n'+
  'word.\n'+
  '\n'+
  'word search\n'+
  '}word\n'+
  'word\n'+
  'word\n';
function testJumplist(name, keys, endPos, startPos) {
  endPos = makeCursor(endPos[0], endPos[1]);
  startPos = makeCursor(startPos[0], startPos[1]);
  testVim(name, function(cm, vim, helpers) {
    CodeMirror.Vim.resetVimGlobalState_();
    cm.setCursor(startPos);
    helpers.doKeys.apply(null, keys);
    helpers.assertCursorAt(endPos);
  }, {value: jumplistScene});
}
testJumplist('jumplist_H', ['H', '<C-o>'], [5,2], [5,2]);
testJumplist('jumplist_M', ['M', '<C-o>'], [2,2], [2,2]);
testJumplist('jumplist_L', ['L', '<C-o>'], [2,2], [2,2]);
testJumplist('jumplist_[[', ['[', '[', '<C-o>'], [5,2], [5,2]);
testJumplist('jumplist_]]', [']', ']', '<C-o>'], [2,2], [2,2]);
testJumplist('jumplist_G', ['G', '<C-o>'], [5,2], [5,2]);
testJumplist('jumplist_gg', ['g', 'g', '<C-o>'], [5,2], [5,2]);
testJumplist('jumplist_%', ['%', '<C-o>'], [1,5], [1,5]);
testJumplist('jumplist_{', ['{', '<C-o>'], [1,5], [1,5]);
testJumplist('jumplist_}', ['}', '<C-o>'], [1,5], [1,5]);
testJumplist('jumplist_\'', ['m', 'a', 'h', '\'', 'a', 'h', '<C-i>'], [1,0], [1,5]);
testJumplist('jumplist_`', ['m', 'a', 'h', '`', 'a', 'h', '<C-i>'], [1,5], [1,5]);
testJumplist('jumplist_*_cachedCursor', ['*', '<C-o>'], [1,3], [1,3]);
testJumplist('jumplist_#_cachedCursor', ['#', '<C-o>'], [1,3], [1,3]);
testJumplist('jumplist_n', ['#', 'n', '<C-o>'], [1,1], [2,3]);
testJumplist('jumplist_N', ['#', 'N', '<C-o>'], [1,1], [2,3]);
testJumplist('jumplist_repeat_<c-o>', ['*', '*', '*', '3', '<C-o>'], [2,3], [2,3]);
testJumplist('jumplist_repeat_<c-i>', ['*', '*', '*', '3', '<C-o>', '2', '<C-i>'], [5,0], [2,3]);
testJumplist('jumplist_repeated_motion', ['3', '*', '<C-o>'], [2,3], [2,3]);
testJumplist('jumplist_/', ['/', 'dialog\n', '<C-o>'], [2,3], [2,3]);
testJumplist('jumplist_?', ['?', 'dialog\n', '<C-o>'], [2,3], [2,3]);
testJumplist('jumplist_skip_deleted_mark<c-o>',
             ['*', 'n', 'n', 'k', 'd', 'k', '<C-o>', '<C-o>', '<C-o>'],
             [0,2], [0,2]);
testJumplist('jumplist_skip_deleted_mark<c-i>',
             ['*', 'n', 'n', 'k', 'd', 'k', '<C-o>', '<C-i>', '<C-i>'],
             [1,0], [0,2]);

/**
 * @param name Name of the test
 * @param keys An array of keys or a string with a single key to simulate.
 * @param endPos The expected end position of the cursor.
 * @param startPos The position the cursor should start at, defaults to 0, 0.
 */
function testMotion(name, keys, endPos, startPos) {
  testVim(name, function(cm, vim, helpers) {
    if (!startPos) {
      startPos = new Pos(0, 0);
    }
    cm.setCursor(startPos);
    helpers.doKeys(keys);
    helpers.assertCursorAt(endPos);
  });
}

function testMotionWithFolding(name, keys, endPos, startPos) {
  testVim(name, function (cm, vim, helpers) {
    cm.foldCode(startPos);
    cm.foldCode(endPos);
    cm.setCursor(startPos);
    helpers.doKeys(keys);
    helpers.assertCursorAt(endPos)
  })
}

function makeCursor(line, ch) {
  return new Pos(line, ch);
}

function offsetCursor(cur, offsetLine, offsetCh) {
  return new Pos(cur.line + offsetLine, cur.ch + offsetCh);
}

// Motion tests
testMotion('|', '|', makeCursor(0, 0), makeCursor(0,4));
testMotion('|_repeat', ['3', '|'], makeCursor(0, 2), makeCursor(0,4));
testMotion('h', 'h', makeCursor(0, 0), word1.start);
testMotion('h_repeat', ['3', 'h'], offsetCursor(word1.end, 0, -3), word1.end);
testMotion('l', 'l', makeCursor(0, 1));
testMotion('Space', 'Space', makeCursor(0, 1));
testMotion('l_repeat', ['2', 'l'], makeCursor(0, 2));
testMotion('j', 'j', offsetCursor(word1.end, 1, 0), word1.end);
testMotion('j_repeat', ['2', 'j'], offsetCursor(word1.end, 2, 0), word1.end);
testMotion('j_repeat_clip', ['1000', 'j'], endOfDocument);
testMotion('k', 'k', offsetCursor(word3.end, -1, 0), word3.end);
testMotion('k_repeat', ['2', 'k'], makeCursor(0, 4), makeCursor(2, 4));
testMotion('k_repeat_clip', ['1000', 'k'], makeCursor(0, 4), makeCursor(2, 4));
testMotion('w', 'w', word1.start);
testMotion('keepHPos', ['5', 'j', 'j', '7', 'k'], makeCursor(8, 12), makeCursor(12, 12));
testMotion('keepHPosEol', ['$', '2', 'j'], makeCursor(2, 18));
testMotion('w_multiple_newlines_no_space', 'w', makeCursor(12, 2), makeCursor(11, 2));
testMotion('w_multiple_newlines_with_space', 'w', makeCursor(14, 0), makeCursor(12, 51));
testMotion('w_repeat', ['2', 'w'], word2.start);
testMotion('w_wrap', ['w'], word3.start, word2.start);
testMotion('w_endOfDocument', 'w', endOfDocument, endOfDocument);
testMotion('w_start_to_end', ['1000', 'w'], endOfDocument, makeCursor(0, 0));
testMotion('W', 'W', bigWord1.start);
testMotion('W_repeat', ['2', 'W'], bigWord3.start, bigWord1.start);
testMotion('e', 'e', word1.end);
testMotion('e_repeat', ['2', 'e'], word2.end);
testMotion('e_wrap', 'e', word3.end, word2.end);
testMotion('e_endOfDocument', 'e', endOfDocument, endOfDocument);
testMotion('e_start_to_end', ['1000', 'e'], endOfDocument, makeCursor(0, 0));
testMotion('b', 'b', word3.start, word3.end);
testMotion('b_repeat', ['2', 'b'], word2.start, word3.end);
testMotion('b_wrap', 'b', word2.start, word3.start);
testMotion('b_startOfDocument', 'b', makeCursor(0, 0), makeCursor(0, 0));
testMotion('b_end_to_start', ['1000', 'b'], makeCursor(0, 0), endOfDocument);
testMotion('ge', ['g', 'e'], word2.end, word3.end);
testMotion('ge_repeat', ['2', 'g', 'e'], word1.end, word3.start);
testMotion('ge_wrap', ['g', 'e'], word2.end, word3.start);
testMotion('ge_startOfDocument', ['g', 'e'], makeCursor(0, 0),
    makeCursor(0, 0));
testMotion('ge_end_to_start', ['1000', 'g', 'e'], makeCursor(0, 0), endOfDocument);
testMotion('gg', ['g', 'g'], makeCursor(lines[0].line, lines[0].textStart),
    makeCursor(3, 1));
testMotion('gg_repeat', ['3', 'g', 'g'],
    makeCursor(lines[2].line, lines[2].textStart));
testMotion('G', 'G',
    makeCursor(lines[lines.length - 1].line, lines[lines.length - 1].textStart),
    makeCursor(3, 1));
testMotion('G_repeat', ['3', 'G'], makeCursor(lines[2].line,
    lines[2].textStart));
// TODO: Make the test code long enough to test Ctrl-F and Ctrl-B.
testMotion('0', '0', makeCursor(0, 0), makeCursor(0, 8));
testMotion('^', '^', makeCursor(0, lines[0].textStart), makeCursor(0, 8));
testMotion('+', '+', makeCursor(1, lines[1].textStart), makeCursor(0, 8));
testMotion('-', '-', makeCursor(0, lines[0].textStart), makeCursor(1, 4));
testMotion('_', ['6','_'], makeCursor(5, lines[5].textStart), makeCursor(0, 8));
testMotion('$', '$', makeCursor(0, lines[0].length - 1), makeCursor(0, 1));
testMotion('$_repeat', ['2', '$'], makeCursor(1, lines[1].length - 1),
    makeCursor(0, 3));
testMotion('$', ['v', '$'], makeCursor(0, lines[0].length), makeCursor(0, 1));
testMotion('f', ['f', 'p'], pChars[0], makeCursor(charLine.line, 0));
testMotion('f_repeat', ['2', 'f', 'p'], pChars[2], pChars[0]);
testMotion('f_num', ['f', '2'], numChars[2], makeCursor(charLine.line, 0));
testMotion('f<S-Space>', ['f', '<S-Space>'], offsetCursor(word1.end, 0, 1), word1.start);
testMotion('t', ['t','p'], offsetCursor(pChars[0], 0, -1),
    makeCursor(charLine.line, 0));
testMotion('t_repeat', ['2', 't', 'p'], offsetCursor(pChars[2], 0, -1),
    pChars[0]);
testMotion('F', ['F', 'p'], pChars[0], pChars[1]);
testMotion('F_repeat', ['2', 'F', 'p'], pChars[0], pChars[2]);
testMotion('T', ['T', 'p'], offsetCursor(pChars[0], 0, 1), pChars[1]);
testMotion('T_repeat', ['2', 'T', 'p'], offsetCursor(pChars[0], 0, 1), pChars[2]);
testMotion('%_parens', ['%'], parens1.end, parens1.start);
testMotion('%_squares', ['%'], squares1.end, squares1.start);
testMotion('%_braces', ['%'], curlys1.end, curlys1.start);
testMotion('%_seek_outside', ['%'], seekOutside.end, seekOutside.start);
testMotion('%_seek_inside', ['%'], seekInside.end, seekInside.start);

// Motion with folding tests
testMotionWithFolding('j_with_folding', 'j', foldingRangeDown.end, foldingRangeDown.start);
testMotionWithFolding('k_with_folding', 'k', foldingRangeUp.end, foldingRangeUp.start);

testVim('%_seek_skip', function(cm, vim, helpers) {
  cm.setCursor(0,0);
  helpers.doKeys(['%']);
  helpers.assertCursorAt(0,9);
}, {value:'01234"("()'});
testVim('%_skip_string', function(cm, vim, helpers) {
  cm.setCursor(0,0);
  helpers.doKeys(['%']);
  helpers.assertCursorAt(0,4);
  cm.setCursor(0,2);
  helpers.doKeys(['%']);
  helpers.assertCursorAt(0,0);
}, {value:'(")")'});
testVim('%_skip_comment', function(cm, vim, helpers) {
  cm.setCursor(0,0);
  helpers.doKeys(['%']);
  helpers.assertCursorAt(0,6);
  cm.setCursor(0,3);
  helpers.doKeys(['%']);
  helpers.assertCursorAt(0,0);
}, {value:'(/*)*/)'});
// Make sure that moving down after going to the end of a line always leaves you
// at the end of a line, but preserves the offset in other cases
testVim('Changing lines after Eol operation', function(cm, vim, helpers) {
  cm.setCursor(0,0);
  helpers.doKeys(['$']);
  helpers.doKeys(['j']);
  // After moving to Eol and then down, we should be at Eol of line 2
  helpers.assertCursorAt(new Pos(1, lines[1].length - 1));
  helpers.doKeys(['j']);
  // After moving down, we should be at Eol of line 3
  helpers.assertCursorAt(new Pos(2, lines[2].length - 1));
  helpers.doKeys(['h']);
  helpers.doKeys(['j']);
  // After moving back one space and then down, since line 4 is shorter than line 2, we should
  // be at Eol of line 2 - 1
  helpers.assertCursorAt(new Pos(3, lines[3].length - 1));
  helpers.doKeys(['j']);
  helpers.doKeys(['j']);
  // After moving down again, since line 3 has enough characters, we should be back to the
  // same place we were at on line 1
  helpers.assertCursorAt(new Pos(5, lines[2].length - 2));
});
//making sure gj and gk recover from clipping
testVim('gj_gk_clipping', function(cm,vim,helpers){
  cm.setCursor(0, 1);
  helpers.doKeys('g','j','g','j');
  helpers.assertCursorAt(2, 1);
  helpers.doKeys('g','k','g','k');
  helpers.assertCursorAt(0, 1);
},{value: 'line 1\n\nline 2'});
//testing a mix of j/k and gj/gk
testVim('j_k_and_gj_gk', function(cm,vim,helpers){
  cm.setSize(120);
  cm.setCursor(0, 0);
  //go to the last character on the first line
  helpers.doKeys('$');
  //move up/down on the column within the wrapped line
  //side-effect: cursor is not locked to eol anymore
  helpers.doKeys('g','k');
  var cur=cm.getCursor();
  eq(cur.line,0);
  is((cur.ch<176),'gk didn\'t move cursor back (1)');
  helpers.doKeys('g','j');
  helpers.assertCursorAt(0, 176);
  //should move to character 177 on line 2 (j/k preserve character index within line)
  helpers.doKeys('j');
  //due to different line wrapping, the cursor can be on a different screen-x now
  //gj and gk preserve screen-x on movement, much like moveV
  helpers.doKeys('3','g','k');
  cur=cm.getCursor();
  eq(cur.line,1);
  is((cur.ch<176),'gk didn\'t move cursor back (2)');
  helpers.doKeys('g','j','2','g','j');
  //should return to the same character-index
  helpers.doKeys('k');
  helpers.assertCursorAt(0, 176);
},{ lineWrapping:true, value: 'This line is intentionally long. It tests movements of gj and gk over wrapped lines. Starts on the end of this line, then makes a step up and back to set the origin for j and k.\nThis line is supposed to be even longer than the previous. I will jump here and make another wiggle with gj and gk, before I jump back to the line above. Both wiggles should not change my cursor\'s target character but both j/k and gj/gk change each other\'s reference position.'});
testVim('gj_gk', function(cm, vim, helpers) {
  cm.setSize(120);
  // Test top of document edge case.
  cm.setCursor(0, 4);
  helpers.doKeys('g', 'j');
  helpers.doKeys('10', 'g', 'k');
  helpers.assertCursorAt(0, 4);

  // Test moving down preserves column position.
  helpers.doKeys('g', 'j');
  var pos1 = cm.getCursor();
  var expectedPos2 = new Pos(0, (pos1.ch - 4) * 2 + 4);
  helpers.doKeys('g', 'j');
  helpers.assertCursorAt(expectedPos2);

  // Move to the last character
  cm.setCursor(0, 0);
  // Move left to reset HSPos
  helpers.doKeys('h');
  // Test bottom of document edge case.
  helpers.doKeys('100', 'g', 'j');
  var endingPos = cm.getCursor();
  is(endingPos.ch != 0, 'gj should not be on wrapped line 0');
  var topLeftCharCoords = cm.charCoords(makeCursor(0, 0));
  var endingCharCoords = cm.charCoords(endingPos);
  is(topLeftCharCoords.left == endingCharCoords.left, 'gj should end up on column 0');
},{ lineNumbers: false, lineWrapping:true, value: 'Thislineisintentionallylongtotestmovementofgjandgkoverwrappedlines.' });
testVim('g0_g$', function(cm, vim, helpers) {
  cm.setSize(120);
  var topLeftCharCoords = cm.charCoords(makeCursor(0, 0));
  cm.setCursor(0, 4);
  helpers.doKeys('g', 'Down');
  var secondLineCoords = cm.charCoords(cm.getCursor());
  is(secondLineCoords.top > topLeftCharCoords.top);
  is(secondLineCoords.left > topLeftCharCoords.left);

  helpers.doKeys('g', '0');
  var start = cm.getCursor();
  var startCoords = cm.charCoords(start);
  is(start.ch != 0);
  is(startCoords.left == topLeftCharCoords.left);
  is(secondLineCoords.top === startCoords.top);
  is(secondLineCoords.left > startCoords.left);

  helpers.doKeys('g', '$');
  var end = cm.getCursor();
  var endCoords = cm.charCoords(end);
  is(startCoords.left < endCoords.left);
  is(startCoords.top == endCoords.top);
  is(start.ch < end.ch && end.ch < cm.getValue().length / 2);
  is(/\.$/.test(cm.getValue()));
  helpers.doKeys('$', 'g', '0', 'd', 'g', '$');
  is(!/\.$/.test(cm.getValue()));
  
},{ lineNumbers: false, lineWrapping:true, value: 'This line is long to test movement of g$ and g0 over wrapped lines.' });
testVim('}', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('}');
  helpers.assertCursorAt(1, 0);
  cm.setCursor(0, 0);
  helpers.doKeys('2', '}');
  helpers.assertCursorAt(4, 0);
  cm.setCursor(0, 0);
  helpers.doKeys('6', '}');
  helpers.assertCursorAt(5, 0);
}, { value: 'a\n\nb\nc\n\nd' });
testVim('{', function(cm, vim, helpers) {
  cm.setCursor(5, 0);
  helpers.doKeys('{');
  helpers.assertCursorAt(4, 0);
  cm.setCursor(5, 0);
  helpers.doKeys('2', '{');
  helpers.assertCursorAt(1, 0);
  cm.setCursor(5, 0);
  helpers.doKeys('6', '{');
  helpers.assertCursorAt(0, 0);
}, { value: 'a\n\nb\nc\n\nd' });
testVim('(', function(cm, vim, helpers) {
  cm.setCursor(6, 23);
  helpers.doKeys('(');
  helpers.assertCursorAt(6, 14);
  helpers.doKeys('2', '(');
  helpers.assertCursorAt(5, 0);
  helpers.doKeys('(');
  helpers.assertCursorAt(4, 0);
  helpers.doKeys('(');
  helpers.assertCursorAt(3, 0);
  helpers.doKeys('(');
  helpers.assertCursorAt(2, 0);
  helpers.doKeys('(');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('(');
  helpers.assertCursorAt(0, 0);
}, { value: 'sentence1.\n\n\nsentence2\n\nsentence3. sentence4\n   sentence5? sentence6!' });
testVim(')', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('2', ')');
  helpers.assertCursorAt(3, 0);
  helpers.doKeys(')');
  helpers.assertCursorAt(4, 0);
  helpers.doKeys(')');
  helpers.assertCursorAt(5, 0);
  helpers.doKeys(')');
  helpers.assertCursorAt(5, 11);
  helpers.doKeys(')');
  helpers.assertCursorAt(6, 14);
  helpers.doKeys(')');
  helpers.assertCursorAt(6, 23);
  helpers.doKeys(')');
  helpers.assertCursorAt(6, 23);
}, { value: 'sentence1.\n\n\nsentence2\n\nsentence3. sentence4\n   sentence5? sentence6!' });
testVim('paragraph_motions', function(cm, vim, helpers) {
  cm.setCursor(10, 0);
  helpers.doKeys('{');
  helpers.assertCursorAt(4, 0);
  helpers.doKeys('{');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('2', '}');
  helpers.assertCursorAt(7, 0);
  helpers.doKeys('2', '}');
  helpers.assertCursorAt(16, 0);

  cm.setCursor(9, 0);
  helpers.doKeys('}');
  helpers.assertCursorAt(14, 0);

  cm.setCursor(6, 0);
  helpers.doKeys('}');
  helpers.assertCursorAt(7, 0);

  // ip inside empty space
  cm.setCursor(10, 0);
  helpers.doKeys('v', 'i', 'p');
  eqCursorPos(new Pos(7, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(12, 0), cm.getCursor('head'));
  helpers.doKeys('i', 'p');
  eqCursorPos(new Pos(7, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(13, 1), cm.getCursor('head'));
  helpers.doKeys('2', 'i', 'p');
  eqCursorPos(new Pos(7, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(16, 1), cm.getCursor('head'));

  // should switch to visualLine mode
  cm.setCursor(14, 0);
  helpers.doKeys('<Esc>', 'v', 'i', 'p');
  helpers.assertCursorAt(14, 0);

  cm.setCursor(14, 0);
  helpers.doKeys('<Esc>', 'V', 'i', 'p');
  eqCursorPos(new Pos(16, 1), cm.getCursor('head'));

  // ap inside empty space
  cm.setCursor(10, 0);
  helpers.doKeys('<Esc>', 'v', 'a', 'p');
  eqCursorPos(new Pos(7, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(13, 1), cm.getCursor('head'));
  helpers.doKeys('a', 'p');
  eqCursorPos(new Pos(7, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(16, 1), cm.getCursor('head'));

  cm.setCursor(13, 0);
  helpers.doKeys('v', 'a', 'p');
  eqCursorPos(new Pos(13, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(14, 0), cm.getCursor('head'));

  cm.setCursor(16, 0);
  helpers.doKeys('v', 'a', 'p');
  eqCursorPos(new Pos(14, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(16, 1), cm.getCursor('head'));

  cm.setCursor(0, 0);
  helpers.doKeys('v', 'a', 'p');
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(4, 0), cm.getCursor('head'));

  cm.setCursor(0, 0);
  helpers.doKeys('d', 'i', 'p');
  var register = helpers.getRegisterController().getRegister();
  eq('a\na\n', register.toString());
  is(register.linewise);
  helpers.doKeys('3', 'j', 'p');
  helpers.doKeys('y', 'i', 'p');
  is(register.linewise);
  eq('b\na\na\nc\n', register.toString());
}, { value: 'a\na\n\n\n\nb\nc\n\n\n\n\n\n\nd\n\ne\nf' });

testVim('sentence_selections', function(cm, vim, helpers) {
  // vis at beginning of line
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'i', 's');
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(0, 14), cm.getCursor('head'));

  // vas at beginning of line
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'a', 's');
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(0, 15), cm.getCursor('head'));

  // vis on sentence end
  cm.setCursor(0, 13);
  helpers.doKeys('v', 'i', 's');
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(0, 14), cm.getCursor('head'));

  // vas on sentence end
  cm.setCursor(0, 13);
  helpers.doKeys('v', 'a', 's');
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  eqCursorPos(new Pos(0, 15), cm.getCursor('head'));

  // vis at sentence end, no whitespace after it
  cm.setCursor(1, 18);
  helpers.doKeys('v', 'i', 's');
  eqCursorPos(new Pos(1, 13), cm.getCursor('anchor'));
  eqCursorPos(new Pos(1, 19), cm.getCursor('head'));

  // vas at sentence end, no whitespace after it
  cm.setCursor(1, 18);
  helpers.doKeys('v', 'a', 's');
  eqCursorPos(new Pos(1, 12), cm.getCursor('anchor'));
  eqCursorPos(new Pos(1, 19), cm.getCursor('head'));

  // vis at sentence beginning, on whitespace
  cm.setCursor(0, 14);
  helpers.doKeys('v', 'i', 's');
  eqCursorPos(new Pos(0, 14), cm.getCursor('anchor'));
  eqCursorPos(new Pos(0, 29), cm.getCursor('head'));

  cm.setCursor(0, 0);
  helpers.doKeys('d', 'i', 's');
  var register = helpers.getRegisterController().getRegister();
  eq('Test sentence.', register.toString());

  // return to original value
  helpers.doKeys('u')

  cm.setCursor(0, 0);
  helpers.doKeys('d', 'a', 's');
  register = helpers.getRegisterController().getRegister();
  eq('Test sentence. ', register.toString());

  // return to original value
  helpers.doKeys('u')

  cm.setCursor(1, 20);
  helpers.doKeys('c', 'a', 's', '<Esc>');
  register = helpers.getRegisterController().getRegister();
  eq('Test.', register.toString());

  // return to original value
  helpers.doKeys('u')

  cm.setCursor(3, 11);
  helpers.doKeys('y', 'a', 's');
  register = helpers.getRegisterController().getRegister();
  eq('This is more text. ', register.toString());

  cm.setCursor(3, 31);
  helpers.doKeys('y', 'a', 's');
  register = helpers.getRegisterController().getRegister();
  eq(' No end of sentence symbol', register.toString());

}, { value: 'Test sentence. Test question?\nAgain.Never. Again.Test.\n\nHello. This is more text. No end of sentence symbol\n' });

testVim('w_text_object_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('v', '3', 'a', 'w');
  eq('w1  ++  w_2   ', cm.getSelection());
  helpers.doKeys('<Esc>', 'v', 'a', 'w');
  eq('   \n w3', cm.getSelection());
  
  helpers.doKeys('2', 'a', 'w');
  eq('   \n w3   xx \n', cm.getSelection());
  helpers.doKeys('a', 'w');
  eq('   \n w3   xx \n\nw4', cm.getSelection());

  cm.setValue("  w0 word1  word2  word3    word4")
  cm.setCursor(0, 8);
  helpers.doKeys('c', '3', 'a', 'w');
  eq('  w0 word4', cm.getValue());
}, { value: ' w1  ++  w_2   \n w3   xx \n\nw4\nword5\nword6' });

// Operator tests
testVim('dl', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 0);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'l');
  eq('word1 ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' ', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1 ' });
testVim('dl_eol', function(cm, vim, helpers) {
  cm.setCursor(0, 6);
  helpers.doKeys('d', 'l');
  eq(' word1', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' ', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 5);
}, { value: ' word1 ' });
testVim('dl_repeat', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 0);
  cm.setCursor(curStart);
  helpers.doKeys('2', 'd', 'l');
  eq('ord1 ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' w', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1 ' });
testVim('dh', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'h');
  eq(' wrd1 ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('o', register.toString());
  is(!register.linewise);
  eqCursorPos(offsetCursor(curStart, 0 , -1), cm.getCursor());
}, { value: ' word1 ' });
testVim('dj', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'j');
  eq(' word3', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' word1\nword2\n', register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, 1);
}, { value: ' word1\nword2\n word3' });
testVim('dj_end_of_document', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'j');
  eq('', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' word1 \n', register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1 ' });
testVim('dk', function(cm, vim, helpers) {
  var curStart = makeCursor(1, 3);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'k');
  eq(' word3', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' word1\nword2\n', register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, 1);
}, { value: ' word1\nword2\n word3' });
testVim('dk_start_of_document', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'k');
  eq('', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' word1 \n', register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1 ' });
testVim('dw_space', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 0);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'w');
  eq('word1 ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' ', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1 ' });
testVim('dw_word', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 1);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'w');
  eq(' word2', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1 ', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1 word2' });
testVim('dw_unicode_word', function(cm, vim, helpers) {
  helpers.doKeys('d', 'w');
  eq(cm.getValue().length, 10);
  helpers.doKeys('d', 'w');
  eq(cm.getValue().length, 6);
  helpers.doKeys('d', 'w');
  eq(cm.getValue().length, 5);
  helpers.doKeys('d', 'e');
  eq(cm.getValue().length, 2);
}, { value: '  \u0562\u0561\u0580\u0587\xbbe\xb5g  ' });
testVim('dw_only_word', function(cm, vim, helpers) {
  // Test that if there is only 1 word left, dw deletes till the end of the
  // line.
  cm.setCursor(0, 1);
  helpers.doKeys('d', 'w');
  eq(' ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1 ', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1 ' });
testVim('dw_eol', function(cm, vim, helpers) {
  // Assert that dw does not delete the newline if last word to delete is at end
  // of line.
  cm.setCursor(0, 1);
  helpers.doKeys('d', 'w');
  eq(' \nword2', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1\nword2' });
testVim('dw_eol_with_multiple_newlines', function(cm, vim, helpers) {
  // Assert that dw does not delete the newline if last word to delete is at end
  // of line and it is followed by multiple newlines.
  cm.setCursor(0, 1);
  helpers.doKeys('d', 'w');
  eq(' \n\nword2', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1\n\nword2' });
testVim('dw_empty_line_followed_by_whitespace', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('  \nword', cm.getValue());
}, { value: '\n  \nword' });
testVim('dw_empty_line_followed_by_word', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('word', cm.getValue());
}, { value: '\nword' });
testVim('dw_empty_line_followed_by_empty_line', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('\n', cm.getValue());
}, { value: '\n\n' });
testVim('dw_whitespace_followed_by_whitespace', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('\n   \n', cm.getValue());
}, { value: '  \n   \n' });
testVim('dw_whitespace_followed_by_empty_line', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('\n\n', cm.getValue());
}, { value: '  \n\n' });
testVim('dw_word_whitespace_word', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'w');
  eq('\n   \nword2', cm.getValue());
}, { value: 'word1\n   \nword2'})
testVim('dw_end_of_document', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('d', 'w');
  eq('\nab', cm.getValue());
}, { value: '\nabc' });
testVim('dw_repeat', function(cm, vim, helpers) {
  // Assert that dw does delete newline if it should go to the next line, and
  // that repeat works properly.
  cm.setCursor(0, 1);
  helpers.doKeys('d', '2', 'w');
  eq(' ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1\nword2', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 0);
}, { value: ' word1\nword2' });
testVim('de_word_start_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'e');
  eq('\n\n', cm.getValue());
}, { value: 'word\n\n' });
testVim('de_word_end_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('d', 'e');
  eq('wor', cm.getValue());
}, { value: 'word\n\n\n' });
testVim('de_whitespace_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'e');
  eq('', cm.getValue());
}, { value: '   \n\n\n' });
testVim('de_end_of_document', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('d', 'e');
  eq('\nab', cm.getValue());
}, { value: '\nabc' });
testVim('db_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('d', 'b');
  eq('\n\n', cm.getValue());
}, { value: '\n\n\n' });
testVim('db_word_start_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('d', 'b');
  eq('\nword', cm.getValue());
}, { value: '\n\nword' });
testVim('db_word_end_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(2, 3);
  helpers.doKeys('d', 'b');
  eq('\n\nd', cm.getValue());
}, { value: '\n\nword' });
testVim('db_whitespace_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('d', 'b');
  eq('', cm.getValue());
}, { value: '\n   \n' });
testVim('db_start_of_document', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'b');
  eq('abc\n', cm.getValue());
}, { value: 'abc\n' });
testVim('dge_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doKeys('d', 'g', 'e');
  // Note: In real VIM the result should be '', but it's not quite consistent,
  // since 2 newlines are deleted. But in the similar case of word\n\n, only
  // 1 newline is deleted. We'll diverge from VIM's behavior since it's much
  // easier this way.
  eq('\n', cm.getValue());
}, { value: '\n\n' });
testVim('dge_word_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doKeys('d', 'g', 'e');
  eq('wor\n', cm.getValue());
}, { value: 'word\n\n'});
testVim('dge_whitespace_and_empty_lines', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('d', 'g', 'e');
  eq('', cm.getValue());
}, { value: '\n  \n' });
testVim('dge_start_of_document', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('d', 'g', 'e');
  eq('bc\n', cm.getValue());
}, { value: 'abc\n' });
testVim('d_inclusive', function(cm, vim, helpers) {
  // Assert that when inclusive is set, the character the cursor is on gets
  // deleted too.
  var curStart = makeCursor(0, 1);
  cm.setCursor(curStart);
  helpers.doKeys('d', 'e');
  eq('  ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1 ' });
testVim('d_reverse', function(cm, vim, helpers) {
  // Test that deleting in reverse works.
  cm.setCursor(1, 0);
  helpers.doKeys('d', 'b');
  eq(' word2 ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1\n', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 1);
}, { value: ' word1\nword2 ' });
testVim('dd', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(1, 0));
  var expectedLineCount = cm.lineCount() - 1;
  helpers.doKeys('d', 'd');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[1].textStart);
});
testVim('dd_prefix_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(2, 0));
  var expectedLineCount = cm.lineCount() - 2;
  helpers.doKeys('2', 'd', 'd');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[2].textStart);
});
testVim('dd_motion_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(2, 0));
  var expectedLineCount = cm.lineCount() - 2;
  helpers.doKeys('d', '2', 'd');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[2].textStart);
});
testVim('dd_multiply_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(6, 0));
  var expectedLineCount = cm.lineCount() - 6;
  helpers.doKeys('2', 'd', '3', 'd');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[6].textStart);
});
testVim('dd_lastline', function(cm, vim, helpers) {
  cm.setCursor(cm.lineCount(), 0);
  var expectedLineCount = cm.lineCount() - 1;
  helpers.doKeys('d', 'd');
  eq(expectedLineCount, cm.lineCount());
  helpers.assertCursorAt(cm.lineCount() - 1, 0);
});
testVim('dd_only_line', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  var expectedRegister = cm.getValue() + "\n";
  helpers.doKeys('d','d');
  eq(1, cm.lineCount());
  eq('', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedRegister, register.toString());
}, { value: "thisistheonlyline" });
testVim('cG', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('c', 'G', 'inserted');
  eq('inserted', cm.getValue());
  helpers.assertCursorAt(0, 8);
  cm.setValue("    indented\nlines");
  helpers.doKeys('<Esc>', 'c', 'G', 'inserted');
  eq('    inserted', cm.getValue());
}, { value: 'line1\nline2\n'});
// Yank commands should behave the exact same as d commands, expect that nothing
// gets deleted.
testVim('yw_repeat', function(cm, vim, helpers) {
  // Assert that yw does yank newline if it should go to the next line, and
  // that repeat works properly.
  var curStart = makeCursor(0, 1);
  cm.setCursor(curStart);
  helpers.doKeys('y', '2', 'w');
  eq(' word1\nword2', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1\nword2', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1\nword2' });
testVim('yy_multiply_repeat', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(6, 0));
  var expectedLineCount = cm.lineCount();
  helpers.doKeys('2', 'y', '3', 'y');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  eqCursorPos(curStart, cm.getCursor());
});
testVim('2dd_blank_P', function(cm, vim, helpers) {
  helpers.doKeys('2', 'd', 'd', 'P');
  eq('\na\n\n', cm.getValue());
}, { value: '\na\n\n' });
// Change commands behave like d commands except that it also enters insert
// mode. In addition, when the change is linewise, an additional newline is
// inserted so that insert mode starts on that line.
testVim('cw', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('c', '2', 'w');
  eq(' word3', cm.getValue());
  helpers.assertCursorAt(0, 0);
}, { value: 'word1 word2 word3'});
testVim('cw_repeat', function(cm, vim, helpers) {
  // Assert that cw does delete newline if it should go to the next line, and
  // that repeat works properly.
  var curStart = makeCursor(0, 1);
  cm.setCursor(curStart);
  helpers.doKeys('c', '2', 'w');
  eq(' ', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1\nword2', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: ' word1\nword2' });
testVim('cc_multiply_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(6, 0));
  var expectedLineCount = cm.lineCount() - 5;
  helpers.doKeys('2', 'c', '3', 'c');
  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('ct', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('c', 't', 'w');
  eq('  word1  word3', cm.getValue());
  helpers.doKeys('<Esc>', 'c', '|');
  eq(' word3', cm.getValue());
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('<Esc>', '2', 'u', 'w', 'h');
  helpers.doKeys('c', '2', 'g', 'e');
  eq('  wordword3', cm.getValue());
}, { value: '  word1  word2  word3'});
testVim('cc_should_not_append_to_document', function(cm, vim, helpers) {
  var expectedLineCount = cm.lineCount();
  cm.setCursor(cm.lastLine(), 0);
  helpers.doKeys('c', 'c');
  eq(expectedLineCount, cm.lineCount());
});
function fillArray(val, times) {
  var arr = [];
  for (var i = 0; i < times; i++) {
    arr.push(val);
  }
  return arr;
}
testVim('c_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'l', 'l', 'c');
  helpers.doKeys('hello');
  eq('1hello\n5hello\nahellofg', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(2, 3);
  helpers.doKeys('<C-v>', '2', 'k', 'h', 'C');
  helpers.doKeys('world');
  eq('1hworld\n5hworld\nahworld', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});
testVim('c_visual_block_replay', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'c');
  helpers.doKeys('fo');
  eq('1fo4\n5fo8\nafodefg', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(0, 0);
  helpers.doKeys('.');
  eq('foo4\nfoo8\nfoodefg', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});
testVim('I_visual_block_replay', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'I');
  helpers.doKeys('+-')
  eq('12+-34\n56+-78\nab+-cdefg\nxyz', cm.getValue());
  helpers.doKeys('<Esc>');
  // ensure that repeat location doesn't depend on last selection
  cm.setCursor(3, 2);
  helpers.doKeys('g', 'v')
  eq("+-34\n+-78\n+-cd", cm.getSelection())
  cm.setCursor(0, 3);
  helpers.doKeys('<C-v>', '1', 'j', '2', 'l');
  eq("-34\n-78", cm.getSelection());
  cm.setCursor(0, 0);
  eq("", cm.getSelection());
  helpers.doKeys('g', 'v');
  eq("-34\n-78", cm.getSelection());
  cm.setCursor(1, 1);
  helpers.doKeys('.');
  eq('12+-34\n5+-6+-78\na+-b+-cdefg\nx+-yz', cm.getValue());
}, {value: '1234\n5678\nabcdefg\nxyz'});

testVim('visual_block_backwards', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('3', 'l');
  helpers.doKeys('<C-v>', '2', 'j', '2', '<Left>');
  eq('123\n678\nbcd', cm.getSelection());
  helpers.doKeys('A');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('A', '<Esc>');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('g', 'v');
  eq('123\n678\nbcd', cm.getSelection());
  helpers.doKeys('x');
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('g', 'v');
  eq('A4 \nA9 \nAef', cm.getSelection());
}, {value: '01234 line 1\n56789 line 2\nabcdefg line 3\nline 4'});

testVim('d_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'l', 'l', 'd');
  eq('1\n5\nafg', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});
testVim('D_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'D');
  eq('1\n5\na', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});

testVim('s_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'l', 'l', 's');
  helpers.doKeys('hello{');
  eq('1hello{\n5hello{\nahello{fg\n', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(2, 3);
  helpers.doKeys('<C-v>', '1', 'k', 'h', 'S');
  helpers.doKeys('world');
  eq('1hello{\n  world\n', cm.getValue());
}, {value: '1234\n5678\nabcdefg\n'});

// Test mode change event. It should only fire once per mode transition.
testVim('on_mode_change', async function(cm, vim, helpers) {
  var modeHist = [];
  function callback(arg) {
    var subMode = arg.subMode ? ':' + arg.subMode : '';
    modeHist.push(arg.mode + subMode);
  }
  helpers.doKeys('<Esc>', '<Esc>');
  cm.on('vim-mode-change', callback);
  async function test(key, mode) {
    modeHist.length = 0;
    helpers.doKeys(key);
    if (key == '<C-c>' && !isOldCodeMirror)
      await delay(0);
    eq(modeHist.join(';'), mode);
  }
  test('v', 'visual');
  test('c', 'insert');
  test('<Esc>', 'normal');
  test('<C-v>', 'visual:blockwise');
  test('I', 'insert');
  test('<Esc>', 'normal');
  test('R', 'replace');
  test('x', '');
  test('<C-[>', 'normal');
  test('v', 'visual');
  test('V', 'visual:linewise');
  test('<C-v>', 'visual:blockwise');
  test('v', 'visual');
  await test('<C-c>', 'normal');
  test('a', 'insert');
  test('<Esc>', 'normal');
  test('v', 'visual');
  test(':', ''); // Event for Command-line mode not implemented.
  test('y\n', 'normal');
  test(":startinsert\n", "insert");
});

// Swapcase commands edit in place and do not modify registers.
testVim('g~w_repeat', function(cm, vim, helpers) {
  // Assert that dw does delete newline if it should go to the next line, and
  // that repeat works properly.
  var curStart = makeCursor(0, 1);
  cm.setCursor(curStart);
  helpers.doKeys('g', '~', '2', 'w');
  eq(' WORD1\nWORD2', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1\nword2' });
testVim('g~g~', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  var expectedLineCount = cm.lineCount();
  var expectedValue = cm.getValue().toUpperCase();
  helpers.doKeys('2', 'g', '~', '3', 'g', '~');
  eq(expectedValue, cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
}, { value: ' word1\nword2\nword3\nword4\nword5\nword6' });
testVim('gu_and_gU', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 7);
  var value = cm.getValue();
  cm.setCursor(curStart);
  helpers.doKeys('2', 'g', 'U', 'w');
  eq(cm.getValue(), 'wa wb xX WC wd');
  eqCursorPos(curStart, cm.getCursor());
  helpers.doKeys('2', 'g', 'u', 'w');
  eq(cm.getValue(), value);

  helpers.doKeys('2', 'g', 'U', 'B');
  eq(cm.getValue(), 'wa WB Xx wc wd');
  eqCursorPos(makeCursor(0, 3), cm.getCursor());

  cm.setCursor(makeCursor(0, 4));
  helpers.doKeys('g', 'u', 'i', 'w');
  eq(cm.getValue(), 'wa wb Xx wc wd');
  eqCursorPos(makeCursor(0, 3), cm.getCursor());

  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);

  cm.setCursor(curStart);
  cm.setValue('abc efg\nxyz');
  helpers.doKeys('g', 'U', 'g', 'U');
  eq(cm.getValue(), 'ABC EFG\nxyz');
  helpers.doKeys('g', 'u', 'u');
  eq(cm.getValue(), 'abc efg\nxyz');
  eqCursorPos(makeCursor(0, 0), cm.getCursor());
  helpers.doKeys('g', 'U', '2', 'U');
  eq(cm.getValue(), 'ABC EFG\nXYZ');
}, { value: 'wa wb xx wc wd' });
testVim('g?', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 7);
  var value = cm.getValue();
  cm.setCursor(curStart);
  helpers.doKeys('2', 'g', '?', 'w');
  eq(cm.getValue(), 'wa wb xk jp wd');
  eqCursorPos(curStart, cm.getCursor());
  helpers.doKeys('2', 'g', '?', 'w');
  eq(cm.getValue(), value);

  helpers.doKeys('2', 'g', '?', 'B');
  eq(cm.getValue(), 'wa jo kx wc wd');
  eqCursorPos(makeCursor(0, 3), cm.getCursor());

  cm.setCursor(makeCursor(0, 4));
  helpers.doKeys('g', '?', 'i', 'w');
  eq(cm.getValue(), 'wa wb kx wc wd');
  eqCursorPos(makeCursor(0, 3), cm.getCursor());

  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  
  cm.setCursor(curStart);
  cm.setValue('abc efg();\nxyz');
  helpers.doKeys('g', '?', 'g', '?');
  eq(cm.getValue(), 'nop rst();\nxyz');
  helpers.doKeys('g', '?', '?');
  eq(cm.getValue(), 'abc efg();\nxyz');
  eqCursorPos(makeCursor(0, 0), cm.getCursor());
  helpers.doKeys('g', '?', '2', '?');
  eq(cm.getValue(), 'nop rst();\nklm');

  cm.setCursor(curStart);
  cm.setValue('hello\nworld');
  helpers.doKeys('l','<C-v>','l','j','g','?');
  eq(cm.getValue(), 'hrylo\nwbeld');
}, { value: 'wa wb xx wc wd' });
testVim('visual_block_~', function(cm, vim, helpers) {
  cm.setCursor(1, 1);
  helpers.doKeys('<C-v>', 'l', 'l', 'j', '~');
  helpers.assertCursorAt(1, 1);
  eq('hello\nwoRLd\naBCDe', cm.getValue());
  cm.setCursor(2, 0);
  helpers.doKeys('v', 'l', 'l', '~');
  helpers.assertCursorAt(2, 0);
  eq('hello\nwoRLd\nAbcDe', cm.getValue());
},{value: 'hello\nwOrld\nabcde' });
testVim('._swapCase_visualBlock', function(cm, vim, helpers) {
  helpers.doKeys('<C-v>', 'j', 'j', 'l', '~');
  cm.setCursor(0, 3);
  helpers.doKeys('.');
  eq('HelLO\nWorLd\nAbcdE', cm.getValue());
},{value: 'hEllo\nwOrlD\naBcDe' });
testVim('._delete_visualBlock', function(cm, vim, helpers) {
  helpers.doKeys('<C-v>', 'j', 'x');
  eq('ive\ne\nsome\nsugar', cm.getValue());
  helpers.doKeys('.');
  eq('ve\n\nsome\nsugar', cm.getValue());
  helpers.doKeys('j', 'j', '.');
  eq('ve\n\nome\nugar', cm.getValue());
  helpers.doKeys('u');
  if (!isOldCodeMirror) helpers.assertCursorAt(2, 0);
  eq('ve\n\nsome\nsugar', cm.getValue());
  helpers.doKeys('<C-r>');
  helpers.assertCursorAt(2, 0);
  eq('ve\n\nome\nugar', cm.getValue());
  helpers.doKeys('.');
  helpers.assertCursorAt(2, 0);
  eq('ve\n\nme\ngar', cm.getValue());
},{value: 'give\nme\nsome\nsugar' });
testVim('>{motion}', function(cm, vim, helpers) {
  cm.setCursor(1, 3);
  var expectedLineCount = cm.lineCount();
  var expectedValue = '   word1\n  word2\nword3 ';
  helpers.doKeys('>', 'k');
  eq(expectedValue, cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 3);
}, { value: ' word1\nword2\nword3 ', indentUnit: 2 });
testVim('>>', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedLineCount = cm.lineCount();
  var expectedValue = '   word1\n  word2\nword3 ';
  helpers.doKeys('2', '>', '>');
  eq(expectedValue, cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 3);
}, { value: ' word1\nword2\nword3 ', indentUnit: 2 });
testVim('<{motion}', function(cm, vim, helpers) {
  cm.setCursor(1, 3);
  var expectedLineCount = cm.lineCount();
  var expectedValue = ' word1\nword2\nword3 ';
  helpers.doKeys('<', 'k');
  eq(expectedValue, cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 1);
}, { value: '   word1\n  word2\nword3 ', indentUnit: 2 });
testVim('<<', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedLineCount = cm.lineCount();
  var expectedValue = ' word1\nword2\nword3 ';
  helpers.doKeys('2', '<', '<');
  eq(expectedValue, cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 1);
}, { value: '   word1\n  word2\nword3 ', indentUnit: 2 });
testVim('=', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('<C-v>', 'j', 'j');
  var expectedValue = 'word1\nword2\nword3';
  helpers.doKeys('=');
  eq(expectedValue, cm.getValue());
}, { value: '   word1\n  word2\n  word3', indentUnit: 2 });
testVim('><visualblock', function(cm, vim, helpers) {
  cm.setCursor(0, 6);
  helpers.doKeys('<C-v>', 'j', 'j');
  helpers.doKeys('4', '>');
  eq('  word        1\n  word        2\n  word        3', cm.getValue());
  helpers.doKeys('g', 'v', '14', '<');
  eq('  word1\n  word2\n  word3', cm.getValue());
}, { value: '  word1\n  word2\n  word3', indentUnit: 2 });


// Edit tests
function testEdit(name, before, pos, edit, after, opts) {
  if (!opts) opts = {};
  opts.value = before;
  return testVim(name, function(cm, vim, helpers) {
             var ch = before.search(pos)
             var line = before.substring(0, ch).split('\n').length - 1;
             if (line) {
               ch = before.substring(0, ch).split('\n').pop().length;
             }
             cm.setCursor(line, ch);
             helpers.doKeys.apply(this, edit.split(''));
             eq(after, cm.getValue());
           }, opts);
}

// These Delete tests effectively cover word-wise Change, Visual & Yank.
// Tabs are used as differentiated whitespace to catch edge cases.
// Normal word:
testEdit('diw_mid_spc', 'foo \tbAr\t baz', /A/, 'diw', 'foo \t\t baz');
testEdit('daw_mid_spc', 'foo \tbAr\t baz', /A/, 'daw', 'foo \tbaz');
testEdit('diw_mid_punct', 'foo \tbAr.\t baz', /A/, 'diw', 'foo \t.\t baz');
testEdit('daw_mid_punct', 'foo \tbAr.\t baz', /A/, 'daw', 'foo.\t baz');
testEdit('diw_mid_punct2', 'foo \t,bAr.\t baz', /A/, 'diw', 'foo \t,.\t baz');
testEdit('daw_mid_punct2', 'foo \t,bAr.\t baz', /A/, 'daw', 'foo \t,.\t baz');
testEdit('diw_start_spc', 'bAr \tbaz', /A/, 'diw', ' \tbaz');
testEdit('daw_start_spc', 'bAr \tbaz', /A/, 'daw', 'baz');
testEdit('diw_start_punct', 'bAr. \tbaz', /A/, 'diw', '. \tbaz');
testEdit('daw_start_punct', 'bAr. \tbaz', /A/, 'daw', '. \tbaz');
testEdit('diw_end_spc', 'foo \tbAr', /A/, 'diw', 'foo \t');
testEdit('daw_end_spc', 'foo \tbAr', /A/, 'daw', 'foo');
testEdit('diw_end_punct', 'foo \tbAr.', /A/, 'diw', 'foo \t.');
testEdit('daw_end_punct', 'foo \tbAr.', /A/, 'daw', 'foo.');
testEdit('diw_space_word1', 'foo \t\n\tbar.', /\t/, 'diw', 'foo\n\tbar.');
testEdit('diw_space_word2', 'foo +bar.', / /, 'diw', 'foo+bar.');
testEdit('diw_space_word3', ' foo bar.', / /, 'diw', 'foo bar.');
// Big word:
testEdit('diW_mid_spc', 'foo \tbAr\t baz', /A/, 'diW', 'foo \t\t baz');
testEdit('daW_mid_spc', 'foo \tbAr\t baz', /A/, 'daW', 'foo \tbaz');
testEdit('diW_mid_punct', 'foo \tbAr.\t baz', /A/, 'diW', 'foo \t\t baz');
testEdit('daW_mid_punct', 'foo \tbAr.\t baz', /A/, 'daW', 'foo \tbaz');
testEdit('diW_mid_punct2', 'foo \t,bAr.\t baz', /A/, 'diW', 'foo \t\t baz');
testEdit('daW_mid_punct2', 'foo \t,bAr.\t baz', /A/, 'daW', 'foo \tbaz');
testEdit('diW_start_spc', 'bAr\t baz', /A/, 'diW', '\t baz');
testEdit('daW_start_spc', 'bAr\t baz', /A/, 'daW', 'baz');
testEdit('diW_start_punct', 'bAr.\t baz', /A/, 'diW', '\t baz');
testEdit('daW_start_punct', 'bAr.\t baz', /A/, 'daW', 'baz');
testEdit('diW_end_spc', 'foo \tbAr', /A/, 'diW', 'foo \t');
testEdit('daW_end_spc', 'foo \tbAr', /A/, 'daW', 'foo');
testEdit('diW_end_punct', 'foo \tbAr.', /A/, 'diW', 'foo \t');
testEdit('daW_end_punct', 'foo \tbAr.', /A/, 'daW', 'foo');
testEdit('diW_space_word2', 'foo +bar.', / /, 'diW', 'foo+bar.');
// Deleting text objects
//    Open and close on same line
testEdit('di(_open_spc', 'foo (bAr) baz', /\(/, 'di(', 'foo () baz');
testEdit('di)_open_spc', 'foo (bAr) baz', /\(/, 'di)', 'foo () baz');
testEdit('dib_open_spc', 'foo (bAr) baz', /\(/, 'dib', 'foo () baz');
testEdit('da(_open_spc', 'foo (bAr) baz', /\(/, 'da(', 'foo  baz');
testEdit('da)_open_spc', 'foo (bAr) baz', /\(/, 'da)', 'foo  baz');

testEdit('di(_middle_spc', 'foo (bAr) baz', /A/, 'di(', 'foo () baz');
testEdit('di)_middle_spc', 'foo (bAr) baz', /A/, 'di)', 'foo () baz');
testEdit('da(_middle_spc', 'foo (bAr) baz', /A/, 'da(', 'foo  baz');
testEdit('da)_middle_spc', 'foo (bAr) baz', /A/, 'da)', 'foo  baz');

testEdit('di(_close_spc', 'foo (bAr) baz', /\)/, 'di(', 'foo () baz');
testEdit('di)_close_spc', 'foo (bAr) baz', /\)/, 'di)', 'foo () baz');
testEdit('da(_close_spc', 'foo (bAr) baz', /\)/, 'da(', 'foo  baz');
testEdit('da)_close_spc', 'foo (bAr) baz', /\)/, 'da)', 'foo  baz');

testEdit('di`', 'foo `bAr` baz', /`/, 'di`', 'foo `` baz');
testEdit('di>', 'foo <bAr> baz', /</, 'di>', 'foo <> baz');
testEdit('da<', 'foo <bAr> baz', /</, 'da<', 'foo  baz');

//  delete around and inner b.
testEdit('dab_on_(_should_delete_around_()block', 'o( in(abc) )', /\(a/, 'dab', 'o( in )');

//  delete around and inner B.
testEdit('daB_on_{_should_delete_around_{}block', 'o{ in{abc} }', /{a/, 'daB', 'o{ in }');
testEdit('diB_on_{_should_delete_inner_{}block', 'o{ in{abc} }', /{a/, 'diB', 'o{ in{} }');

testEdit('da{_on_{_should_delete_inner_block', 'o{ in{abc} }', /{a/, 'da{', 'o{ in }');
testEdit('di[_on_(_should_not_delete', 'foo (bAr) baz', /\(/, 'di[', 'foo (bAr) baz');
testEdit('di[_on_)_should_not_delete', 'foo (bAr) baz', /\)/, 'di[', 'foo (bAr) baz');
testEdit('da[_on_(_should_not_delete', 'foo (bAr) baz', /\(/, 'da[', 'foo (bAr) baz');
testEdit('da[_on_)_should_not_delete', 'foo (bAr) baz', /\)/, 'da[', 'foo (bAr) baz');
testMotion('di(_outside_should_stay', ['d', 'i', '('], new Pos(0, 0), new Pos(0, 0));

//  Open and close on different lines, equally indented
testEdit('di{_middle_spc', 'a{\n\tbar\n}b', /r/, 'di{', 'a{}b');
testEdit('di}_middle_spc', 'a{\n\tbar\n}b', /r/, 'di}', 'a{}b');
testEdit('da{_middle_spc', 'a{\n\tbar\n}b', /r/, 'da{', 'ab');
testEdit('da}_middle_spc', 'a{\n\tbar\n}b', /r/, 'da}', 'ab');
testEdit('daB_middle_spc', 'a{\n\tbar\n}b', /r/, 'daB', 'ab');

// open and close on diff lines, open indented less than close
testEdit('di{_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'di{', 'a{}b');
testEdit('di}_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'di}', 'a{}b');
testEdit('da{_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'da{', 'ab');
testEdit('da}_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'da}', 'ab');

// open and close on diff lines, open indented more than close
testEdit('di[_middle_spc', 'a\t[\n\tbar\n]b', /r/, 'di[', 'a\t[]b');
testEdit('di]_middle_spc', 'a\t[\n\tbar\n]b', /r/, 'di]', 'a\t[]b');
testEdit('da[_middle_spc', 'a\t[\n\tbar\n]b', /r/, 'da[', 'a\tb');
testEdit('da]_middle_spc', 'a\t[\n\tbar\n]b', /r/, 'da]', 'a\tb');

// open and close on diff lines, open indented more than close
testEdit('di<_middle_spc', 'a\t<\n\tbar\n>b', /r/, 'di<', 'a\t<>b');
testEdit('di>_middle_spc', 'a\t<\n\tbar\n>b', /r/, 'di>', 'a\t<>b');
testEdit('da<_middle_spc', 'a\t<\n\tbar\n>b', /r/, 'da<', 'a\tb');
testEdit('da>_middle_spc', 'a\t<\n\tbar\n>b', /r/, 'da>', 'a\tb');

// deleting tag objects
testEdit('dat_noop', '<outer><inner>hello</inner></outer>', /n/, 'dat', '<outer><inner>hello</inner></outer>');
testEdit('dat_open_tag', '<outer><inner>hello</inner></outer>', /n/, 'dat', '<outer></outer>', {
  mode: 'xml'
});
testEdit('dat_inside_tag', '<outer><inner>hello</inner></outer>', /l/, 'dat', '<outer></outer>', {
  mode: 'xml'
});
testEdit('dat_close_tag', '<outer><inner>hello</inner></outer>', /\//, 'dat', '<outer></outer>', {
  mode: 'xml'
});

testEdit('dit_open_tag', '<outer><inner>hello</inner></outer>', /n/, 'dit', '<outer><inner></inner></outer>', {
  mode: 'xml'
});
testEdit('dit_inside_tag', '<outer><inner>hello</inner></outer>', /l/, 'dit', '<outer><inner></inner></outer>', {
  mode: 'xml'
});
testEdit('dit_close_tag', '<outer><inner>hello</inner></outer>', /\//, 'dit', '<outer><inner></inner></outer>', {
  mode: 'xml'
});

function testSelection(name, before, pos, keys, sel) {
  return testVim(name, function(cm, vim, helpers) {
             var ch = before.search(pos)
             var line = before.substring(0, ch).split('\n').length - 1;
             if (line) {
               ch = before.substring(0, ch).split('\n').pop().length;
             }
             cm.setCursor(line, ch);
             helpers.doKeys.apply(this, keys.split(''));
             eq(sel, cm.getSelection());
           }, {value: before});
}
testSelection('viw_middle_spc', 'foo \tbAr\t baz', /A/, 'viw', 'bAr');
testSelection('vaw_middle_spc', 'foo \tbAr\t baz', /A/, 'vaw', 'bAr\t ');
testSelection('viw_middle_punct', 'foo \tbAr,\t baz', /A/, 'viw', 'bAr');
testSelection('vaW_middle_punct', 'foo \tbAr,\t baz', /A/, 'vaW', 'bAr,\t ');
testSelection('viw_start_spc', 'foo \tbAr\t baz', /b/, 'viw', 'bAr');
testSelection('viw_end_spc', 'foo \tbAr\t baz', /r/, 'viw', 'bAr');
testSelection('viw_eol', 'foo \tbAr', /r/, 'viw', 'bAr');
testSelection('vi{_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'vi{', '\n\tbar\n\t');
testSelection('va{_middle_spc', 'a{\n\tbar\n\t}b', /r/, 'va{', '{\n\tbar\n\t}');
testSelection('va{outside', 'xa{\n\tbar\n\t}b', /x/, 'va{', '{\n\tbar\n\t}');

testVim('ci" for two strings', function(cm, vim, helpers) {
  cm.setCursor(0, 11);
  helpers.doKeys('c', 'i', '"');
  eq('   "":  "string2";', cm.getValue());
  helpers.doKeys('<Esc>', 'u', 'f', '"', '<Right>');
  helpers.doKeys('c', 'i', '"');
  eq('   "string1""string2";', cm.getValue());
  helpers.doKeys('<Esc>', 'u', 'f', '"');
  helpers.doKeys('c', 'i', '"');
  eq('   "string1":  "";', cm.getValue());
}, {value: '   "string1":  "string2";'});

testVim('mouse_select', function(cm, vim, helpers) {
  cm.setSelection(new Pos(0, 2), new Pos(0, 4), {origin: '*mouse'});
  is(cm.state.vim.visualMode);
  is(!cm.state.vim.visualLine);
  is(!cm.state.vim.visualBlock);
  helpers.doKeys('<Esc>');
  is(!cm.somethingSelected());
  helpers.doKeys('g', 'v');
  eq('cd', cm.getSelection());
}, {value: 'abcdef'});

// Operator-motion tests
testVim('D', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('D');
  eq(' wo\nword2\n word3', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('rd1', register.toString());
  is(!register.linewise);
  helpers.assertCursorAt(0, 2);
}, { value: ' word1\nword2\n word3' });
testVim('C', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('C');
  eq(' wo\nword2\n word3', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('rd1', register.toString());
  is(!register.linewise);
  eqCursorPos(curStart, cm.getCursor());
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: ' word1\nword2\n word3' });
testVim('Y', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('Y');
  eq(' word1\nword2\n word3', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq(' word1\n', register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, 3);
}, { value: ' word1\nword2\n word3' });
testVim('Yy_blockwise', function(cm, vim, helpers) {
  helpers.doKeys('<C-v>', 'j', '2', 'l', 'Y');
  helpers.doKeys('G', 'p', 'g', 'g');
  helpers.doKeys('<C-v>', 'j', '2', 'l', 'y');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('$', 'p');
  eq('123456123\n123456123\n123456\n123456', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('123\n123', register.toString());
  is(register.blockwise);
  helpers.assertCursorAt(0, 6);
  helpers.doKeys('$', 'j', 'p');
  helpers.doKeys('$', 'j', 'P');
  eq("123456123\n123456123123\n123456   121233\n123456     123", cm.getValue());
}, { value: '123456\n123456\n' });
testVim('~', function(cm, vim, helpers) {
  helpers.doKeys('3', '~');
  eq('ABCdefg', cm.getValue());
  helpers.assertCursorAt(0, 3);
}, { value: 'abcdefg' });

// Action tests
testVim('ctrl-a', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('-9', cm.getValue());
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('2','<C-a>');
  eq('-7', cm.getValue());
}, {value: '-10'});
testVim('ctrl-x', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-x>');
  eq('-1', cm.getValue());
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('2','<C-x>');
  eq('-3', cm.getValue());
}, {value: '0'});
testVim('<C-x>/<C-a> search forward', function(cm, vim, helpers) {
  forEach(['<C-x>', '<C-a>'], function(key) {
    cm.setCursor(0, 0);
    helpers.doKeys(key);
    helpers.assertCursorAt(0, 5);
    helpers.doKeys('l');
    helpers.doKeys(key);
    helpers.assertCursorAt(0, 10);
    cm.setCursor(0, 11);
    helpers.doKeys(key);
    helpers.assertCursorAt(0, 11);
  });
}, {value: '__jmp1 jmp2 jmp'});
testVim('insert_ctrl_o', function(cm, vim, helpers) {
  helpers.doKeys('i');
  is(vim.insertMode);
  helpers.doKeys('<C-o>');
  is(!vim.insertMode);
  helpers.doKeys('3', 'w');
  is(vim.insertMode);
  eqCursorPos(makeCursor(0, 14), cm.getCursor());
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'one two three here' });
testVim('insert_ctrl_u', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 10);
  cm.setCursor(curStart);
  helpers.doKeys('a');
  helpers.doKeys('<C-u>');
  eq('', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word1/word2', register.toString());
  is(!register.linewise);
  var curEnd = makeCursor(0, 0);
  eqCursorPos(curEnd, cm.getCursor());
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'word1/word2' });
testVim('insert_ctrl_w', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 10);
  cm.setCursor(curStart);
  helpers.doKeys('a');
  helpers.doKeys('<C-w>');
  eq('word1/', cm.getValue());
  var register = helpers.getRegisterController().getRegister();
  eq('word2', register.toString());
  is(!register.linewise);
  var curEnd = makeCursor(0, 6);
  eqCursorPos(curEnd, cm.getCursor());
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'word1/word2' });
testVim('normal_ctrl_w', function(cm, vim, helpers) {
  var curStart = makeCursor(0, 3);
  cm.setCursor(curStart);
  helpers.doKeys('<C-w>');
  eq('word', cm.getValue());
  var curEnd = makeCursor(0, 3);
  helpers.assertCursorAt(0,3);
  eqCursorPos(curEnd, cm.getCursor());
  eq('vim', cm.getOption('keyMap'));
}, {value: 'word'});
testVim('a', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('a');
  helpers.assertCursorAt(0, 2);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('a_eol', function(cm, vim, helpers) {
  cm.setCursor(0, lines[0].length - 1);
  helpers.doKeys('a');
  helpers.assertCursorAt(0, lines[0].length);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('a with surrogate characters', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('a');
  helpers.doKeys('test');
  helpers.doKeys('<Esc>');
  eq('😀test', cm.getValue());
}, {value: '😀'});
testVim('A_endOfSelectedArea', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'j', 'l');
  helpers.doKeys('A');
  helpers.assertCursorAt(1, 2);
  eq('vim-insert', cm.getOption('keyMap'));
}, {value: 'foo\nbar'});
testVim('i', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('i');
  helpers.assertCursorAt(0, 1);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('i with surrogate characters', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('i');
  helpers.doKeys('test');
  helpers.doKeys('<Esc>');
  eq('test😀', cm.getValue());
}, { value: '😀' });
testVim('i_repeat', function(cm, vim, helpers) {
  helpers.doKeys('3', 'i');
  helpers.doKeys('test')
  helpers.doKeys('<Esc>');
  eq('testtesttest', cm.getValue());
  helpers.assertCursorAt(0, 11);
}, { value: '' });
testVim('i_repeat_delete', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('2', 'i');
  helpers.doKeys('z')
  helpers.doKeys('Backspace', 'Backspace');
  helpers.doKeys('<Esc>');
  eq('abe', cm.getValue());
  helpers.assertCursorAt(0, 1);
}, { value: 'abcde' });
testVim('insert', function(cm, vim, helpers) {
  helpers.doKeys('i');
  eq('vim-insert', cm.getOption('keyMap'));
  eq(false, cm.state.overwrite);
  helpers.doKeys('<Ins>');
  eq('vim-replace', cm.getOption('keyMap'));
  eq(true, cm.state.overwrite);
  helpers.doKeys('<Ins>');
  eq('vim-insert', cm.getOption('keyMap'));
  eq(false, cm.state.overwrite);
});
testVim('i_backspace', function(cm, vim, helpers) {
  cm.setCursor(0, 10);
  helpers.doKeys('i');
  helpers.doKeys('Backspace');
  helpers.assertCursorAt(0, 9);
  eq('012345678', cm.getValue());
}, { value: '0123456789'});
testVim('i_overwrite_backspace', function(cm, vim, helpers) {
  cm.setCursor(0, 10);
  helpers.doKeys('i');
  helpers.doKeys('<Ins>');
  helpers.doKeys('Backspace');
  helpers.assertCursorAt(new Pos(0, 9, "after"));
  eq('0123456789', cm.getValue());
}, { value: '0123456789'});
testVim('i_forward_delete', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('i');
  helpers.doKeys('Delete');
  helpers.assertCursorAt(0, 3);
  eq('A124\nBCD', cm.getValue());
  helpers.doKeys('Delete');
  helpers.assertCursorAt(0, 3);
  eq('A12\nBCD', cm.getValue());
  helpers.doKeys('Delete');
  helpers.assertCursorAt(0, 3);
  eq('A12BCD', cm.getValue());
}, { value: 'A1234\nBCD'});
testVim('forward_delete', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('<Del>');
  helpers.assertCursorAt(0, 3);
  eq('A124\nBCD', cm.getValue());
  helpers.doKeys('<Del>');
  helpers.assertCursorAt(0, 2);
  eq('A12\nBCD', cm.getValue());
  helpers.doKeys('<Del>');
  helpers.assertCursorAt(0, 1);
  eq('A1\nBCD', cm.getValue());
}, { value: 'A1234\nBCD'});
testVim('A', function(cm, vim, helpers) {
  helpers.doKeys('A');
  helpers.assertCursorAt(0, lines[0].length);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('A_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'l', 'A');
  helpers.doKeys('hello');
  eq('testhello\nmehello\npleahellose', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(0, 0);
  helpers.doKeys('.');
  // TODO this doesn't work yet
  // eq('teshellothello\nme hello hello\nplehelloahellose', cm.getValue());
}, {value: 'test\nme\nplease'});
testVim('I', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('I');
  helpers.assertCursorAt(0, lines[0].textStart);
  eq('vim-insert', cm.getOption('keyMap'));
});
testVim('I_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('3', 'I');
  helpers.doKeys('test')
  helpers.doKeys('<Esc>');
  eq('testtesttestblah', cm.getValue());
  helpers.assertCursorAt(0, 11);
}, { value: 'blah' });
testVim('I_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'l', 'I');
  helpers.doKeys('hello');
  eq('hellotest\nhellome\nhelloplease', cm.getValue());
}, {value: 'test\nme\nplease'});
testVim('o', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('o');
  eq('word1\n\nword2', cm.getValue());
  helpers.assertCursorAt(1, 0);
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'word1\nword2' });
testVim('o_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('3', 'o');
  helpers.doKeys('test')
  helpers.doKeys('<Esc>');
  eq('\ntest\ntest\ntest', cm.getValue());
  helpers.assertCursorAt(3, 3);
}, { value: '' });
testVim('O', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('O');
  eq('\nword1\nword2', cm.getValue());
  helpers.assertCursorAt(0, 0);
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'word1\nword2' });
testVim('J', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('J');
  var expectedValue = 'word1  word2\nword3\n word4';
  eq(expectedValue, cm.getValue());
  helpers.assertCursorAt(0, expectedValue.indexOf('word2') - 1);
}, { value: 'word1 \n    word2\nword3\n word4' });
testVim('J_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('3', 'J');
  var expectedValue = 'word1  word2 word3\n word4';
  eq(expectedValue, cm.getValue());
  helpers.assertCursorAt(0, expectedValue.indexOf('word3') - 1);
}, { value: 'word1 \n    word2\nword3\n word4' });
testVim('gJ', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('g', 'J');
  eq('word1word2 \n word3', cm.getValue());
  helpers.assertCursorAt(0, 5);
  helpers.doKeys('g', 'J');
  eq('word1word2  word3', cm.getValue());
  helpers.assertCursorAt(0, 11);
}, { value: 'word1\nword2 \n word3' });
testVim('gi', function(cm, vim, helpers) {
  cm.setCursor(1, 5);
  helpers.doKeys('g', 'I');
  helpers.doKeys('a', 'a', '<Esc>', 'k');
  eq('12\naa  xxxx', cm.getValue());
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('g', 'i');
  helpers.assertCursorAt(1, 2);
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: '12\n  xxxx' });
testVim('p', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().pushText('"', 'yank', 'abc\ndef', false);
  helpers.doKeys('p');
  eq('__abc\ndef_', cm.getValue());
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('y', 'e', 'p');
  eq('__aabcbc\ndef_', cm.getValue());
  helpers.assertCursorAt(0, 5);
  helpers.doKeys('u');
  // helpers.assertCursorAt(0, 2); // TODO  undo should return  to the same position

}, { value: '___' });
testVim('p_register', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().getRegister('a').setText('abc\ndef', false);
  helpers.doKeys('"', 'a', 'p');
  eq('__abc\ndef_', cm.getValue());
  helpers.assertCursorAt(0, 2);
}, { value: '___' });
testVim('p_wrong_register', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().getRegister('a').setText('abc\ndef', false);
  helpers.doKeys('p');
  eq('___', cm.getValue());
  helpers.assertCursorAt(0, 1);
}, { value: '___' });
testVim('p_line', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().pushText('"', 'yank', '  a\nd\n', true);
  helpers.doKeys('2', 'p');
  eq('___\n  a\nd\n  a\nd', cm.getValue());
  helpers.assertCursorAt(1, 2);
}, { value: '___' });
testVim('p_lastline', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().pushText('"', 'yank', '  a\nd', true);
  helpers.doKeys('2', 'p');
  eq('___\n  a\nd\n  a\nd', cm.getValue());
  helpers.assertCursorAt(1, 2);
}, { value: '___' });
testVim(']p_first_indent_is_smaller', function(cm, vim, helpers) {
  helpers.getRegisterController().pushText('"', 'yank', '  abc\n    def\n', true);
  helpers.doKeys(']', 'p');
  eq('  ___\n  abc\n    def', cm.getValue());
}, { value: '  ___' });
testVim(']p_first_indent_is_larger', function(cm, vim, helpers) {
  helpers.getRegisterController().pushText('"', 'yank', '    abc\n  def\n', true);
  helpers.doKeys(']', 'p');
  eq('  ___\n  abc\ndef', cm.getValue());
}, { value: '  ___' });
testVim(']p_with_tab_indents', function(cm, vim, helpers) {
  helpers.getRegisterController().pushText('"', 'yank', '\t\tabc\n\t\t\tdef\n', true);
  helpers.doKeys(']', 'p');
  eq('\t___\n\tabc\n\t\tdef', cm.getValue());
}, { value: '\t___', indentWithTabs: true});
testVim(']p_with_spaces_translated_to_tabs', function(cm, vim, helpers) {
  helpers.getRegisterController().pushText('"', 'yank', '  abc\n    def\n', true);
  helpers.doKeys(']', 'p');
  eq('\t___\n\tabc\n\t\tdef', cm.getValue());
}, { value: '\t___', indentWithTabs: true, tabSize: 2 });
testVim('[p', function(cm, vim, helpers) {
  helpers.getRegisterController().pushText('"', 'yank', '  abc\n    def\n', true);
  helpers.doKeys('[', 'p');
  eq('  abc\n    def\n  ___', cm.getValue());
}, { value: '  ___' });
testVim('P', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().pushText('"', 'yank', 'abc\ndef', false);
  helpers.doKeys('P');
  eq('_abc\ndef__', cm.getValue());
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('y', 'e', 'P');
  eq('_abcabc\ndef__', cm.getValue());
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('u');
  // helpers.assertCursorAt(0, 1); // TODO  undo should return  to the same position
}, { value: '___' });
testVim('P_line', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.getRegisterController().pushText('"', 'yank', '  a\nd\n', true);
  helpers.doKeys('2', 'P');
  eq('  a\nd\n  a\nd\n___', cm.getValue());
  helpers.assertCursorAt(0, 2);
}, { value: '___' });
testVim('r', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('3', 'r', 'u');
  eq('wuuuet\nanother', cm.getValue(),'3r failed');
  helpers.assertCursorAt(0, 3);
  cm.setCursor(0, 4);
  helpers.doKeys('v', 'j', 'h', 'r', '<Space>');
  eq('wuuu  \n    her', cm.getValue(),'Replacing selection by space-characters failed');
  cm.setValue("ox");
  helpers.doKeys('r', '<C-c>');
  eq('ox', cm.getValue());
  helpers.doKeys('r', '<Del>');
  eq('ox', cm.getValue());
  helpers.doKeys('r', '<CR>');
  eq('\nx', cm.getValue());
}, { value: 'wordet\nanother' });
testVim('r with surrogate characters', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('r', 'u');
  eq('u', cm.getValue());
}, { value: '😀' });
testVim('r_visual_block', function(cm, vim, helpers) {
  cm.setCursor(2, 3);
  helpers.doKeys('<C-v>', 'k', 'k', 'h', 'h', 'r', 'l');
  eq('1lll\n5lll\nalllefg', cm.getValue());
  helpers.doKeys('<C-v>', 'l', 'j', 'r', '<Space>');
  eq('1  l\n5  l\nalllefg', cm.getValue());
  cm.setCursor(2, 0);
  helpers.doKeys('o');
  helpers.doKeys('\t\t');
  helpers.doKeys('<Esc>');
  helpers.doKeys('<C-v>', 'h', 'h', 'r', 'r');
  eq('1  l\n5  l\nalllefg\nrrrrrrrr', cm.getValue());
}, {value: '1234\n5678\nabcdefg', indentWithTabs: true});
testVim('r_visual with surrogate characters', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'r', 'u');
  eq('u', cm.getValue());
}, { value: '😀' });
testVim('r_visual_block with surrogate characters', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', 'r', 'u');
  eq('u', cm.getValue());
}, { value: '😀' });
testVim('R', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('R');
  helpers.assertCursorAt(0, 1);
  eq('vim-replace', cm.getOption('keyMap'));
  is(cm.state.overwrite, 'Setting overwrite state failed');
});
testVim('R_visual', function(cm, vim, helpers) {
  helpers.doKeys('<C-v>', 'j', 'R', '0', '<Esc>');
  eq('0\nb33\nc44\nc55', cm.getValue());
  helpers.doKeys('2', 'j', '.');
  eq('0\nb33\n0', cm.getValue());
  helpers.doKeys('k', 'v', 'R', '1', '<Esc>');
  eq('0\n1\n0', cm.getValue());
  helpers.doKeys('k', '.');
  eq('1\n1\n0', cm.getValue());
  helpers.doKeys('p');
  eq('1\n0\n1\n0', cm.getValue());
}, {value: 'a11\na22\nb33\nc44\nc55'});
testVim('mark', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 't');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 't');
  helpers.assertCursorAt(2, 2);
  cm.setCursor(2, 0);
  cm.replaceRange('   h', cm.getCursor());
  cm.setCursor(0, 0);
  helpers.doKeys('\'', 't');
  helpers.assertCursorAt(2, 3);
});
testVim('mark\'', function(cm, vim, helpers) {
  // motions that do not update jumplist
  cm.setCursor(2, 2);
  helpers.doKeys('`', '\'');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('j', '3', 'l');
  helpers.doKeys('`', '`');
  helpers.assertCursorAt(2, 2);
  helpers.doKeys('`', '`');
  helpers.assertCursorAt(1, 3);
  // motions that update jumplist
  helpers.doKeys('/', '=', '\n');
  helpers.assertCursorAt(6, 20);
  helpers.doKeys('`', '`');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('\'', '\'');
  helpers.assertCursorAt(6, 2);
  helpers.doKeys('\'', '`');
  helpers.assertCursorAt(1, 1);
  // edits
  helpers.doKeys('g', 'I', '\n', '<Esc>', 'l');
  // the column may be different depending on editor behavior in insert mode
  var ch = cm.getCursor().ch;
  helpers.doKeys('`', '`');
  helpers.assertCursorAt(7, 2);
  helpers.doKeys('`', '`');
  helpers.assertCursorAt(2, ch);
});
testVim('mark.', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('O', 'testing', '<Esc>');
  cm.setCursor(3, 3);
  helpers.doKeys('\'', '.');
  helpers.assertCursorAt(0, 0);
  cm.setCursor(4, 4);
  helpers.doKeys('`', '.');
  helpers.assertCursorAt(0, 6);
});
testVim('jumpToMark_next', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 't');
  cm.setCursor(0, 0);
  helpers.doKeys(']', '`');
  helpers.assertCursorAt(2, 2);
  cm.setCursor(0, 0);
  helpers.doKeys(']', '\'');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_next_repeat', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(0, 0);
  helpers.doKeys('2', ']', '`');
  helpers.assertCursorAt(3, 2);
  cm.setCursor(0, 0);
  helpers.doKeys('2', ']', '\'');
  helpers.assertCursorAt(3, 1);
});
testVim('jumpToMark_next_sameline', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 4);
  helpers.doKeys('m', 'b');
  cm.setCursor(2, 2);
  helpers.doKeys(']', '`');
  helpers.assertCursorAt(2, 4);
});
testVim('jumpToMark_next_onlyprev', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('m', 'a');
  cm.setCursor(4, 0);
  helpers.doKeys(']', '`');
  helpers.assertCursorAt(4, 0);
});
testVim('jumpToMark_next_nomark', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys(']', '`');
  helpers.assertCursorAt(2, 2);
  helpers.doKeys(']', '\'');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_next_linewise_over', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(3, 4);
  helpers.doKeys('m', 'b');
  cm.setCursor(2, 1);
  helpers.doKeys(']', '\'');
  helpers.assertCursorAt(3, 1);
});
testVim('jumpToMark_next_action', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 't');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ']', '`');
  helpers.assertCursorAt(0, 0);
  var actual = cm.getLine(0);
  var expected = 'pop pop 0 1 2 3 4';
  eq(actual, expected, "Deleting while jumping to the next mark failed.");
});
testVim('jumpToMark_next_line_action', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 't');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ']', '\'');
  helpers.assertCursorAt(0, 1);
  var actual = cm.getLine(0);
  var expected = ' (a) [b] {c} '
  eq(actual, expected, "Deleting while jumping to the next mark line failed.");
});
testVim('jumpToMark_prev', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 't');
  cm.setCursor(4, 0);
  helpers.doKeys('[', '`');
  helpers.assertCursorAt(2, 2);
  cm.setCursor(4, 0);
  helpers.doKeys('[', '\'');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_prev_repeat', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(5, 0);
  helpers.doKeys('2', '[', '`');
  helpers.assertCursorAt(3, 2);
  cm.setCursor(5, 0);
  helpers.doKeys('2', '[', '\'');
  helpers.assertCursorAt(3, 1);
});
testVim('jumpToMark_prev_sameline', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 4);
  helpers.doKeys('m', 'b');
  cm.setCursor(2, 2);
  helpers.doKeys('[', '`');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_prev_onlynext', function(cm, vim, helpers) {
  cm.setCursor(4, 4);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 0);
  helpers.doKeys('[', '`');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_prev_nomark', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('[', '`');
  helpers.assertCursorAt(2, 2);
  helpers.doKeys('[', '\'');
  helpers.assertCursorAt(2, 0);
});
testVim('jumpToMark_prev_linewise_over', function(cm, vim, helpers) {
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(3, 4);
  helpers.doKeys('m', 'b');
  cm.setCursor(3, 6);
  helpers.doKeys('[', '\'');
  helpers.assertCursorAt(2, 0);
});
testVim('delmark_single', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('m', 't');
  helpers.doEx('delmarks t');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 't');
  helpers.assertCursorAt(0, 0);
});
testVim('delmark_range', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'd');
  cm.setCursor(5, 2);
  helpers.doKeys('m', 'e');
  helpers.doEx('delmarks b-d');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 'a');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'b');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'c');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'd');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'e');
  helpers.assertCursorAt(5, 2);
});
testVim('delmark_multi', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'd');
  cm.setCursor(5, 2);
  helpers.doKeys('m', 'e');
  helpers.doEx('delmarks bcd');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 'a');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'b');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'c');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'd');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'e');
  helpers.assertCursorAt(5, 2);
});
testVim('delmark_multi_space', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'd');
  cm.setCursor(5, 2);
  helpers.doKeys('m', 'e');
  helpers.doEx('delmarks b c d');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 'a');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'b');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'c');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'd');
  helpers.assertCursorAt(1, 2);
  helpers.doKeys('`', 'e');
  helpers.assertCursorAt(5, 2);
});
testVim('delmark_all', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('m', 'a');
  cm.setCursor(2, 2);
  helpers.doKeys('m', 'b');
  cm.setCursor(3, 2);
  helpers.doKeys('m', 'c');
  cm.setCursor(4, 2);
  helpers.doKeys('m', 'd');
  cm.setCursor(5, 2);
  helpers.doKeys('m', 'e');
  helpers.doEx('delmarks a b-de');
  cm.setCursor(0, 0);
  helpers.doKeys('`', 'a');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('`', 'b');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('`', 'c');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('`', 'd');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('`', 'e');
  helpers.assertCursorAt(0, 0);
});
testVim('visual', function(cm, vim, helpers) {
  helpers.doKeys('l', 'v', 'l', 'l');
  helpers.assertCursorAt(0, 4);
  eqCursorPos(makeCursor(0, 1), cm.getCursor('anchor'));
  helpers.doKeys('d');
  eq('15', cm.getValue());
}, { value: '12345' });
testVim('visual_yank', function(cm, vim, helpers) {
  helpers.doKeys('v', '3', 'l', 'y');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('p');
  eq('aa te test for yank', cm.getValue());
}, { value: 'a test for yank' })
testVim('visual_w', function(cm, vim, helpers) {
  helpers.doKeys('v', 'w');
  eq(cm.getSelection(), 'motion t');
}, { value: 'motion test'});
testVim('visual_initial_selection', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('v');
  cm.getSelection('n');
}, { value: 'init'});
testVim('visual_crossover_left', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('v', 'l', 'h', 'h');
  cm.getSelection('ro');
}, { value: 'cross'});
testVim('visual_crossover_left', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('v', 'h', 'l', 'l');
  cm.getSelection('os');
}, { value: 'cross'});
testVim('visual_crossover_up', function(cm, vim, helpers) {
  cm.setCursor(3, 2);
  helpers.doKeys('v', 'j', 'k', 'k');
  eqCursorPos(new Pos(2, 2), cm.getCursor('head'));
  eqCursorPos(new Pos(3, 3), cm.getCursor('anchor'));
  helpers.doKeys('k');
  eqCursorPos(new Pos(1, 2), cm.getCursor('head'));
  eqCursorPos(new Pos(3, 3), cm.getCursor('anchor'));
}, { value: 'cross\ncross\ncross\ncross\ncross\n'});
testVim('visual_crossover_down', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('v', 'k', 'j', 'j');
  eqCursorPos(new Pos(2, 3), cm.getCursor('head'));
  eqCursorPos(new Pos(1, 2), cm.getCursor('anchor'));
  helpers.doKeys('j');
  eqCursorPos(new Pos(3, 3), cm.getCursor('head'));
  eqCursorPos(new Pos(1, 2), cm.getCursor('anchor'));
}, { value: 'cross\ncross\ncross\ncross\ncross\n'});
testVim('visual_exit', function(cm, vim, helpers) {
  helpers.doKeys('<C-v>', 'l', 'j', 'j', '<Esc>');
  eqCursorPos(cm.getCursor('anchor'), cm.getCursor('head'));
  eq(vim.visualMode, false);
}, { value: 'hello\nworld\nfoo' });
testVim('visual_line', function(cm, vim, helpers) {
  helpers.doKeys('l', 'V', 'l', 'j', 'j', 'd');
  eq(' 4\n 5', cm.getValue());
}, { value: ' 1\n 2\n 3\n 4\n 5' });
testVim('visual_block_move_to_eol', function(cm, vim, helpers) {
  // moveToEol should move all block cursors to end of line
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', 'G', '$');
  var selections = cm.getSelections().join();
  eq('123,45,6', selections);
  // Checks that with cursor at Infinity, finding words backwards still works.
  helpers.doKeys('2', 'k', 'b');
  selections = cm.getSelections().join();
  eq('1', selections);
}, {value: '123\n45\n6'});
testVim('visual_block_different_line_lengths', function(cm, vim, helpers) {
  // test the block selection with lines of different length
  // i.e. extending the selection
  // till the end of the longest line.
  helpers.doKeys('<C-v>', 'l', 'j', 'j', '6', 'l', 'd');
  helpers.doKeys('d', 'd', 'd', 'd');
  eq('', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});
testVim('visual_block_truncate_on_short_line', function(cm, vim, helpers) {
  // check for left side selection in case
  // of moving up to a shorter line.
  cm.replaceRange('', cm.getCursor());
  cm.setCursor(3, 4);
  helpers.doKeys('<C-v>', 'l', 'k', 'k', 'd');
  eq('hello world\n{\ntis\nsa!', cm.getValue());
}, {value: 'hello world\n{\nthis is\nsparta!'});
testVim('visual_block_corners', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('<C-v>', '2', 'l', 'k');
  // circle around the anchor
  // and check the selections
  var selections = cm.getSelections();
  eq('345891', selections.join(''));
  helpers.doKeys('4', 'h');
  selections = cm.getSelections();
  eq('123678', selections.join(''));
  helpers.doKeys('j', 'j');
  selections = cm.getSelections();
  eq('678abc', selections.join(''));
  helpers.doKeys('4', 'l');
  selections = cm.getSelections();
  eq('891cde', selections.join(''));
}, {value: '12345\n67891\nabcde'});
testVim('visual_block_mode_switch', function(cm, vim, helpers) {
  // switch between visual modes
  cm.setCursor(1, 1);
  // blockwise to characterwise visual
  helpers.doKeys('<C-v>', 'j', 'l', 'v');
  var selections = cm.getSelections();
  eq('7891\nabc', selections.join(''));
  // characterwise to blockwise
  helpers.doKeys('<C-v>');
  selections = cm.getSelections();
  eq('78bc', selections.join(''));
  // blockwise to linewise visual
  helpers.doKeys('V');
  selections = cm.getSelections();
  eq('67891\nabcde', selections.join(''));
}, {value: '12345\n67891\nabcde'});
testVim('visual_block_crossing_short_line', function(cm, vim, helpers) {
  // visual block with long and short lines
  cm.setCursor(0, 3);
  helpers.doKeys('<C-v>', 'j', 'j', 'j');
  var selections = cm.getSelections().join();
  eq('4,,d,b', selections);
  helpers.doKeys('3', 'k');
  selections = cm.getSelections().join();
  eq('4', selections);
  helpers.doKeys('5', 'j', 'k');
  selections = cm.getSelections().join("");
  eq(10, selections.length);
}, {value: '123456\n78\nabcdefg\nfoobar\n}\n'});
testVim('visual_block_curPos_on_exit', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '3' , 'l', '<Esc>');
  eqCursorPos(makeCursor(0, 3), cm.getCursor());
  helpers.doKeys('h', '<C-v>', '2' , 'j' ,'3' , 'l');
  eq(cm.getSelections().join(), "3456,,cdef");
  helpers.doKeys('4' , 'h');
  eq(cm.getSelections().join(), "23,8,bc");
  helpers.doKeys('2' , 'l');
  eq(cm.getSelections().join(), "34,,cd");
}, {value: '123456\n78\nabcdefg\nfoobar'});

testVim('visual_marks', function(cm, vim, helpers) {
  helpers.doKeys('l', 'v', 'l', 'l', 'j', 'j', 'v');
  // Test visual mode marks
  cm.setCursor(2, 1);
  helpers.doKeys('\'', '<');
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('\'', '>');
  helpers.assertCursorAt(2, 0);
});
testVim('visual_join', function(cm, vim, helpers) {
  helpers.doKeys('l', 'V', 'l', 'j', 'j', 'J');
  eq(' 1 2 3\n 4\n 5', cm.getValue());
  is(!vim.visualMode);
}, { value: ' 1\n 2\n 3\n 4\n 5' });
testVim('visual_join_2', function(cm, vim, helpers) {
  helpers.doKeys('G', 'V', 'g', 'g', 'J');
  eq('1 2 3 4 5 6', cm.getValue());
  is(!vim.visualMode);
}, { value: '1\n2\n3\n4\n5\n6\n'});
testVim('visual_join_blank', function(cm, vim, helpers) {
  var initialValue = cm.getValue();
  helpers.doKeys('G', 'V', 'g', 'g', 'J');
  eq('1  2 5 6', cm.getValue());
  is(!vim.visualMode);
  helpers.doKeys('u');
  eq(initialValue, cm.getValue());
  helpers.doKeys('G', 'V', 'g', 'g', 'g', 'J');
  eq('1 \t2\t  5 6', cm.getValue());
  helpers.doKeys('u');
  eq(cm.getCursor().line, 0);
  eq(initialValue, cm.getValue());
  helpers.doKeys('J', 'J', 'J');
  helpers.assertCursorAt(0, 3);
  helpers.doKeys('J');
  helpers.assertCursorAt(0, 4);
  eq('1  2 5\n 6\n', cm.getValue());
  helpers.doKeys('u');
  eq('1  2\n5\n 6\n', cm.getValue());  
}, { value: '1 \n\t2\n\t  \n\n5\n 6\n'});
testVim('visual_blank', function(cm, vim, helpers) {
  helpers.doKeys('v', 'k');
  eq(vim.visualMode, true);
}, { value: '\n' });
testVim('reselect_visual', function(cm, vim, helpers) {
  helpers.doKeys('l', 'v', 'l', 'l', 'l', 'y', 'g', 'v');
  helpers.assertCursorAt(0, 5);
  eqCursorPos(makeCursor(0, 1), cm.getCursor('anchor'));
  helpers.doKeys('v');
  cm.setCursor(1, 0);
  helpers.doKeys('v', 'l', 'l', 'p');
  eq('123456\n2345\nbar', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('g', 'v');
  // here the fake cursor is at (1, 3)
  helpers.assertCursorAt(1, 4);
  eqCursorPos(makeCursor(1, 0), cm.getCursor('anchor'));
  helpers.doKeys('v');
  cm.setCursor(2, 0);
  helpers.doKeys('v', 'l', 'l', 'g', 'v');
  helpers.assertCursorAt(1, 4);
  eqCursorPos(makeCursor(1, 0), cm.getCursor('anchor'));
  helpers.doKeys('g', 'v');
  helpers.assertCursorAt(2, 3);
  eqCursorPos(makeCursor(2, 0), cm.getCursor('anchor'));
  eq('123456\n2345\nbar', cm.getValue());
}, { value: '123456\nfoo\nbar' });
testVim('reselect_visual_line', function(cm, vim, helpers) {
  helpers.doKeys('l', 'V', 'j', 'j', 'V', 'g', 'v', 'd');
  eq('foo\nand\nbar', cm.getValue());
  cm.setCursor(1, 0);
  helpers.doKeys('V', 'y', 'j');
  helpers.doKeys('V', 'p' , 'g', 'v', 'd');
  eq('foo\nand', cm.getValue());
}, { value: 'hello\nthis\nis\nfoo\nand\nbar' });
testVim('reselect_visual_block', function(cm, vim, helpers) {
  cm.setCursor(1, 2);
  helpers.doKeys('<C-v>', 'k', 'h', '<C-v>');
  cm.setCursor(2, 1);
  helpers.doKeys('v', 'l', 'g', 'v');
  eqCursorPos(new Pos(1, 2), vim.sel.anchor);
  eqCursorPos(new Pos(0, 1), vim.sel.head);
  // Ensure selection is done with visual block mode rather than one
  // continuous range.
  eq(cm.getSelections().join(''), '23oo')
  helpers.doKeys('g', 'v');
  eqCursorPos(new Pos(2, 1), vim.sel.anchor);
  eqCursorPos(new Pos(2, 2), vim.sel.head);
  helpers.doKeys('<Esc>');
  // Ensure selection of deleted range
  cm.setCursor(1, 1);
  helpers.doKeys('v', '<C-v>', 'j', 'd', 'g', 'v');
  eq(cm.getSelections().join(''), 'or');
}, { value: '123456\nfoo\nbar' });
testVim('s_normal', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('s');
  helpers.doKeys('<Esc>');
  eq('ac', cm.getValue());
}, { value: 'abc'});
testVim('s_normal surrogate character', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('s');
  helpers.doKeys('test');
  helpers.doKeys('<Esc>');
  eq('test', cm.getValue());
}, { value: '😀' });
testVim('s_visual', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('v', 's');
  helpers.doKeys('<Esc>');
  helpers.assertCursorAt(0, 0);
  eq('ac', cm.getValue());
}, { value: 'abc'});
testVim('d with surrogate character', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v');
  helpers.doKeys('d');
  helpers.doKeys('<Esc>');
  eq('', cm.getValue());
}, { value: '😀' });
testVim('o_visual', function(cm, vim, helpers) {
  cm.setCursor(0,0);
  helpers.doKeys('v','l','l','l','o');
  helpers.assertCursorAt(0,0);
  helpers.doKeys('v','v','j','j','j','o');
  helpers.assertCursorAt(0,0);
  helpers.doKeys('O');
  helpers.doKeys('l','l')
  helpers.assertCursorAt(3, 3);
  helpers.doKeys('d');
  eq('p',cm.getValue());
}, { value: 'abcd\nefgh\nijkl\nmnop'});
testVim('o_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>','3','j','l','l', 'o');
  eqCursorPos(new Pos(3, 3), vim.sel.anchor);
  eqCursorPos(new Pos(0, 1), vim.sel.head);
  helpers.doKeys('O');
  eqCursorPos(new Pos(3, 1), vim.sel.anchor);
  eqCursorPos(new Pos(0, 3), vim.sel.head);
  helpers.doKeys('o');
  eqCursorPos(new Pos(0, 3), vim.sel.anchor);
  eqCursorPos(new Pos(3, 1), vim.sel.head);
}, { value: 'abcd\nefgh\nijkl\nmnop'});
testVim('changeCase_visual', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'l', 'l');
  helpers.doKeys('U');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('v', 'l', 'l');
  helpers.doKeys('u');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('l', 'l', 'l', '.');
  helpers.assertCursorAt(0, 3);
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', 'v', 'j', 'U', 'q');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('j', '@', 'a');
  helpers.assertCursorAt(1, 0);
  cm.setCursor(3, 0);
  helpers.doKeys('V', 'U', 'j', '.');
  eq('ABCDEF\nGHIJKL\nMnopq\nSHORT LINE\nLONG LINE OF TEXT', cm.getValue());
}, { value: 'abcdef\nghijkl\nmnopq\nshort line\nlong line of text'});
testVim('changeCase_visual_block', function(cm, vim, helpers) {
  cm.setCursor(2, 1);
  helpers.doKeys('<C-v>', 'k', 'k', 'h', 'U');
  eq('ABcdef\nGHijkl\nMNopq\nfoo', cm.getValue());
  cm.setCursor(0, 2);
  helpers.doKeys('.');
  eq('ABCDef\nGHIJkl\nMNOPq\nfoo', cm.getValue());
  // check when last line is shorter.
  cm.setCursor(2, 2);
  helpers.doKeys('.');
  eq('ABCDef\nGHIJkl\nMNOPq\nfoO', cm.getValue());
}, { value: 'abcdef\nghijkl\nmnopq\nfoo'});
testVim('visual_paste', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'l', 'l', 'y');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('3', 'l', 'j', 'v', 'l', 'p');
  helpers.assertCursorAt(1, 5);
  eq('this is a\nunithitest for visual paste', cm.getValue());
  cm.setCursor(0, 0);
  // in case of pasting whole line
  helpers.doKeys('y', 'y');
  cm.setCursor(1, 6);
  helpers.doKeys('v', 'l', 'l', 'l', 'p');
  helpers.assertCursorAt(2, 0);
  eq('this is a\nunithi\nthis is a\n for visual paste', cm.getValue());
}, { value: 'this is a\nunit test for visual paste'});

// This checks the contents of the register used to paste the text
testVim('v_paste_from_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'w');
  cm.setCursor(1, 0);
  helpers.doKeys('v', 'p');
  helpers.doEx('registers');
  is(/a\s+register/.test(helpers.getNotificationText()));
}, { value: 'register contents\nare not erased'});
testVim('S_normal', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('j', 'S');
  helpers.doKeys('<Esc>');
  helpers.assertCursorAt(1, 1);
  eq('aa{\n  \ncc', cm.getValue());
  helpers.doKeys('j', 'S');
  eq('aa{\n  \n', cm.getValue());
  helpers.assertCursorAt(2, 0);
  helpers.doKeys('<Esc>');
  helpers.doKeys('d', 'd', 'd', 'd');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('S');
  is(vim.insertMode);
  eq('', cm.getValue());
}, { value: 'aa{\n  bb\ncc'});
testVim('blockwise_paste', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '3', 'j', 'l', 'y');
  cm.setCursor(0, 2);
  // paste one char after the current cursor position
  helpers.doKeys('p');
  eq('helhelo\nworwold\nfoofo\nbarba', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('v', '4', 'l', 'y');
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '3', 'j', 'p');
  eq('helheelhelo\norwold\noofo\narba', cm.getValue());
}, { value: 'hello\nworld\nfoo\nbar'});
testVim('blockwise_paste_long/short_line', function(cm, vim, helpers) {
  // extend short lines in case of different line lengths.
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', 'j', 'j', 'y');
  cm.setCursor(0, 3);
  helpers.doKeys('p');
  eq('hellho\nfoo f\nbar b', cm.getValue());
}, { value: 'hello\nfoo\nbar'});
testVim('blockwise_paste_cut_paste', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '2', 'j', 'x');
  cm.setCursor(0, 0);
  helpers.doKeys('P');
  eq('cut\nand\npaste\nme', cm.getValue());
}, { value: 'cut\nand\npaste\nme'});
testVim('blockwise_paste_from_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '2', 'j', '"', 'a', 'y');
  cm.setCursor(0, 3);
  helpers.doKeys('"', 'a', 'p');
  eq('foobfar\nhellho\nworlwd', cm.getValue());
}, { value: 'foobar\nhello\nworld'});
testVim('blockwise_paste_last_line', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'y');
  cm.setCursor(3, 0);
  helpers.doKeys('p');
  eq('cut\nand\npaste\nmcue\n an\n pa', cm.getValue());
}, { value: 'cut\nand\npaste\nme'});

testVim('S_visual', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('v', 'j', 'S');
  helpers.doKeys('<Esc>');
  helpers.assertCursorAt(0, 0);
  eq('\ncc', cm.getValue());
}, { value: 'aa\nbb\ncc'});

testVim('d_/', function(cm, vim, helpers) {
  helpers.doKeys('2', 'd', '/', 'match', '\n');
  helpers.assertCursorAt(0, 0);
  eq('match \n next', cm.getValue());
  helpers.doKeys('d', ':', '2', '\n');
  // TODO eq(' next', cm.getValue());
}, { value: 'text match match \n next' });
testVim('/ and n/N', function(cm, vim, helpers) {
  helpers.doKeys('/', 'match', '\n');
  helpers.assertCursorAt(0, 11);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 6);
  helpers.doKeys('N');
  helpers.assertCursorAt(0, 11);

  cm.setCursor(0, 0);
  helpers.doKeys('2', '/', 'match', '\n');
  helpers.assertCursorAt(1, 6);
}, { value: 'match nope match \n nope Match' });
testVim('/ and gn selects the appropriate word', function(cm, vim, helpers) {
  helpers.doKeys('/', 'match', '\n');
  helpers.assertCursorAt(0, 11);

  // gn should highlight the the current word while it is within a match.

  // gn when cursor is in beginning of match
  helpers.doKeys('gn', '<Esc>');
  helpers.assertCursorAt(0, 15);

  // gn when cursor is at end of match
  helpers.doKeys('gn', '<Esc>');
  helpers.doKeys('<Esc>');
  helpers.assertCursorAt(0, 15);

  // consecutive gns should extend the selection
  helpers.doKeys('gn');
  helpers.assertCursorAt(0, 16);
  helpers.doKeys('gn');
  helpers.assertCursorAt(1, 11);

  // we should have selected the second and third "match"
  helpers.doKeys('d');
  eq('match nope ', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('/ and gN selects the appropriate word', function(cm, vim, helpers) {
  helpers.doKeys('/', 'match', '\n');
  helpers.assertCursorAt(0, 11);

  // gN when cursor is at beginning of match
  helpers.doKeys('gN', '<Esc>');
  helpers.assertCursorAt(0, 11);

  // gN when cursor is at end of match
  helpers.doKeys('e', 'gN', '<Esc>');
  helpers.assertCursorAt(0, 11);

  // consecutive gNs should extend the selection
  helpers.doKeys('gN');
  helpers.assertCursorAt(0, 11);
  helpers.doKeys('gN');
  helpers.assertCursorAt(0, 0);

  // we should have selected the first and second "match"
  helpers.doKeys('d');
  eq(' \n nope Match', cm.getValue());
}, { value: 'match nope match \n nope Match' })
testVim('/ and gn with an associated operator', function(cm, vim, helpers) {
  helpers.doKeys('/', 'match', '\n');
  helpers.assertCursorAt(0, 11);

  helpers.doKeys('c', 'gn', 'changed', '<Esc>');

  // change the current match.
  eq('match nope changed \n nope Match', cm.getValue());

  // change the next match.
  helpers.doKeys('.');
  eq('match nope changed \n nope changed', cm.getValue());

  // change the final match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope changed', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('/ and gN with an associated operator', function(cm, vim, helpers) {
  helpers.doKeys('/', 'match', '\n');
  helpers.assertCursorAt(0, 11);

  helpers.doKeys('c', 'gN', 'changed', '<Esc>');

  // change the current match.
  eq('match nope changed \n nope Match', cm.getValue());

  // change the next match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope Match', cm.getValue());

  // change the final match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope changed', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('/_case', function(cm, vim, helpers) {
  helpers.doKeys('/', 'Match', '\n');
  helpers.assertCursorAt(1, 6);
}, { value: 'match nope match \n nope Match' });
testVim('/_2_pcre', function(cm, vim, helpers) {
  CodeMirror.Vim.setOption('pcre', true);
  helpers.doKeys('/', '(word){2}', '\n');
  helpers.assertCursorAt(1, 9);
  helpers.doKeys('n');
  helpers.assertCursorAt(2, 1);
}, { value: 'word\n another wordword\n wordwordword\n' });
testVim('/_2_nopcre', function(cm, vim, helpers) {
  CodeMirror.Vim.setOption('pcre', false);
  helpers.doKeys('/', '\\(word\\)\\{2}', '\n');
  helpers.assertCursorAt(1, 9);
  helpers.doKeys('n');
  helpers.assertCursorAt(2, 1);
}, { value: 'word\n another wordword\n wordwordword\n' });
testVim('/_nongreedy', function(cm, vim, helpers) {
  helpers.doKeys('/', 'aa', '\n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 0);
}, { value: 'aaa aa \n a aa'});
testVim('?_nongreedy', function(cm, vim, helpers) {
  helpers.doKeys('?', 'aa', '\n');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, isOldCodeMirror ? 1 : 0);
}, { value: 'aaa aa \n a aa'});
testVim('/_greedy', function(cm, vim, helpers) {
  helpers.doKeys('/', 'a+', '\n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 1);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 0);
}, { value: 'aaa aa \n a aa'});
testVim('?_greedy', function(cm, vim, helpers) {
  helpers.doKeys('?', 'a+', '\n');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 1);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 0);
}, { value: 'aaa aa \n a aa'});
testVim('/_greedy_0_or_more', function(cm, vim, helpers) {
  helpers.doKeys('/', 'a*', '\n');
  helpers.assertCursorAt(0, 3);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 5);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 0);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 1);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 0);
}, { value: 'aaa  aa\n aa'});
testVim('?_greedy_0_or_more', function(cm, vim, helpers) {
  helpers.doKeys('?', 'a*', '\n');
  helpers.assertCursorAt(1, 1);
  helpers.doKeys('n');
  helpers.assertCursorAt(1, 0);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 5);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 0);
}, { value: 'aaa  aa\n aa'});
testVim('? and n/N', function(cm, vim, helpers) {
  helpers.doKeys('?', 'match', '\n');
  helpers.assertCursorAt(1, 6);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 11);
  helpers.doKeys('N');
  helpers.assertCursorAt(1, 6);

  cm.setCursor(0, 0);
  helpers.doKeys('2', '?', 'match', '\n');
  helpers.assertCursorAt(0, 11);
}, { value: 'match nope match \n nope Match' });
testVim('? and gn selects the appropriate word', function(cm, vim, helpers) {
  helpers.doKeys('?', 'match', '\n', 'n');
  helpers.assertCursorAt(0, 11);

  // gn should highlight the the current word while it is within a match.

  // gn when cursor is in beginning of match
  helpers.doKeys('gn', '<Esc>');
  helpers.assertCursorAt(0, 11);

  // gn when cursor is at end of match
  helpers.doKeys('e', 'gn', '<Esc>');
  helpers.assertCursorAt(0, 11);

  // consecutive gns should extend the selection
  helpers.doKeys('gn');
  helpers.assertCursorAt(0, 11);
  helpers.doKeys('gn');
  helpers.assertCursorAt(0, 0);

  // we should have selected the first and second "match"
  helpers.doKeys('d');
  eq(' \n nope Match', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('? and gN selects the appropriate word', function(cm, vim, helpers) {
  helpers.doKeys('?', 'match', '\n', 'n');
  helpers.assertCursorAt(0, 11);

  // gN when cursor is at beginning of match
  helpers.doKeys('gN', '<Esc>');
  helpers.assertCursorAt(0, 15);

  // gN when cursor is at end of match
  helpers.doKeys('gN', '<Esc>');
  helpers.assertCursorAt(0, 15);

  // consecutive gNs should extend the selection
  helpers.doKeys('gN');
  helpers.assertCursorAt(0, 16);
  helpers.doKeys('gN');
  helpers.assertCursorAt(1, 11);

  // we should have selected the second and third "match"
  helpers.doKeys('d');
  eq('match nope ', cm.getValue());
}, { value: 'match nope match \n nope Match' })
testVim('? and gn with an associated operator', function(cm, vim, helpers) {
  helpers.doKeys('?', 'match', '\n', 'n');
  helpers.assertCursorAt(0, 11);

  helpers.doKeys('c', 'gn', 'changed', '<Esc>');

  // change the current match.
  eq('match nope changed \n nope Match', cm.getValue());

  // change the next match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope Match', cm.getValue());

  // change the final match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope changed', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('? and gN with an associated operator', function(cm, vim, helpers) {
  helpers.doKeys('?', 'match', '\n', 'n');
  helpers.assertCursorAt(0, 11);

  helpers.doKeys('c', 'gN', 'changed', '<Esc>');

  // change the current match.
  eq('match nope changed \n nope Match', cm.getValue());

  // change the next match.
  helpers.doKeys('.');
  eq('match nope changed \n nope changed', cm.getValue());

  // change the final match.
  helpers.doKeys('.');
  eq('changed nope changed \n nope changed', cm.getValue());
}, { value: 'match nope match \n nope Match' });
testVim('*', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('*');
  helpers.assertCursorAt(0, 22);

  cm.setCursor(0, 9);
  helpers.doKeys('2', '*');
  helpers.assertCursorAt(1, 8);
}, { value: 'nomatch match nomatch match \nnomatch Match' });
testVim('*_no_word', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('*');
  helpers.assertCursorAt(0, 0);
}, { value: ' \n match \n' });
testVim('*_symbol', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('*');
  helpers.assertCursorAt(1, 0);
}, { value: ' /}\n/} match \n' });
testVim('#', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('#');
  helpers.assertCursorAt(1, 8);

  cm.setCursor(0, 9);
  helpers.doKeys('2', '#');
  helpers.assertCursorAt(0, 22);
}, { value: 'nomatch match nomatch match \nnomatch Match' });
testVim('*_seek', function(cm, vim, helpers) {
  // Should skip over space and symbols.
  cm.setCursor(0, 3);
  helpers.doKeys('*');
  helpers.assertCursorAt(0, 22);
}, { value: '    :=  match nomatch match \nnomatch Match' });
testVim('#', function(cm, vim, helpers) {
  // Should skip over space and symbols.
  cm.setCursor(0, 3);
  helpers.doKeys('#');
  helpers.assertCursorAt(1, 8);
}, { value: '    :=  match nomatch match \nnomatch Match' });
testVim('g*', function(cm, vim, helpers) {
  cm.setCursor(0, 8);
  helpers.doKeys('g', '*');
  helpers.assertCursorAt(0, 18);
  cm.setCursor(0, 8);
  helpers.doKeys('3', 'g', '*');
  helpers.assertCursorAt(1, 8);
}, { value: 'matches match alsoMatch\nmatchme matching' });
testVim('g#', function(cm, vim, helpers) {
  cm.setCursor(0, 8);
  helpers.doKeys('g', '#');
  helpers.assertCursorAt(0, 0);
  cm.setCursor(0, 8);
  helpers.doKeys('3', 'g', '#');
  helpers.assertCursorAt(1, 0);
}, { value: 'matches match alsoMatch\nmatchme matching' });
testVim('macro_insert', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', '0', 'i');
  helpers.doKeys('foo')
  helpers.doKeys('<Esc>');
  eq(helpers.getNotificationText(), 'recording @a');
  helpers.doKeys('q', '@', 'a');
  eq(helpers.getNotificationText(), null);
  eq('foofoo', cm.getValue());
}, { value: ''});
testVim('macro_insert_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', '$', 'a');
  helpers.doKeys('larry.')
  helpers.doKeys('<Esc>');
  helpers.doKeys('a');
  helpers.doKeys('curly.')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doKeys('a');
  helpers.doKeys('moe.')
  helpers.doKeys('<Esc>');
  helpers.doKeys('@', 'a');
  // At this point, the most recent edit should be the 2nd insert change
  // inside the macro, i.e. "curly.".
  helpers.doKeys('.');
  eq('larry.curly.moe.larry.curly.curly.', cm.getValue());
}, { value: ''});
testVim('macro_space', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('<Space>', '<Space>');
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('q', 'a', '<Space>', '<Space>', 'q');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('@', 'a');
  helpers.assertCursorAt(0, 6);
  helpers.doKeys('@', 'a');
  helpers.assertCursorAt(0, 8);
}, { value: 'one line of text.'});
testVim('macro_t_search', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', 't', 'e', 'q');
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('l', '@', 'a');
  helpers.assertCursorAt(0, 6);
  helpers.doKeys('l', ';');
  helpers.assertCursorAt(0, 12);
}, { value: 'one line of text.'});
testVim('macro_f_search', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'b', 'f', 'e', 'q');
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('@', 'b');
  helpers.assertCursorAt(0, 7);
  helpers.doKeys(';');
  helpers.assertCursorAt(0, 13);
}, { value: 'one line of text.'});
testVim('macro_slash_search', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'c');
  helpers.doKeys('/', 'e', '\n', 'q');
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('@', 'c');
  helpers.assertCursorAt(0, 7);
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 13);
}, { value: 'one line of text.'});
testVim('macro_multislash_search', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'd');
  helpers.doKeys('/', 'e', '\n');
  helpers.doKeys('/', 't', '\n', 'q');
  helpers.assertCursorAt(0, 12);
  helpers.doKeys('@', 'd');
  helpers.assertCursorAt(0, 15);
}, { value: 'one line of text to rule them all.'});
testVim('macro_last_ex_command_register', function (cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('s/a/b');
  helpers.doKeys('2', '@', ':');
  eq('bbbaa', cm.getValue());
  helpers.assertCursorAt(0, 2);
}, { value: 'aaaaa'});
testVim('macro_last_run_macro', function (cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', 'C', 'a', '<Esc>', 'q');
  helpers.doKeys('q', 'b', 'C', 'b', '<Esc>', 'q');
  helpers.doKeys('@', 'a');
  helpers.doKeys('d', 'd');
  helpers.doKeys('@', '@');
  eq('a', cm.getValue());
}, { value: ''});
testVim('macro_parens', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'z', 'i');
  helpers.doKeys('(')
  helpers.doKeys('<Esc>');
  helpers.doKeys('e', 'a');
  helpers.doKeys(')')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doKeys('w', '@', 'z');
  helpers.doKeys('w', '@', 'z');
  eq('(see) (spot) (run)', cm.getValue());
}, { value: 'see spot run'});
testVim('macro_overwrite', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'z', '0', 'i');
  helpers.doKeys('I ')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doKeys('e');
  // Now replace the macro with something else.
  helpers.doKeys('q', 'z', 'a');
  helpers.doKeys('.')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doKeys('e', '@', 'z');
  helpers.doKeys('e', '@', 'z');
  eq('I see. spot. run.', cm.getValue());
}, { value: 'see spot run'});
testVim('macro_search_f', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', 'f', ' ');
  helpers.assertCursorAt(0,3);
  helpers.doKeys('q', '0');
  helpers.assertCursorAt(0,0);
  helpers.doKeys('@', 'a');
  helpers.assertCursorAt(0,3);
}, { value: 'The quick brown fox jumped over the lazy dog.'});
testVim('macro_search_2f', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', '2', 'f', ' ');
  helpers.assertCursorAt(0,9);
  helpers.doKeys('q', '0');
  helpers.assertCursorAt(0,0);
  helpers.doKeys('@', 'a');
  helpers.assertCursorAt(0,9);
}, { value: 'The quick brown fox jumped over the lazy dog.'});
testVim('macro_yank_tick', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  // Start recording a macro into the \' register.
  helpers.doKeys('q', '\'');
  helpers.doKeys('y', '<Right>', '<Right>', '<Right>', '<Right>', 'p');
  helpers.assertCursorAt(0,4);
  eq('the tex parrot', cm.getValue());
}, { value: 'the ex parrot'});
testVim('yank_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'y');
  helpers.doKeys('j', '"', 'b', 'y', 'y');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+foo/.test(text));
  is(/b\s+bar/.test(text));
}, { value: 'foo\nbar'});
testVim('yank_visual_block', function(cm, vim, helpers) {
  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', 'l', 'j', '"', 'a', 'y');
  helpers.doEx('registers');
  is(/a\s+oo\nar/.test(helpers.getNotificationText()));
}, { value: 'foo\nbar'});
testVim('yank_append_line_to_line_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'y');
  helpers.doKeys('j', '"', 'A', 'y', 'y');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+foo\nbar/.test(text));
  is(/"\s+foo\nbar/.test(text));
}, { value: 'foo\nbar'});
testVim('yank_append_word_to_word_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'w');
  helpers.doKeys('j', '"', 'A', 'y', 'w');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+foobar/.test(text));
  is(/"\s+foobar/.test(text));
}, { value: 'foo\nbar'});
testVim('yank_append_line_to_word_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'w');
  helpers.doKeys('j', '"', 'A', 'y', 'y');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+foo\nbar/.test(text));
  is(/"\s+foo\nbar/.test(text));
}, { value: 'foo\nbar'});
testVim('yank_append_word_to_line_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('"', 'a', 'y', 'y');
  helpers.doKeys('j', '"', 'A', 'y', 'w');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+foo\nbar/.test(text));
  is(/"\s+foo\nbar/.test(text));
}, { value: 'foo\nbar'});
testVim('black_hole_register', function(cm,vim,helpers) {
  helpers.doKeys('g', 'g', 'y', 'G');
  helpers.doEx('registers');
  var registersText = helpers.getNotificationText();
  helpers.doKeys('"', '_', 'd', 'G');
  helpers.doEx('registers');
  eq(registersText, helpers.getNotificationText(), 'One or more registers were modified');
  helpers.doKeys('"', '_', 'p');
  eq('', cm.getValue());
}, { value: 'foo\nbar'});
testVim('macro_register', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('q', 'a', 'i');
  helpers.doKeys('gangnam')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doKeys('q', 'b', 'o');
  helpers.doKeys('style')
  helpers.doKeys('<Esc>');
  helpers.doKeys('q');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/a\s+i/.test(text));
  is(/b\s+o/.test(text));
}, { value: ''});
testVim('._register', function(cm,vim,helpers) {
  cm.setCursor(0,0);
  helpers.doKeys('i');
  helpers.doKeys('foo')
  helpers.doKeys('<Esc>');
  helpers.doEx('registers');
  is(/\.\s+foo/.test(helpers.getNotificationText()));
}, {value: ''});
testVim(':_register', function(cm,vim,helpers) {
  helpers.doEx('bar');
  helpers.doEx('registers');
  is(/:\s+bar/.test(helpers.getNotificationText()));
}, {value: ''});
testVim('registers_html_encoding', function(cm,vim,helpers) {
  helpers.doKeys('y', 'y');
  helpers.doEx('registers');
  is(/"\s+<script>throw "&amp;"<\/script>/.test(helpers.getNotificationText()));
}, {value: '<script>throw "&amp;"</script>'});
testVim('search_register_escape', function(cm, vim, helpers) {
  // Check that the register is restored if the user escapes rather than confirms.
  helpers.doKeys('/', 'waldo', '\n');
  helpers.doKeys('/', 'foo', '<Esc>');
  helpers.doEx('registers');
  var text = helpers.getNotificationText();
  is(/waldo/.test(text));
  is(!/foo/.test(text));
}, {value: ''});
testVim('search_register', function(cm, vim, helpers) {
  helpers.doKeys('/', 'foo', '\n');
  helpers.doEx('registers');
  is(/\/\s+foo/.test(helpers.getNotificationText()));
}, {value: ''});
testVim('search_history', function(cm, vim, helpers) {
  helpers.doKeys('/', 'this', '\n');
  helpers.doKeys('/', 'checks', '\n');
  helpers.doKeys('/', 'search', '\n');
  helpers.doKeys('/', 'history', '\n');
  helpers.doKeys('/', 'checks', '\n');
  helpers.doKeys('/');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'checks');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'history');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'search');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'this');
  helpers.doKeys('Down');
  eq(document.activeElement.value, 'search');
}, {value: ''});
testVim('exCommand_history', function(cm, vim, helpers) {
  helpers.doEx('registers');
  helpers.doEx('sort');
  helpers.doEx('map');
  helpers.doEx('invalid');
  helpers.doKeys(':');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'invalid');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'map');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'sort');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'registers');
  helpers.doKeys('<Esc>', ':');
  helpers.doKeys('s');
  eq(document.activeElement.value, 's');
  helpers.doKeys('Up');
  eq(document.activeElement.value, 'sort');
}, {value: ''});
testVim('search_clear', function(cm, vim, helpers) {
  helpers.doKeys('/', 'foo');
  eq(document.activeElement.value, 'foo');
  helpers.doKeys('<C-u>');
  eq(document.activeElement.value, '');
});
testVim('exCommand_clear', function(cm, vim, helpers) {
  helpers.doKeys(':', 'foo');
  eq(document.activeElement.value, 'foo');
  helpers.doKeys('<C-u>');
  eq(document.activeElement.value, '');
});
testVim('._normal', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('2', 'd', 'w');
  helpers.doKeys('.');
  eq('5 6', cm.getValue());

  helpers.doKeys('a');
  cm.operation(function() {
    cm.curOp.isVimOp = true;
    cm.replaceSelection("()");
    var pos = cm.getCursor();
    pos.ch--;
    cm.setCursor(pos);
  });
  helpers.doKeys('x', 'y', '<Esc>');
  helpers.doKeys('.');
  eq('5(xy(xy)) 6', cm.getValue());
}, { value: '1 2 3 4 5 6'});
testVim('._repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('2', 'd', 'w');
  helpers.doKeys('3', '.');
  eq('6', cm.getValue());
}, { value: '1 2 3 4 5 6'});
testVim('._insert', function(cm, vim, helpers) {
  helpers.doKeys('i');
  helpers.doKeys('test')
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('testestt', cm.getValue());
  helpers.assertCursorAt(0, 6);
  helpers.doKeys('O');
  helpers.doKeys('xyz')
  helpers.doKeys('Backspace');
  helpers.doKeys('Down');
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('xy\nxy\ntestestt', cm.getValue());
  helpers.assertCursorAt(1, 1);
}, { value: ''});
testVim('._startinsert', function(cm, vim, helpers) {
  helpers.doEx('map i x');
  helpers.doKeys('i');
  eq('', cm.getValue());
  helpers.doEx('start');
  helpers.doKeys('test');
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('testestt', cm.getValue());
  helpers.assertCursorAt(0, 6);
  helpers.doEx('start!');
  helpers.doKeys('xyz');
  eq('testesttxyz', cm.getValue());
  helpers.assertCursorAt(0, 11);
}, { value: 'x'});
testVim('._insert_repeat', function(cm, vim, helpers) {
  helpers.doKeys('i');
  helpers.doKeys('test')
  cm.setCursor(0, 4);
  helpers.doKeys('<Esc>');
  helpers.doKeys('2', '.');
  eq('testesttestt', cm.getValue());
  helpers.assertCursorAt(0, 10);
}, { value: ''});
testVim('._repeat_insert', function(cm, vim, helpers) {
  helpers.doKeys('3', 'i');
  helpers.doKeys('te')
  cm.setCursor(0, 2);
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('tetettetetee', cm.getValue());
  helpers.assertCursorAt(0, 10);
}, { value: ''});
testVim('._insert_o', function(cm, vim, helpers) {
  helpers.doKeys('o');
  helpers.doKeys('z')
  cm.setCursor(1, 1);
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('\nz\nz', cm.getValue());
  helpers.assertCursorAt(2, 0);
}, { value: ''});
testVim('._insert_o_repeat', function(cm, vim, helpers) {
  helpers.doKeys('o');
  helpers.doKeys('z')
  helpers.doKeys('<Esc>');
  cm.setCursor(1, 0);
  helpers.doKeys('2', '.');
  eq('\nz\nz\nz', cm.getValue());
  helpers.assertCursorAt(3, 0);
}, { value: ''});
testVim('._insert_o_indent', function(cm, vim, helpers) {
  helpers.doKeys('o');
  helpers.doKeys('z')
  helpers.doKeys('<Esc>');
  cm.setCursor(1, 2);
  helpers.doKeys('.');
  eq('{\n  z\n  z', cm.getValue());
  helpers.assertCursorAt(2, 2);
}, { value: '{'});
testVim('._insert_cw', function(cm, vim, helpers) {
  helpers.doKeys('c', 'w');
  helpers.doKeys('test')
  helpers.doKeys('<Esc>');
  cm.setCursor(0, 3);
  helpers.doKeys('2', 'l');
  helpers.doKeys('.');
  eq('test test word3', cm.getValue());
  helpers.assertCursorAt(0, 8);
}, { value: 'word1 word2 word3' });
testVim('._insert_cw_repeat', function(cm, vim, helpers) {
  // For some reason, repeat cw in desktop VIM will does not repeat insert mode
  // changes. Will conform to that behavior.
  helpers.doKeys('c', 'w');
  helpers.doKeys('test');
  helpers.doKeys('<Esc>');
  cm.setCursor(0, 4);
  helpers.doKeys('l');
  helpers.doKeys('2', '.');
  eq('test test', cm.getValue());
  helpers.assertCursorAt(0, 8);
}, { value: 'word1 word2 word3' });
testVim('._delete', function(cm, vim, helpers) {
  cm.setCursor(0, 5);
  helpers.doKeys('i');
  helpers.doKeys('Backspace');
  helpers.doKeys('<Esc>');
  helpers.doKeys('.');
  eq('zace', cm.getValue());
  helpers.assertCursorAt(0, 1);
}, { value: 'zabcde'});
testVim('._delete_repeat', function(cm, vim, helpers) {
  cm.setCursor(0, 6);
  helpers.doKeys('i');
  helpers.doKeys('Backspace');
  helpers.doKeys('<Esc>');
  helpers.doKeys('2', '.');
  eq('zzce', cm.getValue());
  helpers.assertCursorAt(0, 1);
}, { value: 'zzabcde'});
testVim('._visual_>', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('V', 'j', '>');
  cm.setCursor(2, 0)
  helpers.doKeys('.');
  eq('  1\n  2\n  3\n  4', cm.getValue());
  helpers.assertCursorAt(2, 2);
}, { value: '1\n2\n3\n4'});
testVim('._replace_repeat', function(cm, vim, helpers) {
  helpers.doKeys('R');
  cm.replaceRange('123', cm.getCursor(), offsetCursor(cm.getCursor(), 0, 3));
  cm.setCursor(0, 3);
  helpers.doKeys('<Esc>');
  helpers.doKeys('2', '.');
  eq('12123123\nabcdefg', cm.getValue());
  helpers.assertCursorAt(0, 7);
  cm.setCursor(1, 0);
  helpers.doKeys('.');
  eq('12123123\n123123g', cm.getValue());
  helpers.doKeys('l', '"', '.', 'p');
  eq('12123123\n123123g123', cm.getValue());
}, { value: 'abcdef\nabcdefg'});
testVim('f;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('f', 'x');
  helpers.doKeys(';');
  helpers.doKeys('2', ';');
  eq(9, cm.getCursor().ch);
}, { value: '01x3xx678x'});
testVim('F;', function(cm, vim, helpers) {
  cm.setCursor(0, 8);
  helpers.doKeys('F', 'x');
  helpers.doKeys(';');
  helpers.doKeys('2', ';');
  eq(2, cm.getCursor().ch);
}, { value: '01x3xx6x8x'});
testVim('t;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('t', 'x');
  helpers.doKeys(';');
  helpers.doKeys('2', ';');
  eq(8, cm.getCursor().ch);
}, { value: '01x3xx678x'});
testVim('T;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('T', 'x');
  helpers.doKeys(';');
  helpers.doKeys('2', ';');
  eq(2, cm.getCursor().ch);
}, { value: '0xx3xx678x'});
testVim('f,', function(cm, vim, helpers) {
  cm.setCursor(0, 6);
  helpers.doKeys('f', 'x');
  helpers.doKeys(',');
  helpers.doKeys('2', ',');
  eq(2, cm.getCursor().ch);
}, { value: '01x3xx678x'});
testVim('F,', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doKeys('F', 'x');
  helpers.doKeys(',');
  helpers.doKeys('2', ',');
  eq(9, cm.getCursor().ch);
}, { value: '01x3xx678x'});
testVim('t,', function(cm, vim, helpers) {
  cm.setCursor(0, 6);
  helpers.doKeys('t', 'x');
  helpers.doKeys(',');
  helpers.doKeys('2', ',');
  eq(3, cm.getCursor().ch);
}, { value: '01x3xx678x'});
testVim('T,', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('T', 'x');
  helpers.doKeys(',');
  helpers.doKeys('2', ',');
  eq(8, cm.getCursor().ch);
}, { value: '01x3xx67xx'});
testVim('fd,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('f', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ';');
  eq('56789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('d', ',');
  eq('01239', cm.getValue());
}, { value: '0123456789'});
testVim('Fd,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('F', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('d', ';');
  eq('01239', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ',');
  eq('56789', cm.getValue());
}, { value: '0123456789'});
testVim('td,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('t', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ';');
  eq('456789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('d', ',');
  eq('012349', cm.getValue());
}, { value: '0123456789'});
testVim('Td,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('T', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('d', ';');
  eq('012349', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('d', ',');
  eq('456789', cm.getValue());
}, { value: '0123456789'});
testVim('fc,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('f', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('c', ';', '<Esc>');
  eq('56789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('c', ',');
  eq('01239', cm.getValue());
}, { value: '0123456789'});
testVim('Fc,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('F', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('c', ';', '<Esc>');
  eq('01239', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('c', ',');
  eq('56789', cm.getValue());
}, { value: '0123456789'});
testVim('tc,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('t', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('c', ';', '<Esc>');
  eq('456789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('c', ',');
  eq('012349', cm.getValue());
}, { value: '0123456789'});
testVim('Tc,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('T', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('c', ';', '<Esc>');
  eq('012349', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('c', ',');
  eq('456789', cm.getValue());
}, { value: '0123456789'});
testVim('fy,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('f', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('y', ';', 'P');
  eq('012340123456789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('y', ',', 'P');
  eq('012345678456789', cm.getValue());
}, { value: '0123456789'});
testVim('Fy,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('F', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('y', ';', 'p');
  eq('012345678945678', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('y', ',', 'P');
  eq('012340123456789', cm.getValue());
}, { value: '0123456789'});
testVim('ty,;', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('t', '4');
  cm.setCursor(0, 0);
  helpers.doKeys('y', ';', 'P');
  eq('01230123456789', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 9);
  helpers.doKeys('y', ',', 'p');
  eq('01234567895678', cm.getValue());
}, { value: '0123456789'});
testVim('Ty,;', function(cm, vim, helpers) {
  cm.setCursor(0, 9);
  helpers.doKeys('T', '4');
  cm.setCursor(0, 9);
  helpers.doKeys('y', ';', 'p');
  eq('01234567895678', cm.getValue());
  helpers.doKeys('u');
  cm.setCursor(0, 0);
  helpers.doKeys('y', ',', 'P');
  eq('01230123456789', cm.getValue());
}, { value: '0123456789'});
testVim('vFT', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys('v', 'f', '1');
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('2', 't', ' ');
  helpers.assertCursorAt(0, 8);
  eqCursorPos(new Pos(0, 0), cm.getCursor('anchor'));
  helpers.doKeys('<Esc>');
  eqCursorPos(new Pos(0, 7), cm.getCursor('anchor'));
  helpers.doKeys('v', 'F', '3');
  helpers.assertCursorAt(0, 3);
  eqCursorPos(new Pos(0, 8), cm.getCursor('anchor'));
  helpers.doKeys('T', '1');
  helpers.assertCursorAt(0, 2);
  helpers.doKeys('F', '1');
  helpers.assertCursorAt(0, 1);
  helpers.doKeys('F', '1');
  helpers.assertCursorAt(0, 0);
}, { value: '1123 123 123'});
testVim('page_motions', function(cm, vim, helpers) {
  var value = "x".repeat(200).split("").map((_, i)=>i).join("\n");
  cm.setValue(value);
  cm.refresh();
  var lines = 10;
  var textHeight = cm.defaultTextHeight();
  cm.setSize(600, lines*textHeight);
  cm.setCursor(100, 0);
  cm.refresh();
  helpers.doKeys('<C-u>');
  helpers.assertCursorAt(95, 0);
  helpers.doKeys('<C-u>');
  helpers.assertCursorAt(90, 0);
  helpers.doKeys('<C-d>');
  helpers.doKeys('<C-d>');
  helpers.assertCursorAt(100, 0);
  cm.refresh();
  helpers.doKeys('<C-f>');
  cm.refresh();
  helpers.assertCursorAt(110, 0);

  helpers.doKeys('<C-b>');
  cm.refresh();
  helpers.assertCursorAt(100, 0);
  eq(value, cm.getValue());
});
testVim('HML', function(cm, vim, helpers) {
  cm.refresh();
  var lines = 35;
  var textHeight = cm.defaultTextHeight();
  cm.setSize(600, lines*textHeight);
  cm.setCursor(120, 0);
  helpers.doKeys('H');
  helpers.assertCursorAt(86, 2);
  helpers.doKeys('L');
  helpers.assertCursorAt(120, 4);
  helpers.doKeys('M');
  helpers.assertCursorAt(103,4);
}, { value: (function(){
  var lines = new Array(100);
  var upper = '  xx\n';
  var lower = '    xx\n';
  upper = lines.join(upper);
  lower = lines.join(lower);
  return upper + lower;
})()});

var zVals = [];
var cursorIndexVals = [];
forEach(['zb','zz','zt','z-','z.','z<CR>'], function(e, idx){
  var lineNum = 250;
  var lines = 35;
  testVim(e, function(cm, vim, helpers) {
    cm.refresh();
    var k1 = e[0];
    var k2 = e.substring(1);
    var textHeight = cm.defaultTextHeight();
    cm.setSize(600, lines*textHeight);
    cm.setCursor(lineNum, 1);
    var originalCursorIndex = cm.indexFromPos(cm.getCursor());
    helpers.doKeys(k1, k2);
    zVals[idx] = cm.getScrollInfo().top;
    cursorIndexVals[idx] = {
      before: originalCursorIndex,
      after: cm.indexFromPos(cm.getCursor())
    };
  }, { value: (function(){
    return new Array(500).join('12\n');
  })()});
});
testVim('zb_to_bottom', function(cm, vim, helpers){
  cm.refresh();
  var lineNum = 250;
  cm.setSize(600, 35*cm.defaultTextHeight());
  cm.setCursor(lineNum, 0);
  helpers.doKeys('z', 'b');
  var scrollInfo = cm.getScrollInfo();
  eq(scrollInfo.top + scrollInfo.clientHeight, cm.charCoords(new Pos(lineNum, 0), 'local').bottom);
}, { value: (function(){
  return new Array(500).join('\n');
})()});
testVim('zt_to_top', function(cm, vim, helpers){
  cm.refresh();
  var lineNum = 250;
  cm.setSize(600, 35*cm.defaultTextHeight());
  cm.setCursor(lineNum, 0);
  helpers.doKeys('z', 't');
  eq(cm.getScrollInfo().top, cm.charCoords(new Pos(lineNum, 0), 'local').top);
}, { value: (function(){
  return new Array(500).join('\n');
})()});
testVim('zb<zz', function(cm, vim, helpers){
  eq(zVals[0]<zVals[1], true);
});
testVim('zz<zt', function(cm, vim, helpers){
  eq(zVals[1]<zVals[2], true);
});
testVim('zb==z-', function(cm, vim, helpers){
  eq(zVals[0], zVals[3]);
});
testVim('zz==z.', function(cm, vim, helpers){
  eq(zVals[1], zVals[4]);
});
testVim('zt==z<CR>', function(cm, vim, helpers){
  eq(zVals[2], zVals[5]);
});
testVim('zt_no_cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[2];
  eq(cursorIndexes.before, cursorIndexes.after);
});
testVim('z<CR>_cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[5];
  eq(cursorIndexes.before, 751);
  eq(cursorIndexes.after, 750);
});
testVim('zz_no_cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[1];
  eq(cursorIndexes.before, cursorIndexes.after);
});
testVim('z._cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[4];
  eq(cursorIndexes.before, 751);
  eq(cursorIndexes.after, 750);
});
testVim('zb_no_cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[0];
  eq(cursorIndexes.before, cursorIndexes.after);
});
testVim('z-_cursor_change', function(cm, vim, helpers){
  var cursorIndexes = cursorIndexVals[3];
  eq(cursorIndexes.before, 751);
  eq(cursorIndexes.after, 750);
});

var moveTillCharacterSandbox =
  'The quick brown fox \n';
testVim('moveTillCharacter', function(cm, vim, helpers){
  cm.setCursor(0, 0);
  // Search for the 'q'.
  helpers.doKeys('/', 'q', '\n');
  eq(4, cm.getCursor().ch);
  // Jump to just before the first o in the list.
  helpers.doKeys('t');
  helpers.doKeys('o');
  eq('The quick brown fox \n', cm.getValue());
  // Delete that one character.
  helpers.doKeys('d');
  helpers.doKeys('t');
  helpers.doKeys('o');
  eq('The quick bown fox \n', cm.getValue());
  // Delete everything until the next 'o'.
  helpers.doKeys('.');
  eq('The quick box \n', cm.getValue());
  // An unmatched character should have no effect.
  helpers.doKeys('d');
  helpers.doKeys('t');
  helpers.doKeys('q');
  eq('The quick box \n', cm.getValue());
  // Matches should only be possible on single lines.
  helpers.doKeys('d');
  helpers.doKeys('t');
  helpers.doKeys('z');
  eq('The quick box \n', cm.getValue());
  // After all that, the search for 'q' should still be active, so the 'N' command
  // can run it again in reverse. Use that to delete everything back to the 'q'.
  helpers.doKeys('d');
  helpers.doKeys('N');
  eq('The ox \n', cm.getValue());
  eq(4, cm.getCursor().ch);
}, { value: moveTillCharacterSandbox});
testVim('searchForPipe', function(cm, vim, helpers){
  CodeMirror.Vim.setOption('pcre', false);
  cm.setCursor(0, 0);
  // Search for the '|'.
  helpers.doKeys('/', '|', '\n');
  eq(4, cm.getCursor().ch);
}, { value: 'this|that'});


var scrollMotionSandbox =
  '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n';
testVim('scrollMotion', function(cm, vim, helpers){
  var prevCursor, prevScrollInfo;
  cm.setSize(320, 200);
  cm.setCursor(0, 0);
  cm.refresh();
  // ctrl-y at the top of the file should have no effect.
  helpers.doKeys('<C-y>');
  eq(0, cm.getCursor().line);
  cm.refresh();
  prevScrollInfo = cm.getScrollInfo();
  helpers.doKeys('<C-e>');
  eq(1, cm.getCursor().line);
  cm.refresh();
  is(prevScrollInfo.top < cm.getScrollInfo().top);
  // Jump to the end of the sandbox.
  cm.setCursor(1000, 0);
  cm.refresh();
  prevCursor = cm.getCursor();
  // ctrl-e at the bottom of the file should have no effect.
  helpers.doKeys('<C-e>');
  eq(prevCursor.line, cm.getCursor().line);
  prevScrollInfo = cm.getScrollInfo();
  helpers.doKeys('<C-y>');
  eq(prevCursor.line - 1, cm.getCursor().line, "Y");
  is(prevScrollInfo.top > cm.getScrollInfo().top);
}, { value: scrollMotionSandbox});

var squareBracketMotionSandbox = ''+
  '({\n'+//0
  '  ({\n'+//11
  '  /*comment {\n'+//2
  '            */(\n'+//3
  '#else                \n'+//4
  '  /*       )\n'+//5
  '#if        }\n'+//6
  '  )}*/\n'+//7
  ')}\n'+//8
  '{}\n'+//9
  '#else {{\n'+//10
  '{}\n'+//11
  '}\n'+//12
  '{\n'+//13
  '#endif\n'+//14
  '}\n'+//15
  '}\n'+//16
  '#else';//17
testVim('[[, ]]', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys(']', ']');
  helpers.assertCursorAt(9,0);
  helpers.doKeys('2', ']', ']');
  helpers.assertCursorAt(13,0);
  helpers.doKeys(']', ']');
  helpers.assertCursorAt(17,0);
  helpers.doKeys('[', '[');
  helpers.assertCursorAt(13,0);
  helpers.doKeys('2', '[', '[');
  helpers.assertCursorAt(9,0);
  helpers.doKeys('[', '[');
  helpers.assertCursorAt(0,0);
}, { value: squareBracketMotionSandbox});
testVim('[], ][', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doKeys(']', '[');
  helpers.assertCursorAt(12,0);
  helpers.doKeys('2', ']', '[');
  helpers.assertCursorAt(16,0);
  helpers.doKeys(']', '[');
  helpers.assertCursorAt(17,0);
  helpers.doKeys('[', ']');
  helpers.assertCursorAt(16,0);
  helpers.doKeys('2', '[', ']');
  helpers.assertCursorAt(12,0);
  helpers.doKeys('[', ']');
  helpers.assertCursorAt(0,0);
}, { value: squareBracketMotionSandbox});
testVim('[{, ]}', function(cm, vim, helpers) {
  cm.setCursor(4, 10);
  helpers.doKeys('[', '{');
  helpers.assertCursorAt(2,12);
  helpers.doKeys('2', '[', '{');
  helpers.assertCursorAt(0,1);
  cm.setCursor(4, 10);
  helpers.doKeys(']', '}');
  helpers.assertCursorAt(6,11);
  helpers.doKeys('2', ']', '}');
  helpers.assertCursorAt(8,1);
  cm.setCursor(0,1);
  helpers.doKeys(']', '}');
  helpers.assertCursorAt(8,1);
  helpers.doKeys('[', '{');
  helpers.assertCursorAt(0,1);
}, { value: squareBracketMotionSandbox});
testVim('[(, ])', function(cm, vim, helpers) {
  cm.setCursor(4, 10);
  helpers.doKeys('[', '(');
  helpers.assertCursorAt(3,14);
  helpers.doKeys('2', '[', '(');
  helpers.assertCursorAt(0,0);
  cm.setCursor(4, 10);
  helpers.doKeys(']', ')');
  helpers.assertCursorAt(5,11);
  helpers.doKeys('2', ']', ')');
  helpers.assertCursorAt(8,0);
  helpers.doKeys('[', '(');
  helpers.assertCursorAt(0,0);
  helpers.doKeys(']', ')');
  helpers.assertCursorAt(8,0);
}, { value: squareBracketMotionSandbox});
testVim('[*, ]*, [/, ]/', function(cm, vim, helpers) {
  forEach(['*', '/'], function(key){
    cm.setCursor(7, 0);
    helpers.doKeys('2', '[', key);
    helpers.assertCursorAt(2,2);
    helpers.doKeys('2', ']', key);
    helpers.assertCursorAt(7,5);
  });
}, { value: squareBracketMotionSandbox});
testVim('[#, ]#', function(cm, vim, helpers) {
  cm.setCursor(10, 3);
  helpers.doKeys('2', '[', '#');
  helpers.assertCursorAt(4,0);
  helpers.doKeys('5', ']', '#');
  helpers.assertCursorAt(17,0);
  cm.setCursor(10, 3);
  helpers.doKeys(']', '#');
  helpers.assertCursorAt(14,0);
}, { value: squareBracketMotionSandbox});
testVim('[m, ]m, [M, ]M', function(cm, vim, helpers) {
  cm.setCursor(11, 0);
  helpers.doKeys('[', 'm');
  helpers.assertCursorAt(10,7);
  helpers.doKeys('4', '[', 'm');
  helpers.assertCursorAt(1,3);
  helpers.doKeys('5', ']', 'm');
  helpers.assertCursorAt(11,0);
  helpers.doKeys('[', 'M');
  helpers.assertCursorAt(9,1);
  helpers.doKeys('3', ']', 'M');
  helpers.assertCursorAt(15,0);
  helpers.doKeys('5', '[', 'M');
  helpers.assertCursorAt(7,3);
}, { value: squareBracketMotionSandbox});

testVim('i_indent_right', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedValue = '   word1\nword2\nword3 ';
  helpers.doKeys('i', '<C-t>');
  eq(expectedValue, cm.getValue());
  helpers.assertCursorAt(0, 5);
}, { value: ' word1\nword2\nword3 ', indentUnit: 2 });
testVim('i_indent_left', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  var expectedValue = ' word1\nword2\nword3 ';
  helpers.doKeys('i', '<C-d>');
  eq(expectedValue, cm.getValue());
  helpers.assertCursorAt(0, 1);
}, { value: '   word1\nword2\nword3 ', indentUnit: 2 });

// Ex mode tests
testVim('ex_go_to_line', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('4');
  helpers.assertCursorAt(3, 0);
}, { value: 'a\nb\nc\nd\ne\n'});
testVim('ex_go_to_mark', function(cm, vim, helpers) {
  cm.setCursor(3, 0);
  helpers.doKeys('m', 'a');
  cm.setCursor(0, 0);
  helpers.doEx('\'a');
  helpers.assertCursorAt(3, 0);
}, { value: 'a\nb\nc\nd\ne\n'});
testVim('ex_go_to_line_offset', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('+3');
  helpers.assertCursorAt(3, 0);
  helpers.doEx('-1');
  helpers.assertCursorAt(2, 0);
  helpers.doEx('.2');
  helpers.assertCursorAt(4, 0);
  helpers.doEx('.-3');
  helpers.assertCursorAt(1, 0);
}, { value: 'a\nb\nc\nd\ne\n'});
testVim('ex_go_to_mark_offset', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('m', 'a');
  cm.setCursor(0, 0);
  helpers.doEx('\'a1');
  helpers.assertCursorAt(3, 0);
  helpers.doEx('\'a-1');
  helpers.assertCursorAt(1, 0);
  helpers.doEx('\'a+2');
  helpers.assertCursorAt(4, 0);
}, { value: 'a\nb\nc\nd\ne\n'});
testVim('ex_write', function(cm, vim, helpers) {
  var tmp = CodeMirror.commands.save;
  var written;
  var actualCm;
  CodeMirror.commands.save = function(cm) {
    written = true;
    actualCm = cm;
  };
  // Test that w, wr, wri ... write all trigger :write.
  var command = 'write';
  for (var i = 1; i < command.length; i++) {
    written = false;
    actualCm = null;
    helpers.doEx(command.substring(0, i));
    eq(written, true);
    eq(actualCm, cm);
  }
  CodeMirror.commands.save = tmp;
});
testVim('ex_delete', function(cm, vim, helpers) {
  helpers.doKeys("j");
  helpers.doEx('delete');
  eq('l 1\nl 3\nl 4\n', cm.getValue());
  helpers.doEx('d');
  eq('l 1\nl 4\n', cm.getValue());
}, { value: 'l 1\nl 2\nl 3\nl 4\n'});
testVim('ex_sort', function(cm, vim, helpers) {
  helpers.doEx('sort');
  eq('Z\na\nb\nc\nd', cm.getValue());
}, { value: 'b\nZ\nd\nc\na'});
testVim('ex_sort_reverse', function(cm, vim, helpers) {
  helpers.doEx('sort!');
  eq('d\nc\nb\na', cm.getValue());
}, { value: 'b\nd\nc\na'});
testVim('ex_sort_range', function(cm, vim, helpers) {
  helpers.doEx('2,3sort');
  eq('b\nc\nd\na', cm.getValue());
}, { value: 'b\nd\nc\na'});
testVim('ex_sort_oneline', function(cm, vim, helpers) {
  helpers.doEx('2sort');
  // Expect no change.
  eq('b\nd\nc\na', cm.getValue());
}, { value: 'b\nd\nc\na'});
testVim('ex_sort_ignoreCase', function(cm, vim, helpers) {
  helpers.doEx('sort i');
  eq('a\nb\nc\nd\nZ', cm.getValue());
}, { value: 'b\nZ\nd\nc\na'});
testVim('ex_sort_unique', function(cm, vim, helpers) {
  helpers.doEx('sort u');
  eq('Z\na\nb\nc\nd', cm.getValue());
}, { value: 'b\nZ\na\na\nd\na\nc\na'});
testVim('ex_sort_decimal', function(cm, vim, helpers) {
  helpers.doEx('sort d');
  eq('d3\n s5\n6\n.9', cm.getValue());
}, { value: '6\nd3\n s5\n.9'});
testVim('ex_sort_decimal_negative', function(cm, vim, helpers) {
  helpers.doEx('sort d');
  eq('z-9\nd3\n s5\n6\n.9', cm.getValue());
}, { value: '6\nd3\n s5\n.9\nz-9'});
testVim('ex_sort_decimal_reverse', function(cm, vim, helpers) {
  helpers.doEx('sort! d');
  eq('.9\n6\n s5\nd3', cm.getValue());
}, { value: '6\nd3\n s5\n.9'});
testVim('ex_sort_hex', function(cm, vim, helpers) {
  helpers.doEx('sort x');
  eq(' s5\n6\n.9\n&0xB\nd3', cm.getValue());
}, { value: '6\nd3\n s5\n&0xB\n.9'});
testVim('ex_sort_octal', function(cm, vim, helpers) {
  helpers.doEx('sort o');
  eq('.9\n.8\nd3\n s5\n6', cm.getValue());
}, { value: '6\nd3\n s5\n.9\n.8'});
testVim('ex_sort_decimal_mixed', function(cm, vim, helpers) {
  helpers.doEx('sort d');
  eq('z\ny\nc1\nb2\na3', cm.getValue());
}, { value: 'a3\nz\nc1\ny\nb2'});
testVim('ex_sort_decimal_mixed_reverse', function(cm, vim, helpers) {
  helpers.doEx('sort! d');
  eq('a3\nb2\nc1\nz\ny', cm.getValue());
}, { value: 'a3\nz\nc1\ny\nb2'});
testVim('ex_sort_pattern_alpha', function(cm, vim, helpers) {
  helpers.doEx('sort /[a-z]/');
  eq('a3\nb2\nc1\ny\nz', cm.getValue());
}, { value: 'z\ny\nc1\nb2\na3'});
testVim('ex_sort_pattern_alpha_reverse', function(cm, vim, helpers) {
  helpers.doEx('sort! /[a-z]/');
  eq('z\ny\nc1\nb2\na3', cm.getValue());
}, { value: 'z\ny\nc1\nb2\na3'});
testVim('ex_sort_pattern_alpha_ignoreCase', function(cm, vim, helpers) {
  helpers.doEx('sort i/[a-z]/');
  eq('a3\nb2\nC1\nY\nz', cm.getValue());
}, { value: 'z\nY\nC1\nb2\na3'});
testVim('ex_sort_pattern_alpha_longer', function(cm, vim, helpers) {
  helpers.doEx('sort /[a-z]+/');
  eq('a\naa\nab\nade\nadele\nadelle\nadriana\nalex\nalexandra\nb\nc\ny\nz', cm.getValue());
}, { value: 'z\nab\naa\nade\nadelle\nalexandra\nalex\nadriana\nadele\ny\nc\nb\na'});
testVim('ex_sort_pattern_alpha_only', function(cm, vim, helpers) {
  helpers.doEx('sort /^[a-z]$/');
  eq('z1\ny2\na3\nb\nc', cm.getValue());
}, { value: 'z1\ny2\na3\nc\nb'});
testVim('ex_sort_pattern_alpha_only_reverse', function(cm, vim, helpers) {
  helpers.doEx('sort! /^[a-z]$/');
  eq('c\nb\nz1\ny2\na3', cm.getValue());
}, { value: 'z1\ny2\na3\nc\nb'});
testVim('ex_sort_pattern_alpha_num', function(cm, vim, helpers) {
  helpers.doEx('sort /[a-z][0-9]/');
  eq('c\nb\na3\ny2\nz1', cm.getValue());
}, { value: 'z1\ny2\na3\nc\nb'});
// test for :global command
testVim('ex_global', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('g/one/s//two');
  eq('two one\n two one\n two one', cm.getValue());
  helpers.doEx('1,2g/two/s//one');
  eq('one one\n one one\n two one', cm.getValue());
  helpers.doEx('g/^ /');
  eq(' one one\n two one', helpers.getNotificationText());
}, {value: 'one one\n one one\n one one'});
testVim('ex_normal', function(cm, vim, helpers) {
  helpers.doEx('norm /<Esc>"/p');
  helpers.doEx('norm /x<Cr>"/p');
  helpers.doEx('norm /h<Esc>"/p');
  helpers.doEx('norm /one<Cr>3li<Right> <Esc>"/p');
  eq('one one\nxxx\none one\none one', cm.getValue());
  
  cm.setCursor(0, 0);
  helpers.doEx('g/one/normal    cw 1<lt>Esc><Esc>$i$');
  helpers.doKeys("rt");
  eq(' 1<Esc> on$e\nxxx\n 1<Esc> on$e\n 1<Esc> on$t', cm.getValue());
  helpers.doKeys('/', '<', '\n');
  helpers.doKeys('x', 'x', 'p');
  eq(' 1sEc> on$e\nxxx\n 1<Esc> on$e\n 1<Esc> on$t', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doEx('map k j');
  helpers.doEx('normal kkk');
  helpers.assertCursorAt(3, 0);
  helpers.doEx('normal! kkk');
  helpers.assertCursorAt(0, 0);
}, {value: 'one one\nx\none\none one'});
testVim('ex_global_substitute_join', function(cm, vim, helpers) {
  helpers.doEx('g/o/s/\\n/;');
  eq('one;two\nthree\nfour;five\n', cm.getValue());
}, {value: 'one\ntwo\nthree\nfour\nfive\n'});
testVim('ex_global_substitute_split', function(cm, vim, helpers) {
  helpers.doEx('g/e/s/[or]/\\n');
  eq('\nne\ntwo\nth\nee\nfour\nfive\n', cm.getValue());
}, {value: 'one\ntwo\nthree\nfour\nfive\n'});
testVim('ex_global_delete', function(cm, vim, helpers) {
  helpers.doEx('g/e/d\\n');
  eq('two\nfour\nsix\n---', cm.getValue());
  helpers.doKeys('u');
  helpers.doEx('g/e/g/v/d\\n');
  eq('one\ntwo\nthree\nfour\nsix\nnine\n---', cm.getValue());
}, {value: 'one\ntwo\nthree\nfour\nfive\nsix\nseven\nnine\n---'});
testVim('ex_global_confirm', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('g/one/s//two/gc');
  helpers.doKeys('n');
  helpers.doKeys('y');
  helpers.doKeys('a');
  helpers.doKeys('q');
  helpers.doKeys('y');
  eq('one two\n two two\n one one\n two one\n one one', cm.getValue());
}, {value: 'one one\n one one\n one one\n one one\n one one'});
// test for :vglobal command
testVim('ex_vglobal', function(cm, vim, helpers) {
  helpers.doEx('v/e/s/o/e');
  eq('one\n twe\n three\n feur\n five\n', cm.getValue());
  helpers.doEx('v/[vw]');
  eq('one\n three\n feur\n', helpers.getNotificationText());
}, {value: 'one\n two\n three\n four\n five\n'});
// Basic substitute tests.
testVim('ex_substitute_same_line', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doEx('s/one/two/g');
  eq('one one\n two two', cm.getValue());
}, { value: 'one one\n one one'});
testVim('ex_substitute_alternate_separator', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doEx('s#o/e#two#g');
  eq('o/e o/e\n two two', cm.getValue());
}, { value: 'o/e o/e\n o/e o/e'});
testVim('ex_substitute_full_file', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doEx('%s/one/two/g');
  eq('two two\n two two', cm.getValue());
}, { value: 'one one\n one one'});
testVim('ex_substitute_input_range', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doEx('1,3s/\\d/0/g');
  eq('0\n0\n0\n4', cm.getValue());
}, { value: '1\n2\n3\n4' });
testVim('ex_substitute_range_current_to_input', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  helpers.doEx('.,3s/\\d/0/g');
  eq('1\n0\n0\n4', cm.getValue());
}, { value: '1\n2\n3\n4' });
testVim('ex_substitute_range_input_to_current', function(cm, vim, helpers) {
  cm.setCursor(3, 0);
  helpers.doEx('2,.s/\\d/0/g');
  eq('1\n0\n0\n0\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_range_offset', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doEx('-1,+1s/\\d/0/g');
  eq('1\n0\n0\n0\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_range_implicit_offset', function(cm, vim, helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('.1,.3s/\\d/0/g');
  eq('1\n0\n0\n0\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_to_eof', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doEx('.,$s/\\d/0/g');
  eq('1\n2\n0\n0\n0', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_to_relative_eof', function(cm, vim, helpers) {
  cm.setCursor(4, 0);
  helpers.doEx('2,$-2s/\\d/0/g');
  eq('1\n0\n0\n4\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_range_mark', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('ma');
  cm.setCursor(0, 0);
  helpers.doEx('.,\'as/\\d/0/g');
  eq('0\n0\n0\n4\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_range_mark_offset', function(cm, vim, helpers) {
  cm.setCursor(2, 0);
  helpers.doKeys('ma');
  cm.setCursor(0, 0);
  helpers.doEx('\'a-1,\'a+1s/\\d/0/g');
  eq('1\n0\n0\n0\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_visual_range', function(cm, vim, helpers) {
  cm.setCursor(1, 0);
  // Set last visual mode selection marks '< and '> at lines 2 and 4
  helpers.doKeys('V', '2', 'j', 'v');
  helpers.doKeys(':');
  eq(document.activeElement.value, "'<,'>");
  helpers.doKeys('s/\\d/0/g', '\n');
  eq('1\n0\n0\n0\n5', cm.getValue());
}, { value: '1\n2\n3\n4\n5' });
testVim('ex_substitute_empty_query', function(cm, vim, helpers) {
  // If the query is empty, use last query.
  cm.setCursor(1, 0);
  helpers.doKeys('/', '1\n');
  helpers.doEx('s//b/g');
  eq('abb ab2 ab3', cm.getValue());
}, { value: 'a11 a12 a13' });
testVim('ex_substitute_javascript', function(cm, vim, helpers) {
  CodeMirror.Vim.setOption('pcre', false);
  cm.setCursor(1, 0);
  // Throw all the things that javascript likes to treat as special values
  // into the replace part. All should be literal (this is VIM).
  helpers.doEx('s/\\(\\d\\+\\)/$$ $\' $` $& \\1/g')
  eq('a $$ $\' $` $& 0 b', cm.getValue());

  cm.setValue('W12345678OR12345D');
  helpers.doEx('s/\\d//g');
  eq('WORD', cm.getValue());
}, { value: 'a 0 b' });
testVim('ex_substitute_empty_arguments', function(cm,vim,helpers) {
  cm.setCursor(0, 0);
  helpers.doEx('s/a/b/g');
  cm.setCursor(1, 0);
  helpers.doEx('s');
  eq('b b\nb a', cm.getValue());
}, {value: 'a a\na a'});
testVim('ex_substitute_highlight', function(cm,vim,helpers) {
  is(!searchHighlighted(vim));
  helpers.doKeys(':s/a');
  is(searchHighlighted(vim));
  helpers.doKeys('\n');
  is(!searchHighlighted(vim));
}, {value: 'a a\na a'});
testVim('ex_substitute_nopcre_special', function(cm, vim, helpers) {
  CodeMirror.Vim.setOption('pcre', false);

  cm.setValue('aabb1cxyz$^o aabb2cxyz$^o aabb3cxyz$^o aabb4cxyz$^o ');
  helpers.doEx(
    's/'
    + '\\v<a*(b|\\d){3}c?[x-z]+\\$\\^.> '
    + '\\V\\<a\\*\\(b\\|\\d\\)\\{3\\}c\\?\\[x-z]\\+$^\\.\\> '
    + '\\m\\<a*\\(b\\|\\d\\)\\{3}c\\?[x-z]\\+\\$\\^.\\> '
    + '\\M\\<a\\*\\(b\\|\\d\\)\\{3}c\\?\\[x-z]\\+\\$\\^\\.\\>'
    + '/M\\4 m\\3 V\\2 v\\1/'
  );
  eq('M4 m3 V2 v1 ', cm.getValue());
  
  cm.setValue('10 12 13 42');
  helpers.doEx('s/\\m\\(1\\)\\v\\ze(\\d+)/\\2\\1 a\\1/g')
  eq('01 a10 21 a12 31 a13 42', cm.getValue());
  helpers.doEx('s/2\\zs\\>/b/g');
  eq('01 a10 21 a12b 31 a13 42b', cm.getValue());
  helpers.doEx('s/\\m\\<\\d\\+ //g');
  eq('a10 a12b a13 42b', cm.getValue());
}, { value: '' });

// More complex substitute tests that test both pcre and nopcre options.
function testSubstitute(name, options) {
  testVim(name + '_pcre', function(cm, vim, helpers) {
    cm.setCursor(1, 0);
    CodeMirror.Vim.setOption('pcre', true);
    helpers.doEx(options.expr);
    eq(options.expectedValue, cm.getValue());
  }, options);
  // If no noPcreExpr is defined, assume that it's the same as the expr.
  var noPcreExpr = options.noPcreExpr ? options.noPcreExpr : options.expr;
  testVim(name + '_nopcre', function(cm, vim, helpers) {
    cm.setCursor(1, 0);
    CodeMirror.Vim.setOption('pcre', false);
    helpers.doEx(noPcreExpr);
    eq(options.expectedValue, cm.getValue());
  }, options);
}
testSubstitute('ex_substitute_capture', {
  value: 'a11 a12 a13',
  expectedValue: 'a1111 a1212 a1313',
  // $n is a backreference
  expr: 's/(\\d+)/$1$1/g',
  // \n is a backreference.
  noPcreExpr: 's/\\(\\d\\+\\)/\\1\\1/g'});
testSubstitute('ex_substitute_capture2', {
  value: 'a 0 b',
  expectedValue: 'a $00 b',
  expr: 's/(\\d+)/$$$1$1/g',
  noPcreExpr: 's/\\(\\d\\+\\)/$\\1\\1/g'});
testSubstitute('ex_substitute_nocapture', {
  value: 'a11 a12 a13',
  expectedValue: 'a$1$1 a$1$1 a$1$1',
  expr: 's/(\\d+)/$$1$$1/g',
  noPcreExpr: 's/\\(\\d\\+\\)/$1$1/g'});
testSubstitute('ex_substitute_nocapture2', {
  value: 'a 0 b',
  expectedValue: 'a $10 b',
  expr: 's/(\\d+)/$$1$1/g',
  noPcreExpr: 's/\\(\\d\\+\\)/\\$1\\1/g'});
testSubstitute('ex_substitute_nocapture', {
  value: 'a b c',
  expectedValue: 'a $ c',
  expr: 's/b/$$/',
  noPcreExpr: 's/b/$/'});
testSubstitute('ex_substitute_slash_regex', {
  value: 'one/two \n three/four',
  expectedValue: 'one|two \n three|four',
  expr: '%s/\\//|'});
testSubstitute('ex_substitute_pipe_regex', {
  value: 'one|two \n three|four',
  expectedValue: 'one,two \n three,four',
  expr: '%s/\\|/,/',
  noPcreExpr: '%s/|/,/'});
testSubstitute('ex_substitute_or_regex', {
  value: 'one|two \n three|four',
  expectedValue: 'ana|twa \n thraa|faar',
  expr: '%s/o|e|u/a/g',
  noPcreExpr: '%s/o\\|e\\|u/a/g'});
testSubstitute('ex_substitute_or_word_regex', {
  value: 'one|two \n three|four',
  expectedValue: 'five|five \n three|four',
  expr: '%s/(one|two)/five/g',
  noPcreExpr: '%s/\\(one\\|two\\)/five/g'});
testSubstitute('ex_substitute_forward_slash_regex', {
    value: 'forward slash \/ was here',
  expectedValue: 'forward slash  was here',
  expr: '%s#\\/##g',
  noPcreExpr: '%s#/##g'});
testVim("ex_substitute_ampersand_pcre", function(cm, vim, helpers) {
    cm.setCursor(0, 0);
    CodeMirror.Vim.setOption('pcre', true);
    helpers.doEx('%s/foo/namespace.&/');
    eq("namespace.foo", cm.getValue());
  }, { value: 'foo' });
testVim("ex_substitute_ampersand_multiple_pcre", function(cm, vim, helpers) {
    cm.setCursor(0, 0);
    CodeMirror.Vim.setOption('pcre', true);
    helpers.doEx('%s/f.o/namespace.&/');
    eq("namespace.foo\nnamespace.fzo", cm.getValue());
  }, { value: 'foo\nfzo' });
testVim("ex_escaped_ampersand_should_not_substitute_pcre", function(cm, vim, helpers) {
    cm.setCursor(0, 0);
    CodeMirror.Vim.setOption('pcre', true);
    helpers.doEx('%s/foo/namespace.\\&/');
    eq("namespace.&", cm.getValue());
  }, { value: 'foo' });
testSubstitute('ex_substitute_backslashslash_regex', {
  value: 'one\\two \n three\\four',
  expectedValue: 'one,two \n three,four',
  expr: '%s/\\\\/,'});
testSubstitute('ex_substitute_slash_replacement', {
  value: 'one,two \n three,four',
  expectedValue: 'one/two \n three/four',
  expr: '%s/,/\\/'});
testSubstitute('ex_substitute_backslash_replacement', {
  value: 'one,two \n three,four',
  expectedValue: 'one\\two \n three\\four',
  expr: '%s/,/\\\\/g'});
testSubstitute('ex_substitute_multibackslash_replacement', {
  value: 'one,two \n three,four',
  expectedValue: 'one\\\\\\\\two \n three\\\\\\\\four', // 2*8 backslashes.
  expr: '%s/,/\\\\\\\\\\\\\\\\/g'}); // 16 backslashes.
testSubstitute('ex_substitute_dollar_assertion', {
  value: 'one,two \n three,four',
  expectedValue: 'one,two ,\n three,four,',
  expr: '%s/$/,/g'});
testSubstitute('ex_substitute_dollar_assertion_empty_lines', {
  value: '\n\n\n\n\n\n',
  expectedValue: ';\n;\n;\n;\n;\n;\n;',
  expr: '%s/$/;/g'});
testSubstitute('ex_substitute_dollar_literal', {
  value: 'one$two\n$three\nfour$\n$',
  expectedValue: 'one,two\n,three\nfour,\n,',
  expr: '%s/\\$/,/g'});
testSubstitute('ex_substitute_newline_match', {
  value: 'one,two \n three,four',
  expectedValue: 'one,two , three,four',
  expr: '%s/\\n/,/g'});
testSubstitute('ex_substitute_newline_join_global', {
  value: 'one,two \n three,four \n five \n six',
  expectedValue: 'one,two \n three,four , five \n six',
  expr: '2s/\\n/,/g'});
testSubstitute('ex_substitute_newline_join_noglobal', {
  value: 'one,two \n three,four \n five \n six\n',
  expectedValue: 'one,two \n three,four , five , six\n',
  expr: '2,3s/\\n/,/'});
testSubstitute('ex_substitute_newline_replacement', {
  value: 'one,two, \n three,four,',
  expectedValue: 'one\ntwo\n \n three\nfour\n',
  expr: '%s/,/\\n/g'});
testSubstitute('ex_substitute_newline_multiple_splits', {
  value: 'one,two, \n three,four,five,six, \n seven,',
  expectedValue: 'one,two, \n three\nfour\nfive\nsix\n \n seven,',
  expr: '2s/,/\\n/g'});
testSubstitute('ex_substitute_newline_first_occurrences', {
  value: 'one,two, \n three,four,five,six, \n seven,',
  expectedValue: 'one\ntwo, \n three\nfour,five,six, \n seven\n',
  expr: '%s/,/\\n/'});
testSubstitute('ex_substitute_braces_word', {
  value: 'ababab abb ab{2}',
  expectedValue: 'ab abb ab{2}',
  expr: '%s/(ab){2}//g',
  noPcreExpr: '%s/\\(ab\\)\\{2\\}//g'});
testSubstitute('ex_substitute_braces_range', {
  value: 'a aa aaa aaaa',
  expectedValue: 'a   a',
  expr: '%s/a{2,3}//g',
  noPcreExpr: '%s/a\\{2,3\\}//g'});
testSubstitute('ex_substitute_braces_literal', {
  value: 'ababab abb ab{2}',
  expectedValue: 'ababab abb ',
  expr: '%s/ab\\{2\\}//g',
  noPcreExpr: '%s/ab{2}//g'});
testSubstitute('ex_substitute_braces_char', {
  value: 'ababab abb ab{2}',
  expectedValue: 'ababab  ab{2}',
  expr: '%s/ab{2}//g',
  noPcreExpr: '%s/ab\\{2\\}//g'});
testSubstitute('ex_substitute_braces_no_escape', {
  value: 'ababab abb ab{2}',
  expectedValue: 'ababab  ab{2}',
  expr: '%s/ab{2}//g',
  noPcreExpr: '%s/ab\\{2}//g'});
testSubstitute('ex_substitute_count', {
  value: '1\n2\n3\n4',
  expectedValue: '1\n0\n0\n4',
  expr: 's/\\d/0/i 2'});
testSubstitute('ex_substitute_count_with_range', {
  value: '1\n2\n3\n4',
  expectedValue: '1\n2\n0\n0',
  expr: '1,3s/\\d/0/ 3'});
testSubstitute('ex_substitute_not_global', {
  value: 'aaa\nbaa\ncaa',
  expectedValue: 'xaa\nbxa\ncxa',
  expr: '%s/a/x/'});
testSubstitute('ex_substitute_optional', {
  value: 'aaa  aa\n aa',
  expectedValue: '<aaa> <> <aa>\n<> <aa>',
  expr: '%s/(a*)/<$1>/g',
  noPcreExpr: '%s/\\(a*\\)/<\\1>/g'});
testSubstitute('ex_substitute_empty_match', {
  value: 'aaa  aa\n aa\nbb\n',
  expectedValue: '<aaa>  <aa>\n <aa>\nbb<>\n<>',
  expr: '%s/(a+|$)/<$1>/g',
  noPcreExpr: '%s/\\(a\\+\\|$\\)/<\\1>/g'});
testSubstitute('ex_substitute_empty_or_match', {
  value: '1234\n567\n89\n0\n',
  expectedValue: '<12><34>\n<56>7<>\n<89>\n0<>\n<>',
  expr: '%s/(..|$)/<$1>/g',
  noPcreExpr: '%s/\\(..\\|$\\)/<\\1>/g'});
function testSubstituteConfirm(name, command, initialValue, expectedValue, keys, finalPos) {
  testVim(name, function(cm, vim, helpers) {
    helpers.doEx(command);
    for (var i = 0; i < keys.length; i++) {
      helpers.doKeys(keys.charAt(i))
    }
    eq(expectedValue, cm.getValue());
    helpers.assertCursorAt(finalPos);
  }, { value: initialValue });
}
testSubstituteConfirm('ex_substitute_confirm_emptydoc',
    '%s/x/b/c', '', '', '', makeCursor(0, 0));
testSubstituteConfirm('ex_substitute_confirm_nomatch',
    '%s/x/b/c', 'ba a\nbab', 'ba a\nbab', '', makeCursor(0, 0));
testSubstituteConfirm('ex_substitute_confirm_accept',
    '%s/a/b/cg', 'ba a\nbab', 'bb b\nbbb', 'yyy', makeCursor(1, 1));
testSubstituteConfirm('ex_substitute_confirm_random_keys',
    '%s/a/b/cg', 'ba a\nbab', 'bb b\nbbb', 'ysdkywerty', makeCursor(1, 1));
testSubstituteConfirm('ex_substitute_confirm_some',
    '%s/a/b/cg', 'ba a\nbab', 'bb a\nbbb', 'yny', makeCursor(1, 1));
testSubstituteConfirm('ex_substitute_confirm_all',
    '%s/a/b/cg', 'ba a\nbab', 'bb b\nbbb', 'a', makeCursor(1, 1));
testSubstituteConfirm('ex_substitute_confirm_accept_then_all',
    '%s/a/b/cg', 'ba a\nbab', 'bb b\nbbb', 'ya', makeCursor(1, 1));
testSubstituteConfirm('ex_substitute_confirm_quit',
    '%s/a/b/cg', 'ba a\nbab', 'bb a\nbab', 'yq', makeCursor(0, 3));
testSubstituteConfirm('ex_substitute_confirm_last',
    '%s/a/b/cg', 'ba a\nbab', 'bb b\nbab', 'yl', makeCursor(0, 3));
testSubstituteConfirm('ex_substitute_confirm_oneline',
    '1s/a/b/cg', 'ba a\nbab', 'bb b\nbab', 'yl', makeCursor(0, 3));
testSubstituteConfirm('ex_substitute_confirm_range_accept',
    '1,2s/a/b/cg', 'aa\na \na\na', 'bb\nb \na\na', 'yyy', makeCursor(1, 0));
testSubstituteConfirm('ex_substitute_confirm_range_some',
    '1,3s/a/b/cg', 'aa\na \na\na', 'ba\nb \nb\na', 'ynyy', makeCursor(2, 0));
testSubstituteConfirm('ex_substitute_confirm_range_all',
    '1,3s/a/b/cg', 'aa\na \na\na', 'bb\nb \nb\na', 'a', makeCursor(2, 0));
testSubstituteConfirm('ex_substitute_confirm_range_last',
    '1,3s/a/b/cg', 'aa\na \na\na', 'bb\nb \na\na', 'yyl', makeCursor(1, 0));
//:noh should clear highlighting of search-results but allow to resume search through n
testVim('ex_noh_clearSearchHighlight', function(cm, vim, helpers) {
  is(!searchHighlighted(vim))
  helpers.doKeys('?', 'match', '\n');
  is(searchHighlighted(vim))
  helpers.doEx('noh');
  is(!searchHighlighted(vim));
  helpers.doKeys('n');
  helpers.assertCursorAt(0, 11,'can\'t resume search after clearing highlighting');
}, { value: 'match nope match \n nope Match' });
testVim('ex_yank', function (cm, vim, helpers) {
  var curStart = makeCursor(3, 0);
  cm.setCursor(curStart);
  helpers.doEx('y');
  var register = helpers.getRegisterController().getRegister();
  var line = cm.getLine(3);
  eq(line + '\n', register.toString());
});
testVim('set_boolean', function(cm, vim, helpers) {
  CodeMirror.Vim.defineOption('testoption', true, 'boolean');
  // Test default value is set.
  is(CodeMirror.Vim.getOption('testoption'));
  // Test fail to set to non-boolean
  var result = CodeMirror.Vim.setOption('testoption', '5');
  is(result instanceof Error);
  // Test setOption
  CodeMirror.Vim.setOption('testoption', false);
  is(!CodeMirror.Vim.getOption('testoption'));
});
testVim('ex_set_boolean', function(cm, vim, helpers) {
  CodeMirror.Vim.defineOption('testoption', true, 'boolean');
  // Test default value is set.
  is(CodeMirror.Vim.getOption('testoption'));
  is(!cm.state.currentNotificationClose);
  // Test fail to set to non-boolean
  helpers.doEx('set testoption=22');
  is(cm.state.currentNotificationClose);
  // Test setOption
  helpers.doEx('set notestoption');
  is(!CodeMirror.Vim.getOption('testoption'));
  // Test toggle with !
  helpers.doEx('set notestoption!');
  is(CodeMirror.Vim.getOption('testoption'));
  helpers.doEx('set notestoption!');
  is(!CodeMirror.Vim.getOption('testoption'));
  helpers.doEx('set testoption!');
  is(CodeMirror.Vim.getOption('testoption'));
  helpers.doEx('set testoption!');
  is(!CodeMirror.Vim.getOption('testoption'));
});
// Make sure that langmap option is properly defined and "=" does not break option value parsing
testVim('set_langmap', function(cm, vim, helpers) {
  helpers.doEx('set langmap==j');
  cm.setCursor(0, 0);
  helpers.doKeys('=');
  helpers.assertCursorAt(1,0);
});
testVim('set_string', function(cm, vim, helpers) {
  CodeMirror.Vim.defineOption('testoption', 'a', 'string');
  // Test default value is set.
  eq('a', CodeMirror.Vim.getOption('testoption'));
  // Test no fail to set non-string.
  var result = CodeMirror.Vim.setOption('testoption', true);
  is(!result);
  // Test fail to set 'notestoption'
  result = CodeMirror.Vim.setOption('notestoption', 'b');
  is(result instanceof Error);
  // Test setOption
  CodeMirror.Vim.setOption('testoption', 'c');
  eq('c', CodeMirror.Vim.getOption('testoption'));
});
testVim('ex_set_string', function(cm, vim, helpers) {
  CodeMirror.Vim.defineOption('testopt', 'a', 'string');
  // Test default value is set.
  eq('a', CodeMirror.Vim.getOption('testopt'));
  // Test fail to set 'notestopt'
  is(!cm.state.currentNotificationClose);
  helpers.doEx('set notestopt=b');
  is(cm.state.currentNotificationClose);
  // Test setOption
  helpers.doEx('set testopt=c')
  eq('c', CodeMirror.Vim.getOption('testopt'));
  helpers.doEx('set testopt=c')
  eq('c', CodeMirror.Vim.getOption('testopt', cm)); //local || global
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'})); // local
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'})); // global
  eq('c', CodeMirror.Vim.getOption('testopt')); // global
  // Test setOption global
  helpers.doEx('setg testopt=d')
  eq('c', CodeMirror.Vim.getOption('testopt', cm));
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'}));
  eq('d', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'}));
  eq('d', CodeMirror.Vim.getOption('testopt'));
  // Test setOption local
  helpers.doEx('setl testopt=e')
  eq('e', CodeMirror.Vim.getOption('testopt', cm));
  eq('e', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'}));
  eq('d', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'}));
  eq('d', CodeMirror.Vim.getOption('testopt'));
});
testVim('ex_set_callback', function(cm, vim, helpers) {
  var global;

  function cb(val, cm, cfg) {
    if (val === undefined) {
      // Getter
      if (cm) {
        return cm._local;
      } else {
        return global;
      }
    } else {
      // Setter
      if (cm) {
        cm._local = val;
      } else {
        global = val;
      }
    }
  }

  CodeMirror.Vim.defineOption('testopt', 'a', 'string', cb);
  // Test default value is set.
  eq('a', CodeMirror.Vim.getOption('testopt'));
  // Test fail to set 'notestopt'
  is(!cm.state.currentNotificationClose);
  helpers.doEx('set notestopt=b');
  is(cm.state.currentNotificationClose);
  // Test setOption (Identical to the string tests, but via callback instead)
  helpers.doEx('set testopt=c')
  eq('c', CodeMirror.Vim.getOption('testopt', cm)); //local || global
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'})); // local
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'})); // global
  eq('c', CodeMirror.Vim.getOption('testopt')); // global
  // Test setOption global
  helpers.doEx('setg testopt=d')
  eq('c', CodeMirror.Vim.getOption('testopt', cm));
  eq('c', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'}));
  eq('d', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'}));
  eq('d', CodeMirror.Vim.getOption('testopt'));
  // Test setOption local
  helpers.doEx('setl testopt=e')
  eq('e', CodeMirror.Vim.getOption('testopt', cm));
  eq('e', CodeMirror.Vim.getOption('testopt', cm, {scope: 'local'}));
  eq('d', CodeMirror.Vim.getOption('testopt', cm, {scope: 'global'}));
  eq('d', CodeMirror.Vim.getOption('testopt'));
})
testVim('ex_set_filetype', function(cm, vim, helpers) {
  CodeMirror.defineMode('test_mode', function() {
    return {token: function(stream) {
      stream.match(/^\s+|^\S+/);
    }};
  });
  CodeMirror.defineMode('test_mode_2', function() {
    return {token: function(stream) {
      stream.match(/^\s+|^\S+/);
    }};
  });
  // Test mode is set.
  helpers.doEx('set filetype=test_mode');
  eq('test_mode', cm.getMode().name);
  // Test 'ft' alias also sets mode.
  helpers.doEx('set ft=test_mode_2');
  eq('test_mode_2', cm.getMode().name);
});
testVim('ex_set_filetype_null', function(cm, vim, helpers) {
  CodeMirror.defineMode('test_mode', function() {
    return {token: function(stream) {
      stream.match(/^\s+|^\S+/);
    }};
  });
  cm.setOption('mode', 'test_mode');
  // Test mode is set to null.
  helpers.doEx('set filetype=');
  eq('null', cm.getMode().name);
});

testVim('map_prompt', function(cm, vim, helpers) {
  is(!searchHighlighted(vim));

  helpers.doKeys('/a\n');
  helpers.doKeys('i');
  is(searchHighlighted(vim));
  helpers.doKeys('<Esc>');
  helpers.doEx('nohl');
  is(!searchHighlighted(vim));
  helpers.assertCursorAt(1, 2);

  helpers.doEx('nnoremap i :nohl<CR>i<space>xx<lt>');
  helpers.doEx('map :sayhi ihi<Esc>');
  helpers.doEx('map j :sayhi<CR>/<up><up>b');

  helpers.doKeys('/1\n');
  helpers.assertCursorAt(1, 1);

  helpers.doKeys('j');
  eq(cm.getWrapperElement().querySelector("input").value, "ab");
  helpers.doKeys('<CR>');
  is(searchHighlighted(vim));
  helpers.doKeys('i');
  is(!searchHighlighted(vim));

  eq(cm.getValue(), ' 0 xyz\n hi1  xx<abc \n 2 abc');

  helpers.doKeys('mapclear');
}, { value: ' 0 xyz\n 1 abc \n 2 abc' });
testVim('mapclear', function(cm, vim, helpers) {
  CodeMirror.Vim.map('w', 'l');
  cm.setCursor(0, 0);
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('w');
  helpers.assertCursorAt(0, 1);
  CodeMirror.Vim.mapclear('visual');
  helpers.doKeys('v', 'w', 'v');
  helpers.assertCursorAt(0, 4);
  helpers.doKeys('w');
  helpers.assertCursorAt(0, 5);
}, { value: 'abc abc' });
testVim('mapclear_context', function(cm, vim, helpers) {
  CodeMirror.Vim.map('w', 'l', 'normal');
  cm.setCursor(0, 0);
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('w');
  helpers.assertCursorAt(0, 1);
  CodeMirror.Vim.mapclear('normal');
  helpers.doKeys('w');
  helpers.assertCursorAt(0, 4);
}, { value: 'abc abc' });

testVim('ex_map_key2key', function(cm, vim, helpers) {
  helpers.doEx('map a x');
  helpers.doKeys('a');
  helpers.assertCursorAt(0, 0);
  eq('bc', cm.getValue());
}, { value: 'abc' });
testVim('ex_unmap_key2key', function(cm, vim, helpers) {
  helpers.doEx('map a x');
  helpers.doEx('unmap a');
  helpers.doKeys('a');
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'abc' });
testVim('ex_unmap_key2key_does_not_remove_default', function(cm, vim, helpers) {
  helpers.doEx('unmap a');
  is(/No such mapping: unmap a/.test(helpers.getNotificationText()));
  helpers.doKeys('a');
  eq('vim-insert', cm.getOption('keyMap'));
}, { value: 'abc' });
testVim('ex_map_key2key_to_colon', function(cm, vim, helpers) {
  helpers.doEx('map ; :');
  var dialogOpened = false;
  cm.openDialog = function() {
    dialogOpened = true;
  }
  helpers.doKeys(';');
  eq(dialogOpened, true);
});
testVim('ex_map_ex2key:', function(cm, vim, helpers) {
  helpers.doEx('map :del x');
  helpers.doEx('del');
  helpers.assertCursorAt(0, 0);
  eq('bc', cm.getValue());
}, { value: 'abc' });
testVim('ex_map_ex2ex', function(cm, vim, helpers) {
  helpers.doEx('map :del :w');
  var tmp = CodeMirror.commands.save;
  var written = false;
  var actualCm;
  CodeMirror.commands.save = function(cm) {
    written = true;
    actualCm = cm;
  };
  helpers.doEx('del');
  CodeMirror.commands.save = tmp;
  eq(written, true);
  eq(actualCm, cm);
});
testVim('ex_map_key2ex', function(cm, vim, helpers) {
  helpers.doEx('map a :w<CR>');
  var tmp = CodeMirror.commands.save;
  var written = false;
  var actualCm;
  CodeMirror.commands.save = function(cm) {
    written = true;
    actualCm = cm;
  };
  helpers.doKeys('a');
  CodeMirror.commands.save = tmp;
  eq(written, true);
  eq(actualCm, cm);
});
testVim('ex_map_key2key_visual_api', function(cm, vim, helpers) {
  CodeMirror.Vim.map('b', ':w<CR>', 'visual');
  var tmp = CodeMirror.commands.save;
  var written = false;
  var actualCm;
  CodeMirror.commands.save = function(cm) {
    written = true;
    actualCm = cm;
  };
  // Mapping should not work in normal mode.
  helpers.doKeys('b');
  eq(written, false);
  // Mapping should work in visual mode.
  helpers.doKeys('v', 'b');
  eq(written, true);
  eq(actualCm, cm);

  CodeMirror.commands.save = tmp;
});
testVim('ex_omap', function(cm, vim, helpers) {
  helpers.doKeys('0', 'w', 'd', 'w');
  eq(cm.getValue(), 'hello world');
  helpers.doKeys('u');
  helpers.doKeys(':', 'omap w $\n');
  helpers.doKeys( '0', 'w');
  helpers.assertCursorAt(0, 6);
  helpers.doKeys('d', 'w');
  eq(cm.getValue(), 'hello ');
}, {value: 'hello unfair world'});
testVim('ex_nmap', function(cm, vim, helpers) {
  cm.setCursor(0, 3);
  helpers.doEx('nmap k gj');
  helpers.doKeys('k');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('d', 'k');
  eq(cm.getValue(), 'world');
  helpers.doKeys('u');
  cm.setCursor(1, 3);
  helpers.doEx('map k gj');
  helpers.doKeys('d', 'k');
  eq(cm.getValue(), 'hello\nunfld');
  helpers.assertCursorAt(1, 3);
  helpers.doKeys('<Up>');
  helpers.assertCursorAt(0, 3);
}, {value: 'hello\nunfair\nworld'});
testVim('ex_imap', function(cm, vim, helpers) {
  CodeMirror.Vim.map('jk', '<Esc>', 'insert');
  helpers.doKeys('i');
  is(vim.insertMode);
  helpers.doKeys('j', 'k');
  is(!vim.insertMode);
  cm.setCursor(0, 1);
  CodeMirror.Vim.map('jj', '<Esc>', 'insert');
  helpers.doKeys('<C-v>', '2', 'j', 'l', 'c');
  helpers.doKeys('f', 'o');
  eq('1fo4\n5fo8\nafodefg', cm.getValue());
  helpers.doKeys('j', 'j');
  cm.setCursor(0, 0);
  helpers.doKeys('.');
  eq('foo4\nfoo8\nfoodefg', cm.getValue());
  helpers.doKeys('R', 'x', 'j', 'j');
  eq('xoo4\nfoo8\nfoodefg', cm.getValue());
  helpers.doKeys('i');
  cm.setSelections([
    {head: makeCursor(0, 0), anchor: makeCursor(0, 1)},
    {head: makeCursor(1, 0), anchor: makeCursor(1, 2)}
  ]);
  helpers.doKeys('j');
  eq('joo4\njo8\nfoodefg', cm.getValue());
  helpers.doKeys('j');
  eq('xoo4\nfoo8\nfoodefg', cm.getValue());
  
  if (cm.forEachSelection) {
    cm.setSelections([
      {head: makeCursor(0, 2), anchor: makeCursor(0, 2)},
      {head: makeCursor(1, 2), anchor: makeCursor(1, 2)},
      {head: makeCursor(2, 4), anchor: makeCursor(2, 4)}
    ]);
    helpers.doKeys('R', 'x');
    eq('xox4\nfox8\nfoodxfg', cm.getValue());
    helpers.doKeys('j');
    eq('xoxj\nfoxj\nfoodxjg', cm.getValue());
    helpers.doKeys('k');
    eq('xox4\nfox8\nfoodxfg', cm.getValue());
    eq(3, cm.listSelections().length);
  }

  cm.setValue('1\n2')
  helpers.doKeys('gg', 'dd');
  helpers.doEx('imap a <C-c>');
  helpers.doKeys('i', 'x', 'a', 'p');
  eq('x2\n1', cm.getValue());
}, { value: '1234\n5678\nabcdefg' });
testVim('ex_unmap_api', function(cm, vim, helpers) {
  CodeMirror.Vim.map('<Alt-X>', 'gg', 'normal');
  is(CodeMirror.Vim.handleKey(cm, "<Alt-X>", "normal"), "Alt-X key is mapped");
  CodeMirror.Vim.unmap("<Alt-X>", "normal");
  is(!CodeMirror.Vim.handleKey(cm, "<Alt-X>", "normal"), "Alt-X key is unmapped");
});
// Testing registration of functions as ex-commands and mapping to <Key>-keys
testVim('ex_api_test', function(cm, vim, helpers) {
  var res=false;
  var val='from';
  CodeMirror.Vim.defineEx('extest','ext',function(cm,params){
    if(params.args)val=params.args[0];
    else res=true;
  });
  helpers.doEx(':ext to');
  eq(val,'to','Defining ex-command failed');
  CodeMirror.Vim.map('<C-CR><Space>',':ext<CR>');
  helpers.doKeys('<C-CR>','<Space>');
  is(res,'Mapping to key failed');
});
// Testing ex-commands with non-alpha names.
testVim('ex_special_names', function(cm, vim, helpers) {
  var ran,val;
  var cmds = ['!','!!','#','&','*','<','=','>','@','@@','~','regtest1','RT2'];
  cmds.forEach(function(name){
    CodeMirror.Vim.defineEx(name,'',function(cm,params){
      ran=params.commandName;
      val=params.argString;
    });
    helpers.doEx(':'+name);
    eq(ran,name,'Running ex-command failed');
    helpers.doEx(':'+name+' x');
    eq(val,' x','Running ex-command with param failed: '+name);
    if(/^\W+$/.test(name)){
      helpers.doEx(':'+name+'y');
      eq(val,'y','Running ex-command with param failed: '+name);
    }
    else{
      helpers.doEx(':'+name+'-y');
      eq(val,'-y','Running ex-command with param failed: '+name);
    }
    if(name!=='!'){
      helpers.doEx(':'+name+'!');
      eq(ran,name,'Running ex-command with bang failed');
      eq(val,'!','Running ex-command with bang failed: '+name);
      helpers.doEx(':'+name+'!z');
      eq(ran,name,'Running ex-command with bang & param failed');
      eq(val,'!z','Running ex-command with bang & param failed: '+name);
    }
  });
});
// For now, this test needs to be last because it messes up : for future tests.
testVim('ex_map_key2key_from_colon', function(cm, vim, helpers) {
  helpers.doEx('map : x');
  helpers.doKeys(':');
  helpers.assertCursorAt(0, 0);
  eq('bc', cm.getValue());
}, { value: 'abc' });

testVim('map <Esc> in normal mode', function(cm, vim, helpers) {
  CodeMirror.Vim.noremap('<Esc>', 'i', 'normal');
  helpers.doKeys('<Esc>');
  is(vim.insertMode, "Didn't switch to insert mode.");
  helpers.doKeys('<Esc>');
  is(!vim.insertMode, "Didn't switch to normal mode.");
});

testVim('noremap', function(cm, vim, helpers) {
  helpers.doEx('noremap ; l');
  helpers.doEx('map l $');
  helpers.doEx('map q l');
  helpers.doKeys('l');
  helpers.assertCursorAt(0, 4);
  cm.setCursor(0, 0);
  helpers.doKeys('q');
  helpers.assertCursorAt(0, 4);
  cm.setCursor(0, 0);
  eq('wOrd1', cm.getValue());
  // Mapping should work in normal mode.
  helpers.doKeys(';', 'r', '1');
  eq('w1rd1', cm.getValue());
  // Mapping will not work in insert mode because of no current fallback
  // keyToKey mapping support.
  helpers.doKeys('i', ';', '<Esc>');
  eq('w;1rd1', cm.getValue());
  // unmap all mappings
  helpers.doEx('mapclear');
  cm.setCursor(0, 0);
  helpers.doKeys('l');
  helpers.assertCursorAt(0, 1);
  // map key to itself
  helpers.doKeys('x', 'p', 'l');
  eq('w1;rd1', cm.getValue());
  helpers.doEx('noremap x "_x');
  helpers.doKeys('x', 'p');
  eq('w1;d;1', cm.getValue());
  helpers.doEx('mapclear');
}, { value: 'wOrd1' });
// noremap should capture all mappings of the rhs 
testVim('noremap_all_mappings', function(cm, vim, helpers) {
  // mapping to 'u' should undo in normal mode and lowercase in visual mode
  CodeMirror.Vim.noremap('a', 'u');
  helpers.doKeys('y', 'y', 'p');
  eq('HeY\nHeY', cm.getValue());
  // undo
  helpers.doKeys('a');
  eq('HeY', cm.getValue());
  // lowercase
  helpers.doKeys('V', 'a');
  eq('hey', cm.getValue());
}, { value: 'HeY' });
testVim('noremap_swap', function(cm, vim, helpers) {
  CodeMirror.Vim.noremap('i', 'a', 'normal');
  CodeMirror.Vim.noremap('a', 'i', 'normal');
  cm.setCursor(0, 0);
  // 'a' should act like 'i'.
  helpers.doKeys('a');
  eqCursorPos(new Pos(0, 0), cm.getCursor());
  // ...and 'i' should act like 'a'.
  helpers.doKeys('<Esc>', 'i');
  eqCursorPos(new Pos(0, 1), cm.getCursor());
}, { value: 'foo' });
testVim('noremap_map_interaction', function(cm, vim, helpers) {
  // noremap should clobber map
  CodeMirror.Vim.map(';', 'l');
  CodeMirror.Vim.noremap(';', 'l');
  CodeMirror.Vim.map('l', 'j');
  cm.setCursor(0, 0);
  helpers.doKeys(';');
  eqCursorPos(new Pos(0, 1), cm.getCursor());
  helpers.doKeys('l');
  eqCursorPos(new Pos(1, 1), cm.getCursor());
  // map should be able to point to a noremap
  CodeMirror.Vim.map('m', ';');
  helpers.doKeys('m');
  eqCursorPos(new Pos(1, 2), cm.getCursor());
}, { value: 'wOrd1\nwOrd2' });
testVim('noremap_map_interaction2', function(cm, vim, helpers) {
  // map should point to the most recent noremap
  CodeMirror.Vim.noremap(';', 'l');
  CodeMirror.Vim.map('m', ';');
  CodeMirror.Vim.noremap(';', 'h');
  cm.setCursor(0, 0);
  helpers.doKeys('l');
  eqCursorPos(new Pos(0, 1), cm.getCursor());
  helpers.doKeys('m');
  eqCursorPos(new Pos(0, 0), cm.getCursor());
}, { value: 'wOrd1\nwOrd2' });

testVim('gq_and_gw', function(cm, vim, helpers) {
  cm.setValue(
    "1\n2\nhello world\n"
    + "xxx ".repeat(20)
    + "\nyyy"
    + "\n\nnext\nparagraph"
  );
  cm.setCursor(2,5);
  helpers.doKeys("gqgq");
  helpers.assertCursorAt(2, 0);
  eq(cm.getLine(2), "hello world");

  helpers.doKeys("gqj");
  helpers.assertCursorAt(3, 0);
  eq(cm.getLine(3), "xxx xxx xxx ")

  helpers.doKeys("gq}")
  helpers.assertCursorAt(4, 0);
  eq(cm.getLine(3), "xxx xxx xxx yyy")

  helpers.doKeys("gqG");
  helpers.doKeys("gqgg");
  helpers.doKeys(":set tw=15\n");

  helpers.doKeys("gg", "V", "gq");
  eq(cm.getLine(0), "1 2 hello world");
  eq(cm.getLine(5), "xxx xxx xxx xxx yyy");
  helpers.doKeys(":6\n");
  helpers.doKeys("gqq");

  eq(cm.getLine(6), "yyy");
}, { value: 'wOrd1\nwOrd2' });

testVim('updateStatus', function(cm, vim, helpers) {
  var keys = '';
  CodeMirror.on(cm, 'vim-keypress', function(key) {
    keys = keys + key;
  });
  CodeMirror.on(cm, 'vim-command-done', function(e) {
    keys = '';
  });
  helpers.doKeys('d');
  eq(keys, 'd');
  helpers.doKeys('/', 'match', '\n');
  eq(keys, '');
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('d');
  eq(keys, 'd');
  helpers.doKeys('/', '<Esc>');
  eq(keys, '');
  helpers.doKeys('d');
  eq(keys, 'd');
  helpers.doKeys(':');
  eq(keys, 'd:');
  helpers.doKeys('<Esc>');
  eq(keys, '');
}, { value: 'text match match \n next' });

// Test event handlers
testVim('beforeSelectionChange', function(cm, vim, helpers) {
  cm.setCursor(0, 100);
  eqCursorPos(cm.getCursor('head'), cm.getCursor('anchor'));
}, { value: 'abc' });

testVim('increment_binary', function(cm, vim, helpers) {
  cm.setCursor(0, 4);
  helpers.doKeys('<C-a>');
  eq('0b001', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0b010', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0b001', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0b000', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('0b001', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0b010', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0b001', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0b000', cm.getValue());
}, { value: '0b000' });

testVim('increment_octal', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('<C-a>');
  eq('001', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('002', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('003', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('004', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('005', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('006', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('007', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('010', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('007', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('006', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('005', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('004', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('003', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('002', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('001', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('000', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('001', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('002', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('001', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('000', cm.getValue());
}, { value: '000' });

testVim('increment_decimal', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('<C-a>');
  eq('101', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('102', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('103', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('104', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('105', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('106', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('107', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('108', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('109', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('110', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('109', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('108', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('107', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('106', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('105', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('104', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('103', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('102', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('101', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('100', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('101', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('102', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('101', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('100', cm.getValue());
}, { value: '100' });

testVim('increment_decimal_single_zero', function(cm, vim, helpers) {
  helpers.doKeys('<C-a>');
  eq('1', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('2', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('3', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('4', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('5', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('6', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('7', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('8', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('9', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('10', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('9', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('8', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('7', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('6', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('5', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('4', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('3', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('2', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('1', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('1', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('2', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('1', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0', cm.getValue());
}, { value: '0' });

testVim('increment_hexadecimal', function(cm, vim, helpers) {
  cm.setCursor(0, 2);
  helpers.doKeys('<C-a>');
  eq('0x1', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x2', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x3', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x4', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x5', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x6', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x7', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x8', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x9', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xa', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xb', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xc', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xd', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xe', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0xf', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x10', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0f', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0e', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0d', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0c', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0b', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x0a', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x09', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x08', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x07', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x06', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x05', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x04', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x03', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x02', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x01', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x00', cm.getValue());
  cm.setCursor(0, 0);
  helpers.doKeys('<C-a>');
  eq('0x01', cm.getValue());
  helpers.doKeys('<C-a>');
  eq('0x02', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x01', cm.getValue());
  helpers.doKeys('<C-x>');
  eq('0x00', cm.getValue());
}, { value: '0x0' });

testVim('option_key_on_mac', function(cm, vim, helpers) {
  CodeMirror.isMac = true;
  helpers.assertCursorAt(0, 0);
  typeKey.optionTextInput('9', '}');
  helpers.assertCursorAt(3, 0);
  typeKey.optionTextInput('8', '{');
  helpers.assertCursorAt(0, 0);

  typeKey.utfTextInput('d', 'д');
  typeKey.utfTextInput('l', 'л');
  typeKey.utfTextInput('d', 'д');
  typeKey.utfTextInput('G', 'Г');
  eq('', cm.getValue());
  helpers.doKeys('"-p');
  eq('0', cm.getValue());
  //TODO bug in paste
  helpers.doKeys('l');
  helpers.assertCursorAt(0, 0);

  // map A-v
  helpers.doEx(':map <A-v> i<lt>A-v><Esc>');

  // verify that replace still works
  typeKey.utfTextInput('r', 'Ռ');
  typeKey.optionTextInput('v', '√');
  eq('√', cm.getValue());

  typeKey.optionTextInput('v', '√');
  eq('<A-v>√', cm.getValue());
  
  helpers.doEx(':map √ i√G<Esc>');
  typeKey.optionTextInput('v', '√');
  eq('<A-v√G>√', cm.getValue());

  helpers.doEx(':unmap √');
  typeKey.optionTextInput('v', '√');
  eq('<A-v√<A-v>G>√', cm.getValue());

  helpers.doEx(':unmap <A-v>');
  typeKey.optionTextInput('v', '√');
  eq('<A-v√<A-v>G>√', cm.getValue());

  CodeMirror.isMac = false;
}, { value: '0\n1\n2\n\n\n3\n4\n' });


!isOldCodeMirror && testVim('<C-c>copy', async function(cm, vim, helpers) {
  helpers.doKeys('v', 'e');
  is(vim.visualMode);
  typeKey.clipboard.$data = '';
  helpers.doKeys('<C-c>');
  eq(typeKey.clipboard.$data, 'hello');
  await delay(0);
  is(!vim.visualMode);
  helpers.doKeys('w', 'i', '<S-C-Right>');
  is(vim.insertMode);
  helpers.doKeys('<C-c>');
  is(vim.insertMode);
  helpers.doKeys('<C-c>');
  eq(typeKey.clipboard.$data, 'world');
  await delay(0);
  is(vim.insertMode);
  helpers.doKeys('<C-c>');
  is(!vim.insertMode);
}, { value: 'hello world' })

testVim('<C-r>_insert_mode', function(cm, vim, helpers) {
  helpers.assertCursorAt(0, 0);
  helpers.doKeys('d', 'w', 'A');
  helpers.doKeys('<C-r>', '-');
  eq('456 123 ', cm.getValue());
}, { value: '123 456 ' });

//
//  test correct langmap function
//
const dvorakLangmap = "'q,\\,w,.e,pr,yt,fy,gu,ci,ro,lp,/[,=],aa,os,ed,uf,ig,dh,hj,tk,nl,s\\;,-',\\;z,qx,jc,kv,xb,bn,mm,w\\,,v.,z/,[-,]=,\"Q,<W,>E,PR,YT,FY,GU,CI,RO,LP,?{,+},AA,OS,ED,UF,IG,DH,HJ,TK,NL,S:,_\",:Z,QX,JC,KV,XB,BN,MM,W<,V>,Z?";
// this test makes sure that remapping works on an example binding
isOldCodeMirror || testVim('langmap_dd', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(0, 0),
    new Pos(1, 0));
  var expectedLineCount = cm.lineCount() - 1;

  helpers.doKeys('e', 'e');

  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[1].textStart);
});
// this test serves two functions:
// - make sure that "dd" is **not** interpreted as delete line (correct unmapping)
// - make sure that "dd" **is** interpreted as move left twice (correct mapping)
isOldCodeMirror || testVim('langmap_hh', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  const startPos = word1.end;
  const endPos = offsetCursor(word1.end, 0, -2);

  cm.setCursor(startPos);
  helpers.doKeys('d', 'd');
  helpers.assertCursorAt(endPos);
});
// this test serves two functions:
// - make sure tha the register is properly remapped so that special registers aren't mixed up
// - make sure that recording and replaying macros works without "double remapping"
isOldCodeMirror || testVim('langmap_qqddq@q', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  cm.setCursor(0, 3);
  var expectedBuffer = cm.getRange(new Pos(1, 0),
    new Pos(2, 0));
  var expectedLineCount = cm.lineCount() - 2;

  helpers.doKeys('\'\'', 'e', 'e', '\'', '@\'');

  eq(expectedLineCount, cm.lineCount());
  var register = helpers.getRegisterController().getRegister();
  eq(expectedBuffer, register.toString());
  is(register.linewise);
  helpers.assertCursorAt(0, lines[2].textStart);
});
// this test makes sure that <character> directives are interpreted literally
isOldCodeMirror || testVim('langmap_fd', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  cm.setCursor(0, 0);
  helpers.doKeys('u', 'd');
  helpers.assertCursorAt(0, 4);
});
// this test makes sure that markers work properly
isOldCodeMirror || testVim('langmap_mark', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  cm.setCursor(2, 2);
  helpers.doKeys('m', '\'');
  cm.setCursor(0, 0);
  helpers.doKeys('`', '\'');
  helpers.assertCursorAt(2, 2);
  cm.setCursor(2, 0);
  cm.replaceRange('   h', cm.getCursor());
  cm.setCursor(0, 0);
  helpers.doKeys('-', '\'');
  helpers.assertCursorAt(2, 3);
});
// check that ctrl remapping works properly
isOldCodeMirror || testVim('langmap_visual_block', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap);

  cm.setCursor(0, 1);
  helpers.doKeys('<C-k>', '2', 'h', 'n', 'n', 'n', 'j');
  helpers.doKeys('hello');
  eq('1hello\n5hello\nahellofg', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(2, 3);
  helpers.doKeys('<C-k>', '2', 't', 'd', 'J');
  helpers.doKeys('world');
  eq('1hworld\n5hworld\nahworld', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});
// check that ctrl remapping can be disabled
isOldCodeMirror || testVim('langmap_visual_block_no_ctrl_remap', function(cm, vim, helpers) {
  CodeMirror.Vim.langmap(dvorakLangmap, false);

  cm.setCursor(0, 1);
  helpers.doKeys('<C-v>', '2', 'h', 'n', 'n', 'n', 'j');
  helpers.doKeys('hello');
  eq('1hello\n5hello\nahellofg', cm.getValue());
  helpers.doKeys('<Esc>');
  cm.setCursor(2, 3);
  helpers.doKeys('<C-v>', '2', 't', 'd', 'J');
  helpers.doKeys('world');
  eq('1hworld\n5hworld\nahworld', cm.getValue());
}, {value: '1234\n5678\nabcdefg'});

testVim('rendered_cursor_position_cm6', function(cm, vim, helpers) {
  if (!cm.cm6) return;
  cm.setCursor(0, 1);
  helpers.doKeys('V');
  function testCursorPosition(line, ch) {
    cm.refresh();
    var coords = cm.charCoords({line, ch});
    var cursorRect = cm.getWrapperElement().querySelector(".cm-fat-cursor").getBoundingClientRect();
    var contentRect = cm.getInputField().getBoundingClientRect();

    is(Math.abs(coords.top - (cursorRect.top - contentRect.top)) < 2);
    is(Math.abs(coords.left - (cursorRect.left - contentRect.left)) < 2);
  }
  testCursorPosition(0, 4);
  helpers.doKeys('j');
  testCursorPosition(1, 0);
  helpers.doKeys('j');
  testCursorPosition(2, 0);
  helpers.doKeys('j');
  testCursorPosition(3, 4);

}, {value: '1234\n\n\n5678\nabcdefg'});



async function delay(t) {
  return await new Promise(resolve => setTimeout(resolve, t));
}

}

var typeKey = function() {
  var keyCodeToKey = {};
  var keyCodeToCode = {};

  var alias = {};
  alias.Ctrl = "Control";
  alias.Option = "Alt";
  alias.Cmd = alias.Super = alias.Meta = "Command";

  var controlKeys = {
    Shift: 16, Control: 17, Alt: 18, Meta: 224, Command: 224,
    Backspace:8, Tab:9, Return: 13, Enter: 13,
    Pause: 19, Escape: 27, PageUp: 33, PageDown: 34, End: 35, Home: 36,
    Left: 37, Up: 38, Right: 39, Down: 40, Insert: 45, Delete: 46,
    ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  };
  var shiftedKeys = {};
  var printableKeys = {};
  var specialKeys = {
    Backquote: [192, "`", "~"], Minus: [189, "-", "_"], Equal: [187, "=", "+"],
    BracketLeft: [219, "[", "{"], Backslash: [220, "\\", "|"], BracketRight: [221, "]", "}"],
    Semicolon: [186, ";", ":"], Quote: [222, "'", '"'], Comma: [188, ",", "<"],
    Period: [190, ".", ">"], Slash: [191, "/", "?"], Space: [32, " ", " "], NumpadAdd: [107, "+"],
    NumpadDecimal: [110, "."], NumpadSubtract: [109, "-"], NumpadDivide: [111, "/"], NumpadMultiply: [106, "*"]
  };
  for (var i in specialKeys) {
    var key = specialKeys[i];
    printableKeys[i] = printableKeys[key[1]] = shiftedKeys[key[2]] = key[0];
    keyCodeToCode[key[0]] = i;
    keyCodeToKey[key[0]] = key[1];
    keyCodeToKey["s-" + key[0]] = key[2];
  }
  for (var i = 0; i < 10; i++) {
    var shifted = "!@#$%^&*()"[i];
    printableKeys[i] = shiftedKeys[shifted] = 48 + i;
    keyCodeToCode[48 + i] = "Digit" + i;
    keyCodeToKey[48 + i] = i.toString();
    keyCodeToKey["s-" + (48 + i)] = shifted;
  }
  for (var i = 65; i < 91; i++) {
    var chr = String.fromCharCode(i + 32);
    printableKeys[chr] = shiftedKeys[chr.toUpperCase()] = i;
    keyCodeToCode[i] = "Key" + chr.toUpperCase();
    keyCodeToKey[i] = chr;
    keyCodeToKey["s-" + i] = chr.toUpperCase();
  }
  for (var i = 1; i < 13; i++) {
    controlKeys["F" + i] = 111 + i;
  }

  for (var i in controlKeys) {
    keyCodeToKey[controlKeys[i]] = i;
    keyCodeToCode[controlKeys[i]] = i;
  }
  controlKeys["\t"] = controlKeys.Tab;
  controlKeys["\n"] = controlKeys.Return;
  controlKeys.Del = controlKeys.Delete;
  controlKeys.Esc = controlKeys.Escape;
  controlKeys.Ins = controlKeys.Insert;

  var shift = false;
  var ctrl = false;
  var meta = false;
  var alt = false;
  function reset() {
    shift = ctrl = meta = alt = false;
  }
  function updateModifierStates(keyCode) {
    if (keyCode == controlKeys.Shift)
      return shift = true;
    if (keyCode == controlKeys.Control)
      return ctrl = true;
    if (keyCode == controlKeys.Meta)
      return meta = true;
    if (keyCode == controlKeys.Alt)
      return alt = true;
  }

  function sendKey(letter, options) {
    var keyCode = controlKeys[letter] || printableKeys[letter] || shiftedKeys[letter];
    var isModifier = updateModifierStates(keyCode);

    var text = letter;
    var isTextInput = true;
    if (ctrl || alt || meta) {
      isTextInput = false;
    } else if (controlKeys[letter]) {
        if (keyCode == controlKeys.Return) {
            text = "\n";
            isTextInput = true;
        } else {
            isTextInput = false;
        }
    } else if (shift) {
      text = text.toUpperCase();
    }

    if (keyCodeToKey[keyCode] != text && keyCodeToKey["s-" + keyCode] == text) {
      shift = true;
    }
    var key = keyCodeToKey[(shift ? "s-" : "") + keyCode];
    
    if (options && options.text) {
      alt = options.altKey;
      text = key = options.text;
      isTextInput = true;
    }

    var target = document.activeElement;
    var prevented = emit("keydown", true);
    if (isModifier) return;
    if (!prevented && isTextInput) prevented = emit("keypress", true);
    if (!prevented && ctrl && !alt && !meta && letter == "c") emitClipboard("copy");
    if (!prevented) updateTextInput();
    emit("keyup", true);

    function emitClipboard(eventType) {
      var data = {bubbles: true, cancelable:true};
      var event = new KeyboardEvent(eventType, data);
      event.clipboardData = {
        setData: function(mime, text) {
          type.clipboard.$data = text;
        },
        getData: function() {
          return type.clipboard.$data;
        },
        clearData: function() {},
      };
      target.dispatchEvent(event);
    }
    function emit(type, bubbles) {
      var el = document.activeElement;
      var data = {bubbles: bubbles, cancelable:true};
      data.charCode = text.charCodeAt(0);
      data.keyCode = type == "keypress" ? data.charCode : keyCode;
      data.which = data.keyCode;
      data.shiftKey = shift || (shiftedKeys[text] && !printableKeys[text]);
      data.ctrlKey = ctrl;
      data.altKey = alt;
      data.metaKey = meta;
      data.key = key;
      data.code = keyCodeToCode[keyCode];
      var event = new KeyboardEvent(type, data);

      var el = document.activeElement;
      el.dispatchEvent(event);
      return event.defaultPrevented;
    }
    function updateTextInput() {
      if (!isTextInput && keyCode == controlKeys.Return) {
        text = "\n";
      }
      if (target._handleInputEventForTest) {
        if (!isTextInput) return;
        return target._handleInputEventForTest(text);
      }
      var isTextarea = "selectionStart" in target && typeof target.value == "string";
      if (!isTextarea) return;

      var start = target.selectionStart;
      var end = target.selectionEnd;
      var value = target.value;

      if (!isTextInput) {
        if (keyCode == controlKeys.Backspace) {
          if (start != end) start = Math.max(start - 1, 0);
        } else if (keyCode == controlKeys.Delete) {
          if (start != end) end = Math.min(end + 1, value.length);
        } else {
          return;
        }
      }
      var newValue = value.slice(0, start) + text + value.slice(end);
      var newStart = start + text.length;
      var newEnd = newStart;
      if (newValue != value || newStart != start || newEnd != end) {
        target.value = newValue;
        target.setSelectionRange(newStart, newEnd);
        emit("input", false);
      }
    }
  }

  function type() {
    var keys = Array.prototype.slice.call(arguments);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (Array.isArray(key)) {
        type.apply(null, key);
        continue;
      }
      reset();
      if (key.length > 1) {
        var isKeyName = controlKeys[key] || printableKeys[key] || shiftedKeys[key];
        if (!isKeyName) {
          var parts = key.split("-");
          var modifiers = parts.slice(0, parts.length - 1).map(function(part) {
            return controlKeys[alias[part] || part];
          });
          var isValid = modifiers.length && modifiers.every(updateModifierStates);
          if (!isValid) {
            type.apply(null, key.split(""));
            continue;
          }
          key = parts.pop();
          parts.forEach(function(part) {
            var keyCode = controlKeys[part];
            updateModifierStates(keyCode);
          });
        }
      }
      sendKey(key);
    }
  }

  // emulates option-9 inputting } on mac swiss keyboard
  type.optionTextInput = function(letter, altText) {
    reset();
    sendKey(letter, {text: altText, altKey: true});
  };

  type.utfTextInput = function(letter, altText) {
    sendKey(letter, {text: altText});
  };

  type.clipboard = {};

  return type;
}();
