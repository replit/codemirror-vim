# Vim keybindings for CM6

## Installation

`npm i @replit/codemirror-vim`

## Usage

```js
import { basicSetup, EditorState } from '@codemirror/basic-setup';
import { EditorView } from '@codemirror/view';
import { vim } from "@replit/codemirror-vim"

new EditorView({
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
