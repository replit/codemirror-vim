# codemirror-vim

Vim keybindings for CodeMirror.

This is a pnpm workspace containing three packages:

- [`@replit/codemirror-vim`](packages/codemirror-vim) — Vim keybindings for CodeMirror 6 (the main package)
- [`cm5-vim`](packages/cm5-vim) — the same vim engine bundled for CodeMirror 5
- [`@replit/codemirror-vim-core`](packages/codemirror-vim-core) — the editor-agnostic vim engine and shared test suite used by both, originally authored by [@mightyguava](https://github.com/mightyguava) (Yunchi Luo)

## Development

```sh
pnpm install
pnpm run dev      # start the CodeMirror 6 demo
pnpm run test     # run the CodeMirror 6 test suite
pnpm run testAll  # run all tests, including cm5 and packaging checks
```

The repo ships a nix dev shell via direnv: `direnv allow` provides node, pnpm,
and the browsers needed for tests.
