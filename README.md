# Vim keybindings for CM6

## Installation

`npm i @replit/codemirror-vim`

## Usage

```js
import { basicSetup, EditorState } from '@codemirror/basic-setup';
import { EditorView } from '@codemirror/view';
import { vim } from "@replit/codemirror-vim"

let view = new EditorView({
    state: EditorState.create({
      doc: "",
      extensions: [
        // make sure vim is included before other keymaps
        vim(), 
        // include the default keymap and all other keymaps you want to use in insert mode
        basicSetup, 
      ]
    }),
    parent: document.querySelector('#editor'),
})
```

## Usage of cm5 vim extension api

The same api that could be used in previous version of codemirror https://codemirror.net/doc/manual.html#vimapi, can be used with this plugin too, just replace the old editor instance with `view.cm` in your code

```js
import {Vim, getCM} from "@replit/codemirror-vim"

let cm = getCM(view)
// use cm to access the old cm5 api
Vim.exitInsertMode(cm)
Vim.handleKey(cm, "<Esc>")
```
