import {SelectionRange, Prec} from "@codemirror/state"
import {ViewUpdate} from "@codemirror/view"
import {EditorView} from "@codemirror/view"
import {Direction} from "@codemirror/view"
import { CodeMirror } from "."



type Measure = {cursors: Piece[]}

class Piece {
  constructor(readonly left: number, readonly top: number,
              readonly height: number,
              readonly className: string,
              readonly letter: string,
              readonly partial: boolean) {}

  draw() {
    let elt = document.createElement("div")
    elt.className = this.className
    this.adjust(elt)
    return elt
  }

  adjust(elt: HTMLElement) {
    elt.style.left = this.left + "px"
    elt.style.top = this.top + "px"
    elt.style.height = this.height + "px"
    elt.style.lineHeight = this.height + "px"
    elt.style.color = this.partial ? "transparent" : ""

    elt.className = this.className
    elt.textContent = this.letter
  }

  eq(p: Piece) {
    return this.left == p.left && this.top == p.top && this.width == p.width && this.height == p.height &&
      this.className == p.className
  }
}

export class BlockCursorPlugin {
  rangePieces: readonly Piece[] = []
  cursors: readonly Piece[] = []
  measureReq: {read: () => Measure, write: (value: Measure) => void}
  cursorLayer: HTMLElement
  cm: CodeMirror

  constructor(readonly view: EditorView, cm: CodeMirror) {
    this.cm = cm;
    this.measureReq = {read: this.readPos.bind(this), write: this.drawSel.bind(this)}
    this.cursorLayer = view.scrollDOM.appendChild(document.createElement("div"))
    this.cursorLayer.className = "cm-cursorLayer cm-vimCursorLayer"
    this.cursorLayer.setAttribute("aria-hidden", "true")
    view.requestMeasure(this.measureReq)
    this.setBlinkRate() 
  }

  setBlinkRate() {
    this.cursorLayer.style.animationDuration = 1200 + "ms"
  }

  update(update: ViewUpdate) {
     if (update.selectionSet || update.geometryChanged || update.viewportChanged) {
      this.view.requestMeasure(this.measureReq)
      this.cursorLayer.style.animationName = this.cursorLayer.style.animationName == "cm-blink" ? "cm-blink2" : "cm-blink"
     }
  }

  scheduleRedraw() {
    this.view.requestMeasure(this.measureReq)
  }

  readPos(): Measure {
    let {state} = this.view
    let cursors = []
    for (let r of state.selection.ranges) {
      let prim = r == state.selection.main
      let piece = measureCursor(this.cm, this.view, r, prim)
      if (piece) cursors.push(piece)      
    }
    return {cursors}
  }

  drawSel({cursors}: Measure) {
    if (cursors.length != this.cursors.length || cursors.some((c, i) => !c.eq(this.cursors[i]))) {
      let oldCursors = this.cursorLayer.children
      if (oldCursors.length !== cursors.length) {
        this.cursorLayer.textContent = ""
        for (const c of cursors)
          this.cursorLayer.appendChild(c.draw())
      } else {
        cursors.forEach((c, idx) => c.adjust(oldCursors[idx] as HTMLElement))
      }
      this.cursors = cursors
    }
  }

  destroy() {
    this.cursorLayer.remove()
  }
}

 const themeSpec = {
  ".cm-line": {
    "& ::selection": {backgroundColor: "transparent !important"},
    "&::selection": {backgroundColor: "transparent !important"},
    caretColor: "transparent !important",
  }
}

export const hideNativeSelection = Prec.override(EditorView.theme(themeSpec))



function getBase(view: EditorView) {
  let rect = view.scrollDOM.getBoundingClientRect()
  let left = view.textDirection == Direction.LTR ? rect.left : rect.right - view.scrollDOM.clientWidth
  return {left: left - view.scrollDOM.scrollLeft, top: rect.top - view.scrollDOM.scrollTop}
}

function measureCursor(cm: CodeMirror, view: EditorView, cursor: SelectionRange, primary: boolean): Piece | null {
  let head = cursor.head
  var fatCursor = false
  var hCoeff = 1;
  var vim = cm.state.vim;
  if (vim && (!vim.insertMode || cm.state.overwrite)) {
    fatCursor = true
    if (vim.visualBlock && !primary)
      return null;
    if (cursor.anchor < cursor.head) head--;
    if (cm.state.overwrite) hCoeff = 0.2
    else if (vim.status) hCoeff = 0.5
  }

  
  let pos = view.coordsAtPos(head, cursor.assoc || 1)
  if (!pos) return null
  let base = getBase(view)
  if (fatCursor) {
    let letter = head < view.state.doc.length && view.state.sliceDoc(head, head + 1) 
    if (!letter || letter == "\n"  || letter == "\r") letter = "\xa0"
    let h =  (pos.bottom - pos.top) 
    return new Piece(pos.left - base.left, pos.top - base.top + h * (1-hCoeff), h * hCoeff,
                     primary ? "cm-fat-cursor cm-cursor-primary" : "cm-fat-cursor cm-cursor-secondary",
                     letter, hCoeff != 1)
  } else {
    return null;
  }
}
