import {SelectionRange, Prec} from "@codemirror/state"
import {ViewUpdate} from "@codemirror/view"
import {EditorView} from "@codemirror/view"
import {Direction} from "@codemirror/view"
import { CodeMirror } from "."



type Measure = {cursors: Piece[]}

class Piece {
  constructor(readonly left: number, readonly top: number,
              readonly width: number, readonly height: number,
              readonly className: string) {}

  draw() {
    let elt = document.createElement("div")
    elt.className = this.className
    this.adjust(elt)
    return elt
  }

  adjust(elt: HTMLElement) {
    elt.style.left = this.left + "px"
    elt.style.top = this.top + "px"
    if (this.width >= 0) elt.style.width = this.width + "px"
    elt.style.height = this.height + "px"

    elt.className = this.className
  }

  eq(p: Piece) {
    return this.left == p.left && this.top == p.top && this.width == p.width && this.height == p.height &&
      this.className == p.className
  }
}

export class DrawSelectionPlugin {
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
    let nextPos = head < view.state.doc.length && view.coordsAtPos(head + 1, cursor.assoc || 1)
    let w = nextPos ? nextPos.left - pos.left : 0;
    if (!w) w = view.defaultCharacterWidth;
    let h =  (pos.bottom - pos.top) 
    return new Piece(pos.left - base.left, pos.top - base.top + h * (1-hCoeff), w, h * hCoeff,
                     primary ? "cm-fat-cursor cm-cursor-primary" : "cm-fat-cursor cm-cursor-secondary")
  } else {
    return null;
  }
}
