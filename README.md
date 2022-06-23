# Vim keybindings for CM6

<span><a href="https://replit.com/@util/codemirror-vim" title="Run on Replit badge"><img src="https://replit.com/badge/github/replit/codemirror-vim" alt="Run on Replit badge" /></a></span>
<span><a href="https://www.npmjs.com/package/@replit/codemirror-vim" title="NPM version badge"><img src="https://img.shields.io/npm/v/@replit/codemirror-vim?color=blue" alt="NPM version badge" /></a></span>

## Installation

`npm i @replit/codemirror-vim`

## Usage

```js
import { basicSetup, EditorView } from 'codemirror';
import { vim } from "@replit/codemirror-vim"

let view = new EditorView({
  doc: "",
  extensions: [
    // make sure vim is included before other keymaps
    vim(), 
    // include the default keymap and all other keymaps you want to use in insert mode
    basicSetup, 
  ],
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
