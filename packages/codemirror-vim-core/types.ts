import {initVim} from "./vim.js"
export type Vim = ReturnType<typeof initVim>
export type vimState = {
    onPasteFn?: () => void,
    sel: {head: Pos, anchor: Pos},
    insertModeReturn: boolean, 
    visualBlock: boolean, 
    marks: {[mark: string]: Marker}, 
    visualMode: boolean, 
    insertMode: boolean, 
    pasteFn?: any, 
    lastSelection: {
        anchorMark: Marker,
        headMark: Marker,
        visualLine: boolean,
        visualBlock: boolean,
        visualMode: boolean,
        anchor: Pos,
        head: Pos,
    }, 
    searchState_?: SearchStateInterface, 
    lastEditActionCommand: actionCommand|void, 
    lastPastedText?: string, 
    lastMotion?: MotionFn|null, 
    options: {[optionName: string]: vimOption}, 
    lastEditInputState: InputStateInterface|void, 
    inputState: InputStateInterface,
    visualLine: boolean, 
    insertModeRepeat?: number,
    lastHSPos: number,
    lastHPos: number,
    wasInVisualBlock?: boolean,
    insertEnd?: Marker,
    status: string,
    exMode?: boolean,
    mode?: string,
    expectLiteralNext?: boolean,
}
export interface Marker {
    cm: CM5EditorInterface
    id: number
    offset: number | null
    assoc: number
    clear(): void
    find(): Pos | null
    update(change: any): void
}
export type LineHandle = { row: number, index: number }
export type Pos = { line: number, ch: number, sticky?: string }

export interface CM5Range {
    anchor: Pos,
    head: Pos,

    from(): Pos,
    empty(): boolean
}
export interface CM5RangeInterface {
    anchor: Pos,
    head: Pos,
}

export type RegisterController = ReturnType<Vim["getRegisterController"]>
export type Register = ReturnType<RegisterController["getRegister"]>

export type SearchArgs = {
    forward?: boolean,
    toJumplist?: boolean,
    wholeWordOnly?: boolean,
    querySrc?: string,
}

export type OperatorArgs = {
    repeat?: number,
    forward?: boolean,
    linewise?: boolean,
    fullLine?: boolean,
    registerName?: string|null,
    indentRight?: boolean,
    toLower?: boolean,
    shouldMoveCursor?: boolean,
    selectedCharacter?: string,
    lastSel?: {
        head: Pos,
        anchor: Pos,
        visualLine: boolean,
        visualBlock: boolean,
    },
    keepCursor?: boolean;
} 
// version of CM5EditorInterface with vim state checked
export type CodeMirrorV = CM5EditorInterface & {state: {vim: vimState}}
export type OperatorFn = (cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[], oldAnchor: Pos, newHead?: Pos) => Pos|void
export type vimOperators = {
    change(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[]): void,
    delete(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[]): void,
    indent(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[]): void,
    indentAuto(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[]): void,
    hardWrap(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[], oldAnchor: Pos): Pos|void,
    changeCase(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[], oldAnchor: Pos, newHead?: Pos): Pos|void,
    yank(cm: CodeMirrorV, args: OperatorArgs, ranges: CM5RangeInterface[], oldAnchor: Pos): Pos|void,
} & {
    [key: string]: OperatorFn
}

export type ActionArgsPartial = {
    repeat?: number,
    forward?: boolean,
    head?: Pos,
    position?: string
    backtrack?: boolean,
    increase?: boolean,
    repeatIsExplicit?: boolean,
    indentRight?: boolean,
    selectedCharacter?: string,
    after?: boolean,
    matchIndent?: boolean,
    registerName?: string,
    isEdit?: boolean
    linewise?: boolean,
    insertAt?: string,
    blockwise?: boolean,
    keepSpaces?: boolean,
    replace?: boolean,
    keepCursor?: boolean
}
export type ActionArgs = ActionArgsPartial & {repeat: number};

export type ActionFn = (cm: CodeMirrorV, actionArgs: ActionArgs, vim: vimState) => void 

export type vimActions  = {
    jumpListWalk(cm: CodeMirrorV, actionArgs: ActionArgs, vim: vimState): void,
    continuePaste(cm: CodeMirrorV, actionArgs: ActionArgs, vim: vimState, text: string, register: Register): void
    enterInsertMode(cm: CodeMirrorV, actionArgs: ActionArgsPartial, vum: vimState): void,
} & {
    [key: string]: ActionFn
}

export type MotionArgsPartial = {
    repeat?: number,
    forward?: boolean,
    selectedCharacter?: string,
    linewise?: boolean,
    textObjectInner?: boolean,
    sameLine?: boolean,
    repeatOffset?: number,
    toJumplist?: boolean,
    inclusive?: boolean,
    wordEnd?: boolean,
    toFirstChar?:boolean,
    explicitRepeat?: boolean,
    bigWord?: boolean,
    repeatIsExplicit?: boolean,
    noRepeat?: boolean
};

export type MotionArgs = MotionArgsPartial & {repeat: number};

export type MotionFn = (cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState, inputState: InputStateInterface) => Pos|[Pos,Pos]|null|undefined
export type vimMotions = {
    moveToTopLine(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveToMiddleLine(cm: CodeMirrorV): Pos
    moveToBottomLine(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    expandToLine(_cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    findNext(_cm: CodeMirrorV, _head: Pos, motionArgs: MotionArgs): Pos | undefined
    findAndSelectNextInclusive(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState, inputState: InputStateInterface): Pos|[Pos,Pos] | undefined
    goToMark(cm: CodeMirrorV, _head: Pos, motionArgs: MotionArgs, vim: vimState, inputState: InputStateInterface): Pos | undefined | null
    moveToOtherHighlightedEnd(cm: CodeMirrorV, _head: Pos, motionArgs: MotionArgs, vim: vimState): [Pos,Pos]
    jumpToMark(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState):Pos
    moveByCharacters(_cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveByLines(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos
    moveByDisplayLines(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos
    moveByPage(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveByParagraph(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveBySentence(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveByScroll(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos | null
    moveByWords(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos | undefined
    moveTillCharacter(cm: CodeMirrorV, _head: Pos, motionArgs: MotionArgs): Pos | null
    moveToCharacter(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveToSymbol(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    moveToColumn(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos
    moveToEol(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos
    moveToFirstNonWhiteSpaceCharacter(cm: CodeMirrorV, head: Pos): Pos
    moveToMatchedSymbol(cm: CodeMirrorV, head: Pos): Pos | undefined
    moveToStartOfLine(_cm: CodeMirrorV, head: Pos, motionArgs?: MotionArgs, vim?: vimState): Pos
    moveToLineOrEdgeOfDocument(cm: CodeMirrorV, _head: Pos, motionArgs: MotionArgs): Pos
    moveToStartOfDisplayLine(cm: CodeMirrorV): Pos
    moveToEndOfDisplayLine(cm: CodeMirrorV): Pos
    textObjectManipulation(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs, vim: vimState): Pos | [Pos, Pos] | null
    repeatLastCharacterSearch(cm: CodeMirrorV, head: Pos, motionArgs: MotionArgs): Pos
    [key: string]: MotionFn
}

export type exCommandDefinition = {
    name: string,
    shortName?: string,
    possiblyAsync?: boolean,
    excludeFromCommandHistory?: boolean,
    argDelimiter?: string,
    type? : string,
    toKeys? : string,
    toInput?: string,
    user?: boolean,
    noremap?: boolean,
};

export type optionCallback = (value?: string|undefined, cm?: CM5EditorInterface) => any
export type booleanOptionCallback = (value?: boolean, cm?: CM5EditorInterface) => any
export type numberOptionCallback = (value?: number, cm?: CM5EditorInterface) => any
export type stringOptionCallback = (value?: string, cm?: CM5EditorInterface) => any

export type vimOption = {
    type?: string,
    defaultValue?: unknown,
    callback?: optionCallback,
    value?: unknown
} | {
    type: 'boolean',
    defaultValue?: boolean|null|undefined,
    callback?: booleanOptionCallback,
    value?: boolean
}; 
export type defineOption1 = ((
    name: string,
    defaultValue: unknown,
    type: string,
    aliases?: string[]|undefined|null,
    callback?: optionCallback
) => void) 
export type defineOption2 = ((
    name: string,
    defaultValue: boolean|undefined|null,
    type: 'boolean',
    aliases?: string[]|undefined|null,
    callback?: booleanOptionCallback
) => void);


export type ExFn = (cm: CodeMirrorV, params: ExParams)=> void;

type allCommands = {
    keys: string,
    context?: string,
    interlaceInsertRepeat?: boolean,
    exitVisualBlock?: boolean,
    isEdit?: boolean,
    repeatOverride?: number,
    noremap?: boolean,
}
export type motionCommand = allCommands & {
    type: 'motion',
    motion: string,
    motionArgs?: MotionArgsPartial,
    repeatOverride?: number
}
export type operatorCommand = allCommands & {
    type: 'operator',
    operator: string,
    operatorArgs?: OperatorArgs
}
export type actionCommand = allCommands & {
    type: 'action',
    action: string,
    actionArgs?: ActionArgsPartial,
    motion?: string,
    operator?: string,
    interlaceInsertRepeat?: boolean
}
export type searchCommand = allCommands & {
    type: 'search',
    searchArgs: SearchArgs
}
export type operatorMotionCommand = allCommands & {
    type: 'operatorMotion',
    motion: string,
    operator: string,
    motionArgs?: MotionArgsPartial,
    operatorArgs?: OperatorArgs,
    operatorMotionArgs?: { 
        visualLine?: boolean,
    },
}
export type idleCommand = allCommands & { type: 'idle' }
export type exCommand = allCommands & { type: 'ex' }
export type keyToExCommand = allCommands & { type: 'keyToEx', exArgs: ExParams }
export type keyToKeyCommand = allCommands & { toKeys: string, type: 'keyToKey' }

export type vimKey =
    motionCommand
    | operatorCommand
    | actionCommand
    | searchCommand
    | operatorMotionCommand
    | idleCommand
    | exCommand
    | keyToExCommand
    | keyToKeyCommand;

export type vimKeyMap = vimKey[];

export interface InputStateInterface {
    prefixRepeat: string[];
    motionRepeat: string[];
    operator: string| undefined | null;
    operatorArgs: OperatorArgs | undefined | null;
    motion: string | undefined | null;
    motionArgs: MotionArgs | null;
    keyBuffer: string[];
    registerName?: string;
    changeQueue: null | { inserted: string, removed: string[]};
    operatorShortcut?: string;
    selectedCharacter?: string;
    repeatOverride?: number;
    changeQueueList?: (InputStateInterface["changeQueue"])[];
    pushRepeatDigit(n: string): void;
    getRepeat(): number;
}
export interface SearchStateInterface {
    setReversed(reversed: boolean): void;
    isReversed(): boolean|undefined;
    getQuery(): RegExp; 
    setQuery(query: string|RegExp): void;
    highlightTimeout: number|undefined;
    getOverlay(): {
        query: RegExp,
    };
    getScrollbarAnnotate(): any;
    setScrollbarAnnotate(query: RegExp| null): void;
    setOverlay(overlay: {query: RegExp}|null): void;
}

export type exCommandArgs = {
    callback?: (() => void) | undefined; 
    input?: string | undefined; 
    line?: string | undefined;
    commandName?: string | undefined;
    argString?: string;
    args?: string[]; 
};

export type vimExCommands = {
    colorscheme(cm: CodeMirrorV, params: vimExCommandsParams): void,
    map(cm: CodeMirrorV, params: vimExCommandsParams, ctx: string): void,
    imap(cm: CodeMirrorV, params: vimExCommandsParams): void,
    nmap(cm: CodeMirrorV, params: vimExCommandsParams): void,
    vmap(cm: CodeMirrorV, params: vimExCommandsParams): void,
    unmap(cm: CodeMirrorV, params: vimExCommandsParams, ctx: string): void,
    move(cm: CodeMirrorV, params: vimExCommandsParams): void,
    set(cm: CodeMirrorV, params: vimExCommandsParams): void,
    setlocal(cm: CodeMirrorV, params: vimExCommandsParams): void,
    setglobal(cm: CodeMirrorV, params: vimExCommandsParams): void,
    registers(cm: CodeMirrorV, params: vimExCommandsParams): void,
    sort(cm: CodeMirrorV, params: vimExCommandsParams): void,
    vglobal(cm: CodeMirrorV, params: vimExCommandsParams): void,
    global(cm: CodeMirrorV, params: vimExCommandsParams): void,
    substitute(cm: CodeMirrorV, params: vimExCommandsParams): void,
    redo(cm: CodeMirrorV): void,
    undo(cm: CodeMirrorV): void,
    write(cm: CodeMirrorV & {save?: Function}): void,
    nohlsearch(cm: CodeMirrorV): void,
    yank(cm: CodeMirrorV): void,
    delete(cm: CodeMirrorV, params: vimExCommandsParams): void,
    join(cm: CodeMirrorV, params: vimExCommandsParams): void,
    delmarks(cm: CodeMirrorV, params: vimExCommandsParams): void,
    [key: string]:(cm: CodeMirrorV, params: vimExCommandsParams, ctx: string)=> void,
}

type vimExCommandsParams = {
    args?: string[],
    input?: string,
    line?: number,
    setCfg?: {scope?: string},
    argString?: string,
    lineEnd?: number,
    commandName?: string,
    callback?: () => any,
    selectionLine?: number,
    selectionLineEnd?: number
}

type InsertModeKey = InstanceType<Vim["InsertModeKey"]>
export type InsertModeChanges = {
    changes: (InsertModeKey|string|[string,number?])[];
    expectCursorActivityForChange: boolean;
    visualBlock?: number,
    maybeReset?: boolean,
    ignoreCount?: number,
    repeatOverride?: number,
}

export type ExParams = {
    commandName: string,
    argString: string,
    input: string,
    args?: string[],
    
    line: number,
    lineEnd?: number,
    selectionLine: number,
    selectionLineEnd?: number,

    setCfg?: Object,
    callback?: () => void,
}

export type PromptOptions = {
    onClose?: Function; 
    prefix: string|HTMLElement;
    desc?: string|HTMLElement; 
    onKeyUp?: Function; 
    onKeyDown: Function; 
    value?: string; 
    selectValueOnOpen?: boolean;
}


declare global {
    function isNaN(v: any): v is Exclude<typeof v, number>;
    interface String {
        trimStart(): string
    }
}
/**
 * The editor API the vim engine drives. This is the CM5-style editor
 * interface; @replit/codemirror-vim's adapter implements it on top of
 * CM5EditorInterface 6, and cm5-vim binds it to a real CM5EditorInterface 5 instance.
 */
export interface CM5EditorInterface {
    state: {
        statusbar?: Element | null
        dialog?: HTMLElement | null
        vimPlugin?: any
        vim?: vimState | null
        currentNotificationClose?: Function | null
        closeVimNotification?: Function | null
        keyMap?: string
        overwrite?: boolean
        textwidth?: number
    }
    marks: Record<string, Marker>
    $mid: number
    curOp: {
        $d: number
        isVimOp?: boolean
        cursorActivityHandlers?: Function[]
        cursorActivity?: boolean
        lastChange?: any
        change?: any
        changeHandlers?: Function[]
        $changeStart?: number
    } | null | undefined
    options: any
    _handlers: any
    /** the host editor instance the adapter wraps (an EditorView for CM5EditorInterface 6) */
    cm6: any
    openDialog(template: Element, callback: Function | undefined, options: any): (newVal?: string) => void
    openNotification(template: Node, options: { bottom?: boolean, duration?: number }): () => void
    on(type: string, f: Function): void
    off(type: string, f: Function): void
    signal(type: string, e: any, handlers?: any): void
    indexFromPos(pos: Pos): number
    posFromIndex(offset: number): Pos
    foldCode(pos: Pos): void
    firstLine(): number
    lastLine(): number
    lineCount(): number
    setCursor(line: number, ch: number): void
    setCursor(line: Pos): void
    getCursor(p?: "head" | "anchor" | "start" | "end"): Pos
    listSelections(): { anchor: Pos, head: Pos }[]
    setSelections(p: CM5RangeInterface[], primIndex?: number): void
    setSelection(anchor: Pos, head: Pos, options?: any): void
    getLine(row: number): string
    getLineHandle(row: number): LineHandle
    getLineNumber(handle: any): number | null
    releaseLineHandles(): void
    getRange(s: Pos, e: Pos): string
    replaceRange(text: string, s: Pos, e?: Pos, source?: string): void
    replaceSelection(text: string): void
    replaceSelections(replacements: string[]): void
    getSelection(): string
    getSelections(): string[]
    somethingSelected(): boolean
    getInputField(): HTMLElement
    clipPos(p: Pos): Pos
    getValue(): string
    setValue(text: string): void
    focus(): void
    blur(): void
    defaultTextHeight(): number
    findMatchingBracket(pos: Pos, _options?: any): { to: Pos } | { to: undefined }
    scanForBracket(pos: Pos, dir: 1 | -1, style: any, config: any): false | { pos: Pos, ch: string } | null
    indentLine(line: number, more?: boolean): void
    indentMore(): void
    indentLess(): void
    execCommand(name: string): void
    setBookmark(cursor: Pos, options?: { insertLeft: boolean }): Marker
    addOverlay(overlay: { query: RegExp }): any
    removeOverlay(overlay?: any): void
    getSearchCursor(query: RegExp, pos: Pos): {
        findNext: () => string[] | null | undefined
        findPrevious: () => string[] | null | undefined
        find: (back?: boolean) => string[] | null | undefined
        from: () => Pos | undefined
        to: () => Pos | undefined
        replace: (text: string) => void
        readonly match: string[] | null
    }
    findPosV(start: Pos, amount: number, unit: "page" | "line", goalColumn?: number): Pos & { hitSide?: boolean }
    charCoords(pos: Pos, mode: "div" | "local"): { left: number, top: number, bottom: number }
    coordsChar(coords: { left: number, top: number }, mode: "div" | "local"): Pos
    getScrollInfo(): { left: number, top: number, height: number, width: number, clientHeight: number, clientWidth: number }
    scrollTo(x?: number | null, y?: number | null): void
    scrollIntoView(pos?: Pos, margin?: number): void
    getWrapperElement(): HTMLElement
    getMode(): { name: string | number | boolean | undefined }
    setSize(w: number, h: number): void
    refresh(): void
    destroy(): void
    getLastEditEnd(): Pos
    $lastChangeEndOffset: number
    $lineHandleChanges: any[] | undefined
    onChange(update: any): void
    onSelectionChange(): void
    operation<T>(fn: () => T, force?: boolean): T
    onBeforeEndOperation(): void
    moveH(increment: number, unit: string): void
    setOption(name: string, val: any): void
    getOption(name: "firstLineNumber" | "tabSize" | "textwidth"): number
    getOption(name: string): number | boolean | string | undefined
    toggleOverwrite(on: boolean): void
    getTokenTypeAt(pos: Pos): "" | "string" | "comment"
    overWriteSelection(text: string): void
    isInMultiSelectMode(): boolean
    virtualSelectionMode(): boolean
    virtualSelection: any
    forEachSelection(command: Function): void
    hardWrap(options: { from: number, to: number, column?: number, allowMerge?: boolean }): number
    showMatchesOnScrollbar?: Function
    save?: Function
}

/** The constructor-with-statics shape passed to initVim. */
export interface CodeMirrorConstructor {
    new (host: any): CM5EditorInterface
    isMac: boolean
    Pos: new (line: number, ch: number) => Pos
    StringStream: new (str: string) => StringStream
    commands: {
        toggleLineComment: (cm: CM5EditorInterface) => void
        cursorCharLeft: (cm: CM5EditorInterface) => void
        redo: (cm: CM5EditorInterface) => void
        undo: (cm: CM5EditorInterface) => void
        newlineAndIndent: (cm: CM5EditorInterface) => void
        indentAuto: (cm: CM5EditorInterface) => void
        newlineAndIndentContinueComment: any
        save: any
    }
    isWordChar: (ch: string) => boolean
    keys: any
    addClass: (el: any, str: string) => void
    rmClass: (el: any, str: string) => void
    e_preventDefault: (e: Event) => void
    e_stop: (e: Event) => void
    lookupKey: (key: string, map: string, handle: Function) => void
    on: (emitter: any, type: string, f: Function) => void
    off: (emitter: any, type: string, f: Function) => void
    signal: (emitter: any, type: string, ...args: any[]) => void
    findMatchingTag: (cm: CM5EditorInterface, pos: Pos) => any
    findEnclosingTag: (cm: CM5EditorInterface, pos: Pos) => { open: { from: Pos, to: Pos }, close: { from: Pos, to: Pos } } | undefined
    keyName?: Function
}

/** Structural interface of the token stream handed to ex-command parsers. */
export interface StringStream {
    pos: number
    start: number
    string: string
    next(): string | void
    peek(): string | void
    eat(match: string | RegExp | ((ch: string) => boolean)): string | void
    eatWhile(match: string | RegExp | ((ch: string) => boolean)): boolean
    eatSpace(): boolean
    skipToEnd(): void
    skipTo(ch: string): boolean | void
    backUp(n: number): void
    column(): number
    indentation(): number
    match(pattern: string | RegExp, consume?: boolean, caseInsensitive?: boolean): boolean | RegExpMatchArray | null
    current(): string
    eol(): boolean
    sol(): boolean
}
