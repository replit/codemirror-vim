import { EditorSelection, EditorState, Text } from "@codemirror/state"

import {StringStream} from "@codemirror/stream-parser"
import { EditorView } from "@codemirror/view"
import { matchBrackets } from "@codemirror/matchbrackets"
import  {RegExpCursor} from "@codemirror/search"
import  {RangeSet} from "@codemirror/rangeset"
import {insertNewlineAndIndent} from "@codemirror/commands"
import * as history from "@codemirror/history"


interface Pos { line: number, ch: number }
interface CM5Range { anchor: Pos, head: Pos }
function posToOffset(doc: Text, pos: Pos): number {
  var ch = pos.ch;
  var lineNumber = pos.line + 1;
  if (lineNumber<1) {
    lineNumber = 1
    ch = 0
  }
  if (lineNumber>doc.lines) {
    lineNumber = doc.lines
    ch = Number.MAX_VALUE
  }
  var line = doc.line(lineNumber)
  return Math.min(line.from + Math.max(0, ch), line.to)
}
function offsetToPos(doc: Text, offset: number): Pos {
  let line = doc.lineAt(offset)
  return { line: line.number - 1, ch: offset - line.from }
}
class Pos {
  constructor(line:number, ch:number) {  
    this.line = line; this.ch = ch;
  }
};


var noHandlers: Function[] = [];

function on(emitter:any, type:string, f:Function) {
  if (emitter.addEventListener) {
    emitter.addEventListener(type, f, false);
  } else if (emitter.attachEvent) {
    emitter.attachEvent("on" + type, f);
  } else {
    var map = emitter._handlers || (emitter._handlers = {});
    map[type] = (map[type] || noHandlers).concat(f);
  }
};

function getHandlers(emitter:any, type: string) {
  return emitter._handlers && emitter._handlers[type] || noHandlers
}

function off(emitter: any, type: string, f: Function) {
  if (emitter.removeEventListener) {
    emitter.removeEventListener(type, f, false);
  } else if (emitter.detachEvent) {
    emitter.detachEvent("on" + type, f);
  } else {
    var map = emitter._handlers, arr = map && map[type];
    if (arr) {
      var index = arr.indexOf(f);
      if (index > -1)
        { map[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
    }
  }
}

function signal(emitter: any, type: string, ...args) {
  var handlers = getHandlers(emitter, type);
  if (!handlers.length) { return }
  for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
}

var specialKey: any = {
  'Return': 'CR', Backspace: 'BS', 'Delete': 'Del', Escape: 'Esc',
  ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down',
  home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown', Enter: 'CR'
};
var ignoredKeys: any = { Shift: 1, Alt: 1, Command: 1, Control: 1, CapsLock: 1 };


export class CodeMirror {
  // --------------------------
  static Pos = Pos;
  static StringStream = StringStream;
  static commands = {
    redo: function (cm: CodeMirror) { history.redo(cm.cm6); },
    undo: function (cm: CodeMirror) { history.undo(cm.cm6); },
    newlineAndIndent: function (cm: CodeMirror) {
      insertNewlineAndIndent(cm.cm6)
    },
    indentAuto: function(cm: CodeMirror) {
      
    }
  }; 
  static defineOption = function (name: string, val: any, setter: Function) { };
  static isWordChar = function (ch) {
    return /^\w$/.test(ch);
  };
  
  static keyMap = {
    default: function (key) {
      return function (cm) {
        var cmd = cm.ace.commands.commandKeyBinding[key.toLowerCase()];
        return cmd && cm.ace.execCommand(cmd) !== false;
      };
    }
  };
  static addClass = function () { };
  static rmClass = function () { }; 
  static e_preventDefault = function (e: Event) {
    e.preventDefault()
  };
  static e_stop = function (e: Event) {
    e?.stopPropagation?.()
    e?.preventDefault?.()
  };
  static keyName = function (e) {
    var key = e.key;
    if (ignoredKeys[key]) return;
    if (key.length > 1 && key[0] == "n") {
      key = key.replace("Numpad", "");
    }
    key = specialKey[key] || key;
    var name = '';
    if (e.ctrlKey) { name += 'Ctrl-'; }
    if (e.altKey) { name += 'Alt-'; }
    if ((name || key.length > 1) && e.shiftKey) { name += 'Shift-'; }
    name += key;
    return name;
  };
  static vimKey = function vimKey(e: KeyboardEvent) {
    var key = e.key;
    if (ignoredKeys[key]) return;
    if (key.length > 1 && key[0] == "n") {
      key = key.replace("Numpad", "");
    }
    key = specialKey[key] || key;
    var name = '';
    if (e.ctrlKey) { name += 'C-'; }
    if (e.altKey) { name += 'A-'; }
    if ((name || key.length > 1) && e.shiftKey) { name += 'S-'; }
  
    name += key;
    if (name.length > 1) { name = '<' + name + '>'; }
    return name;
  } ;

  static lookupKey = function lookupKey(key, map, handle) {
    console.error(key, map, handle)
  };

  static on = on
  static off = off;
  static signal = signal;

  // --------------------------
  openDialog!: Function;
  openNotification!: Function;
  static defineExtension = function (name: "openDialog"|"openNotification", fn: Function) {
    CodeMirror.prototype[name] = fn;
  };

  // --------------------------
  cm6: EditorView
  state: {dialog?: any, vim: any} = {};
  marks = Object.create(null);
  $uid = 0;
  curOp: any|null;
  constructor(cm6: EditorView) {
    this.cm6 = cm6;
    this.onChange = this.onChange.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.onBeforeEndOperation = this.onBeforeEndOperation.bind(this);
    // this.ace.on('change', this.onChange);
    // this.ace.on('changeSelection', this.onSelectionChange);
    // this.ace.on('beforeEndOperation', this.onBeforeEndOperation);
  };

  on(type: string, f: Function) {on(this, type, f)}
  off(type: string, f: Function) {off(this, type, f)}

  firstLine() { return 0; };
  lastLine() { return this.cm6.state.doc.lines - 1; };
  lineCount() { return this.cm6.state.doc.lines };
  setCursor(line: Pos | number, ch: number) {
    if (typeof line === 'object') {
      ch = line.ch;
      line = line.line;
    }
    var offset = posToOffset(this.cm6.state.doc, { line, ch })
    this.cm6.dispatch({ selection: { anchor: offset } })
  };
  getCursor(p?: "head" | "anchor"): Pos {
    var sel = this.cm6.state.selection.main;

    var offset = sel[p || "head"]
    var doc = this.cm6.state.doc;
    return offsetToPos(doc, offset);
  };

  listSelections() {
    var doc = this.cm6.state.doc
    return this.cm6.state.selection.ranges.map(r => {
      return {
        anchor: offsetToPos(doc, r.anchor),
        head: offsetToPos(doc, r.head),
      };
    });
  };
  setSelections(p: CM5Range[], primIndex?: number) {
    var doc = this.cm6.state.doc
    var ranges = p.map(x => {
      return EditorSelection.range(posToOffset(doc, x.anchor), posToOffset(doc, x.head))
    })
    this.cm6.dispatch({
      selection: EditorSelection.create(ranges, primIndex)
    })
  };
  setSelection(anchor: Pos, head: Pos, options?: any) {
    var doc = this.cm6.state.doc
    var ranges = [EditorSelection.range(posToOffset(doc, anchor), posToOffset(doc, head))]
    this.cm6.dispatch({
      selection: EditorSelection.create(ranges, 0)
    })
    if (options && options.origin == '*mouse') {
      // this.onBeforeEndOperation();
    }
  };
  getLine(row:number): string {
    var doc = this.cm6.state.doc
    if (row < 0 || row >= doc.lines) return "";
    return this.cm6.state.doc.line(row + 1).text;
  };
  getRange(s: Pos, e: Pos) {
    var doc = this.cm6.state.doc;
    return this.cm6.state.sliceDoc(
      posToOffset(doc, s),
      posToOffset(doc, e)
    )
  };
  replaceRange(text: string, s: Pos, e: Pos) {
    if (!e) e = s;
    var doc = this.cm6.state.doc;
    var from = posToOffset(doc, s);
    var to = posToOffset(doc, e);
    this.cm6.dispatch({
      changes: { from, to, insert: text }
    });
  };
  replaceSelection(text: string) {
    this.cm6.dispatch(this.cm6.state.replaceSelection(text))
  }
  replaceSelections(replacements: string[]) {
    var ranges = this.cm6.state.selection.ranges;
    var changes = ranges.map((r, i) => {
      return {from: r.from, to: r.to, text: replacements[i] || ""}
    })
    this.cm6.dispatch({changes});
  };
  getSelection() {
    var main = this.cm6.state.selection.main
    return this.cm6.state.sliceDoc(main.from, main.to);
  };
  getSelections() {
    var cm = this.cm6;
    return cm.state.selection.ranges.map(r => cm.state.sliceDoc(r.from, r.to))
  };
  
  somethingSelected() {
    return this.cm6.state.selection.ranges.some(r => !r.empty)
  };
  getInputField() {
    return this.cm6.contentDOM;
  };
  clipPos(p:Pos) {
    var doc = this.cm6.state.doc
    var ch = p.ch;
    var lineNumber = p.line + 1;
    if (lineNumber<1) {
      lineNumber = 1
      ch = 0
    }
    if (lineNumber>doc.lines) {
      lineNumber = doc.lines
      ch = Number.MAX_VALUE
    }
    var line = doc.line(lineNumber)
    ch = Math.min(Math.max(0, ch), line.to - line.from)
    return new Pos(lineNumber - 1, ch);
  };
  
  
  getValue(): string {
    return this.cm6.state.doc.toString();
  };
  setValue(text: string) {
    var cm = this.cm6;
    return cm.dispatch({
      changes: {from: 0, to: cm.state.doc.length, insert: text}
    })
  };
  
  focus() {
    return this.cm6.focus();
  };
  blur() {
    return this.cm6.contentDOM.blur();
  };
  defaultTextHeight () {
    return this.cm6.defaultLineHeight
  };

  findMatchingBracket(pos: Pos) {
    var state = this.cm6.state
    var offset = posToOffset(state.doc, pos);
    var m = matchBrackets(state, offset+1, -1)
    if (m) {
      return { to: m && offsetToPos(state.doc, m.start.from) };
    } 
    m = matchBrackets(this.cm6.state, offset, 1)
    if (m && m.end) {
      return { to: m && offsetToPos(state.doc, m.end.from) };
    } 
    return { to: undefined };
  };
  indentLine(line: number, method: boolean) {
    if (method === true)
      this.ace.session.indentRows(line, line, "\t");
    else if (method === false)
      this.ace.session.outdentRows(new Range(line, 0, line, 0));
  };
  scanForBracket(pos, dir, _, options) {
    console.error("not implemented")
  }; 
  
  execCommand(name: "indentAuto") {
    if (name == "indentAuto") CodeMirror.commands.indentAuto(this);
    else console.log(name + " is not implemented");
  };
  
  setBookmark(cursor: Pos, options?: {insertLeft: boolean}) {
    var bm = new Marker(this, this.$uid++, cursor.line, cursor.ch);
    if (!options || !options.insertLeft)
      bm.$insertRight = true;
    this.marks[bm.id] = bm;
    return bm;
  };

  
  addOverlay = function () {
    // console.error("not implemented")
  };
  removeOverlay = function () {
    // console.error("not implemented")
  };

  getSearchCursor(query: RegExp, pos: Pos) {
    var cm = this;
    type CM6Result = {from: number, to: number, match: string[]} | null;
    type CM5Result = {from: Pos, to: Pos, match: string[]} | null;
    var last: CM6Result = null;
    var lastCM5Result: CM5Result = null;
    
    if (pos.ch == undefined) pos.ch = Number.MAX_VALUE;
    var firstOffset = posToOffset(cm.cm6.state.doc, pos);
    
    
    function rCursor(doc: Text, from=0, to = doc.length) {
      return new RegExpCursor(doc, query.source, {ignoreCase: query.ignoreCase}, from, to);
    }

    function nextMatch(from: number) {
      var doc = cm.cm6.state.doc
      if (from > doc.length) return null;
      let res = rCursor(doc, from).next()
      return res.done ? null : res.value
    }
    
    var ChunkSize = 10000
    function prevMatchInRange(from: number, to: number) {
      var doc = cm.cm6.state.doc
      for (let size = 1;; size++) {
        let start = Math.max(from, to - size * ChunkSize)
        let cursor = rCursor(doc, start, to), range: CM6Result = null
        while (!cursor.next().done) range = cursor.value
        if (range && (start == from || range.from > start + 10)) return range
        if (start == from) return null
      }
    }
    return {
      findNext: function () { return this.find(false) },
      findPrevious: function () { return this.find(true) },
      find: function (back?: boolean): CM5Result {
        var doc = cm.cm6.state.doc
        if (back) {
          let endAt = last ? (last.from == last.to ? last.to - 1 : last.from ) : firstOffset
          last = prevMatchInRange(0, endAt);
        } else {
          let startFrom = last ? (last.from == last.to ? last.to + 1 : last.to ) : firstOffset
          last = nextMatch(startFrom)
        }
        if (last && last.from == last.to) {
          let lineEl = doc.lineAt(last.to) 
          if (lineEl.to == last.to) {
            return this.find(back);
          }
        } 
        lastCM5Result = last && {
          from: offsetToPos(doc, last.from),
          to: offsetToPos(doc, last.to),
          match: last.match,
        }
        return lastCM5Result
      },
      from: function () { return lastCM5Result?.from },
      to: function () { return lastCM5Result?.to },
      replace: function (text: string) {
        if (last) {
          cm.cm6.dispatch({
            changes: { from: last.from, to: last.to, insert: text }
          });
          last.to = last.from + text.length
          if (lastCM5Result) {
            lastCM5Result.to = offsetToPos(cm.cm6.state.doc, last.to);
          }
        }
      }
    };
  };


  
  findPosV(start: Pos, amount: number, unit: "page"|"line", goalColumn?:number) {
    var doc = this.cm6.state.doc;
    if (unit == 'page') {
      // Todo pagedown
      console.error(unit)
    }
    if (unit == 'line') {
      var startOffset = posToOffset(doc, start);
      
      var newSelection = this.cm6.moveVertically({head: startOffset}, amount > 0, Math.abs(amount));
      var newOffset = newSelection.head;
      return offsetToPos(doc, newOffset);
    } 
  };
  charCoords(pos: Pos, mode: "div"| "local") {
    var offset = posToOffset(this.cm6.state.doc, pos)
    var coords =  this.cm6.coordsAtPos(offset)
    return coords || {left: 0, top: 0}
  };
  coordsChar(coords: {left:number,top:number}, mode: "div"| "local") {
    var offset = this.cm6.posAtCoords({x:coords.left, y: coords.top }) || 0
    return offsetToPos(this.cm6.state.doc, offset)
  };
  // getUserVisibleLines() {
  //  var ranges = this.cm6.visibleRanges;
  //  ranges[0]
  // }

  
  getScrollInfo() {
    // console.error("not implemented")
    return {
      left: 0,
      top: 0,
      height: 300,
      width:300,
      clientHeight: 300,
      clientWidth: 300,
    };
  };
  scrollTo(x: number, y: number) {
    
  };
  scrollInfo () { return 0; };
  scrollIntoView(pos: Pos, margin: number) {
    
  };

  getWrapperElement () {
    return this.cm6.dom;
  };

  // for tests
  getMode () {
    return { name: this.getOption("mode") };
  };
  setSize() {
    
  }

  // event listeners
  destroy() {
   
    this.removeOverlay();
  }; 
  onChange(delta) {
    // todo
  };
  onSelectionChange() {
    // todo
  };
  operation(fn, force) {
    // todo
    this.curOp = {}
    try {
      var result = fn()
    } finally {
      this.curOp = null
    }
    return result
  };
  onBeforeEndOperation() {
    // todo
  }; 
  moveH(increment, unit) {
    if (unit == 'char') {
      // todo
    }
  };

  
  setOption(name, val) {
  };
  getOption(name, val) {
    switch (name) {
      case "firstLineNumber": return 1;
      case "tabSize": return this.cm6.state.tabSize;
      case "readonly": return false;
      case "indentWithTabs": return false; // TODO
    }
  };
  toggleOverwrite (on) {
   
    // return this.ace.setOverwrite(on);
  };
  getTokenTypeAt(pos) {
    // only comment|string are needed
  };
}; 


/************* dialog *************/

(function () {
  function dialogDiv(cm, template, bottom) {
    var dialog = document.createElement("div");
    dialog.appendChild(template);
    return dialog;
  }

  function closeNotification(cm, newVal) {
    if (cm.state.currentNotificationClose)
      cm.state.currentNotificationClose();
    cm.state.currentNotificationClose = newVal;
  }

  CodeMirror.defineExtension("openNotification", function (this: CodeMirror, template, options) {
    closeNotification(this, close);
    var dialog = dialogDiv(this, template, options && options.bottom);
    var closed = false;
    var doneTimer: number;
    var duration = options && typeof options.duration !== "undefined" ? options.duration : 5000;
    var cm = this;

    function close() {
      if (closed) return;
      closed = true;
      clearTimeout(doneTimer);
      dialog.remove();
      hideDialog(cm, dialog)
    }

    dialog.onclick = function (e) {
      e.preventDefault();
      close();
    };

    showDialog(cm, dialog)

    if (duration)
      doneTimer = setTimeout(close, duration);

    return close;
  });

  
  function showDialog(cm: CodeMirror, dialog: Element) {
    if (cm.state.dialog !== dialog && cm.state.dialog) {
      cm.state.dialog.remove()
    }
    cm.state.dialog = dialog;
    CodeMirror.signal(cm, "dialog")
  }
  
  function hideDialog(cm: CodeMirror, dialog: Element) {
    if (cm.state.dialog == dialog) {
      cm.state.dialog = null;
      CodeMirror.signal(cm, "dialog")
    }
  }

  CodeMirror.defineExtension("openDialog", function (this: CodeMirror, template: Element, callback: Function, options: any) {
    var me = this;
    if (!options) options = {};

    closeNotification(me, null);

    var dialog = dialogDiv(me, template, options.bottom);
    var closed = false;
    showDialog(me, dialog);

    function close(newVal?: string|Event) {
      if (typeof newVal == 'string') {
        inp.value = newVal;
      } else {
        if (closed) return;

        if (newVal && newVal.type == "blur") {
          if (document.activeElement === inp)
            return;
        }
        closed = true;
        hideDialog(me, dialog)
        me.focus();

        if (options.onClose) options.onClose(dialog);
      }
    }

    var inp = dialog.getElementsByTagName("input")[0], button;
    if (inp) {
      if (options.value) {
        inp.value = options.value;
        if (options.selectValueOnOpen !== false) inp.select();
      }

      if (options.onInput)
        CodeMirror.on(inp, "input", function (e) { options.onInput(e, inp.value, close); });
      if (options.onKeyUp)
        CodeMirror.on(inp, "keyup", function (e) { options.onKeyUp(e, inp.value, close); });

      CodeMirror.on(inp, "keydown", function (e) {
        if (options && options.onKeyDown && options.onKeyDown(e, inp.value, close)) { return; }
        if (e.keyCode == 13) callback(inp.value);
        if (e.keyCode == 27 || (options.closeOnEnter !== false && e.keyCode == 13)) {
          inp.blur();
          CodeMirror.e_stop(e);
          close();
        }
      });

      if (options.closeOnBlur !== false) CodeMirror.on(inp, "blur", close);

      inp.focus();
    } else if (button = dialog.getElementsByTagName("button")[0]) {
      CodeMirror.on(button, "click", function () {
        close();
        me.focus();
      });

      if (options.closeOnBlur !== false) CodeMirror.on(button, "blur", close);

      button.focus();
    }
    return close;
  })
})();





class Marker{
  cm: CodeMirror;
  id: number;
  row: number;
  column: number;
  offset: number;

  constructor (cm: CodeMirror, id: number, row: number, column: number) {
    this.cm = cm;
    this.id = id;
    this.row = row;
    this.column = column;
    this.offset = 0 // TODO 
    cm.marks[this.id] = this;
  };
  clear() { delete this.cm.marks[this.id] };
  find() { return new Pos(this.row, this.column) };
}