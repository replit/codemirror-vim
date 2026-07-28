# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [@replit/codemirror-vim@6.4.0] - 2026-07-28

### Added
- `gcc` to toggle line comments ([`2f03564`](https://github.com/replit/codemirror-vim/commit/2f03564), [#254](https://github.com/replit/codemirror-vim/pull/254))

### Fixed
- `gj` clipping at the end of the document ([`c912733`](https://github.com/replit/codemirror-vim/commit/c912733), [#258](https://github.com/replit/codemirror-vim/pull/258))
- Ex commands with mark and cursor line ranges such as `:'a,.y` ([`d19062a`](https://github.com/replit/codemirror-vim/commit/d19062a), [#257](https://github.com/replit/codemirror-vim/pull/257))
- `,` (repeat character search in reverse) in visual mode ([`cc81e48`](https://github.com/replit/codemirror-vim/commit/cc81e48), [#256](https://github.com/replit/codemirror-vim/pull/256))
- `:sort` with a pattern and the `r` flag ([`66332dd`](https://github.com/replit/codemirror-vim/commit/66332dd), [#253](https://github.com/replit/codemirror-vim/pull/253))
- Status bar display of visual line mode ([`71919db`](https://github.com/replit/codemirror-vim/commit/71919db), [#236](https://github.com/replit/codemirror-vim/pull/236))

## [@replit/codemirror-vim@6.3.0] - 2025-03-27

### Added
- Very magic mode (`\v`) in search and substitute patterns ([`ba09b2c`](https://github.com/replit/codemirror-vim/commit/ba09b2c), [#190](https://github.com/replit/codemirror-vim/pull/190))
- `g?` rot13 encoding operator ([`5d97387`](https://github.com/replit/codemirror-vim/commit/5d97387), [#179](https://github.com/replit/codemirror-vim/pull/179))
- `:marks` ex command ([`75a374f`](https://github.com/replit/codemirror-vim/commit/75a374f), [#167](https://github.com/replit/codemirror-vim/pull/167))
- `:version` ex command ([`b0231bf`](https://github.com/replit/codemirror-vim/commit/b0231bf), [#181](https://github.com/replit/codemirror-vim/pull/181))
- Support for both `<A-*>` and unicode key mappings on macOS ([`b391018`](https://github.com/replit/codemirror-vim/commit/b391018), [#194](https://github.com/replit/codemirror-vim/pull/194))
- Search highlighting while typing a `:s` replace command ([`579ef86`](https://github.com/replit/codemirror-vim/commit/579ef86), [#175](https://github.com/replit/codemirror-vim/pull/175))
- Support for editors scaled with CSS transforms ([`53fcdc9`](https://github.com/replit/codemirror-vim/commit/53fcdc9), [#207](https://github.com/replit/codemirror-vim/pull/207))

### Fixed
- Indentation in visual block mode ([`d190ea8`](https://github.com/replit/codemirror-vim/commit/d190ea8), [#222](https://github.com/replit/codemirror-vim/pull/222))
- Key mappings in insert mode ([`a1d9b3d`](https://github.com/replit/codemirror-vim/commit/a1d9b3d), [#206](https://github.com/replit/codemirror-vim/pull/206))
- Substitution with an empty string ([`df3e33d`](https://github.com/replit/codemirror-vim/commit/df3e33d), [#189](https://github.com/replit/codemirror-vim/pull/189))
- Visual mode cursor shifted on empty lines ([`8e8ea52`](https://github.com/replit/codemirror-vim/commit/8e8ea52), [#174](https://github.com/replit/codemirror-vim/pull/174))
- TypeScript type declarations ([`6c63e17`](https://github.com/replit/codemirror-vim/commit/6c63e17), [#205](https://github.com/replit/codemirror-vim/pull/205))
- Tree-shaking of the package by bundlers ([`e2035e4`](https://github.com/replit/codemirror-vim/commit/e2035e4), [#221](https://github.com/replit/codemirror-vim/pull/221))

## [@replit/codemirror-vim@6.2.1] - 2024-03-24

### Fixed
- Broken arrow key navigation on wrapped lines ([`4f45755`](https://github.com/replit/codemirror-vim/commit/4f45755), [#170](https://github.com/replit/codemirror-vim/pull/170))

## [@replit/codemirror-vim@6.2.0] - 2024-02-20

### Added
- `langmap` option ([`22f620c`](https://github.com/replit/codemirror-vim/commit/22f620c), [#151](https://github.com/replit/codemirror-vim/pull/151)), with automatic langmap for non-ASCII keyboard layouts ([`fd4e428`](https://github.com/replit/codemirror-vim/commit/fd4e428), [#152](https://github.com/replit/codemirror-vim/pull/152))
- TypeScript types for the vim engine ([`69aee95`](https://github.com/replit/codemirror-vim/commit/69aee95), [#162](https://github.com/replit/codemirror-vim/pull/162))

### Changed
- Upgraded `@codemirror/*` peer dependencies ([`cd66f45`](https://github.com/replit/codemirror-vim/commit/cd66f45), [#166](https://github.com/replit/codemirror-vim/pull/166))

### Fixed
- `f<S-Space>` and similar shifted-key mappings ([`1a3bb80`](https://github.com/replit/codemirror-vim/commit/1a3bb80), [#164](https://github.com/replit/codemirror-vim/pull/164))
- `:set` option values that include `=` ([`0ac05ab`](https://github.com/replit/codemirror-vim/commit/0ac05ab), [#161](https://github.com/replit/codemirror-vim/pull/161))
- Behavior in read-only editors ([`162d435`](https://github.com/replit/codemirror-vim/commit/162d435), [#158](https://github.com/replit/codemirror-vim/pull/158))
- Composition (IME) replace issues ([`fd4e428`](https://github.com/replit/codemirror-vim/commit/fd4e428), [#152](https://github.com/replit/codemirror-vim/pull/152))

## [@replit/codemirror-vim@6.1.0] - 2023-11-14

### Added
- Toggling boolean options with `!` (e.g. `:set wrap!`) ([`a70cf3d`](https://github.com/replit/codemirror-vim/commit/a70cf3d), [#127](https://github.com/replit/codemirror-vim/pull/127))
- `:startinsert` ex command ([`6b45af5`](https://github.com/replit/codemirror-vim/commit/6b45af5), [#128](https://github.com/replit/codemirror-vim/pull/128))
- `gq` and `gw` format operators ([`1ad7ca9`](https://github.com/replit/codemirror-vim/commit/1ad7ca9), [#120](https://github.com/replit/codemirror-vim/pull/120))

### Fixed
- Fat cursor now uses the blink rate from the `drawSelection` plugin ([`7630d21`](https://github.com/replit/codemirror-vim/commit/7630d21), [#141](https://github.com/replit/codemirror-vim/pull/141))
- Repeating word text object operations with `.` ([`0728e75`](https://github.com/replit/codemirror-vim/commit/0728e75), [#146](https://github.com/replit/codemirror-vim/pull/146))
- More accurate cursor rendering using `coordsForChar` when available ([`51f5d53`](https://github.com/replit/codemirror-vim/commit/51f5d53), [#134](https://github.com/replit/codemirror-vim/pull/134))
- Changes made by spellcheck and other external sources are no longer blocked ([`22db7fa`](https://github.com/replit/codemirror-vim/commit/22db7fa), [#135](https://github.com/replit/codemirror-vim/pull/135))
- `dg$` at the end of a line ([`54adde7`](https://github.com/replit/codemirror-vim/commit/54adde7), [#123](https://github.com/replit/codemirror-vim/pull/123))
- Key matching edge cases ([`3c76a78`](https://github.com/replit/codemirror-vim/commit/3c76a78), [#117](https://github.com/replit/codemirror-vim/pull/117))
- Linewise change (`cc`, `S`) no longer autoindents ([`e06ca72`](https://github.com/replit/codemirror-vim/commit/e06ca72), [#116](https://github.com/replit/codemirror-vim/pull/116))

## [@replit/codemirror-vim@6.0.14] - 2023-04-24

### Added
- `:normal` ex command ([`eeefcd1`](https://github.com/replit/codemirror-vim/commit/eeefcd1), [#105](https://github.com/replit/codemirror-vim/pull/105))

### Fixed
- Cursor position after `p` now matches vim ([`ee71308`](https://github.com/replit/codemirror-vim/commit/ee71308), [#113](https://github.com/replit/codemirror-vim/pull/113))
- Repeating insert mode edits that involve auto-closed paired characters ([`65238f4`](https://github.com/replit/codemirror-vim/commit/65238f4), [#107](https://github.com/replit/codemirror-vim/pull/107))
- `noremap` support ([`8ac54f4`](https://github.com/replit/codemirror-vim/commit/8ac54f4), [#114](https://github.com/replit/codemirror-vim/pull/114))

## [@replit/codemirror-vim@6.0.13] - 2023-04-19

### Fixed
- Block cursor over a tab character now behaves like vim ([`2b70895`](https://github.com/replit/codemirror-vim/commit/2b70895), [#110](https://github.com/replit/codemirror-vim/pull/110))

## [@replit/codemirror-vim@6.0.12] - 2023-04-18

### Added
- `omap` (operator-pending mode mappings) ([`675d2b7`](https://github.com/replit/codemirror-vim/commit/675d2b7), [#97](https://github.com/replit/codemirror-vim/pull/97))

### Changed
- Block text objects match vim 9 behavior when the cursor is outside the block ([`d156c65`](https://github.com/replit/codemirror-vim/commit/d156c65), [#104](https://github.com/replit/codemirror-vim/pull/104))

### Fixed
- Composition not ending on Firefox on Linux ([`59c1d63`](https://github.com/replit/codemirror-vim/commit/59c1d63), [#102](https://github.com/replit/codemirror-vim/pull/102))
- Composition event ordering on Safari ([`3c5185f`](https://github.com/replit/codemirror-vim/commit/3c5185f), [#100](https://github.com/replit/codemirror-vim/pull/100))

## [@replit/codemirror-vim@6.0.11] - 2023-03-22

### Fixed
- `f`/`t` character search motions in visual mode ([`a390215`](https://github.com/replit/codemirror-vim/commit/a390215), [#96](https://github.com/replit/codemirror-vim/pull/96))

## [@replit/codemirror-vim@6.0.10] - 2023-03-20

### Fixed
- `ci"` with two strings on the same line ([`91c367f`](https://github.com/replit/codemirror-vim/commit/91c367f), [#92](https://github.com/replit/codemirror-vim/pull/92))
- Tag text objects (`it`/`at`) ([`472b50b`](https://github.com/replit/codemirror-vim/commit/472b50b), [#94](https://github.com/replit/codemirror-vim/pull/94))

## [@replit/codemirror-vim@6.0.9] - 2023-03-03

### Fixed
- Unfocused block cursor no longer hides the character under it ([`0b54a33`](https://github.com/replit/codemirror-vim/commit/0b54a33), [#89](https://github.com/replit/codemirror-vim/pull/89))

## [@replit/codemirror-vim@6.0.8] - 2023-02-28

### Added
- `<C-o>` in insert mode ([`6a08542`](https://github.com/replit/codemirror-vim/commit/6a08542), [#86](https://github.com/replit/codemirror-vim/pull/86))
- Copying with `Ctrl-C` ([`af3a6f0`](https://github.com/replit/codemirror-vim/commit/af3a6f0), [#85](https://github.com/replit/codemirror-vim/pull/85))

## [@replit/codemirror-vim@6.0.7] - 2023-02-27

### Fixed
- Better handling of IME input ([`614e656`](https://github.com/replit/codemirror-vim/commit/614e656), [#83](https://github.com/replit/codemirror-vim/pull/83))

## [@replit/codemirror-vim@6.0.6] - 2023-02-09

### Fixed
- Ex commands without line arguments ([`e33efe8`](https://github.com/replit/codemirror-vim/commit/e33efe8), [#79](https://github.com/replit/codemirror-vim/pull/79))
- `Opt-<key>` shortcuts on macOS ([`0552ce4`](https://github.com/replit/codemirror-vim/commit/0552ce4), [#78](https://github.com/replit/codemirror-vim/pull/78))

## [@replit/codemirror-vim@6.0.5] - 2023-02-08

### Added
- `:d` (delete) and `:j` (join) ex commands ([`99c46ef`](https://github.com/replit/codemirror-vim/commit/99c46ef), [#69](https://github.com/replit/codemirror-vim/pull/69))

### Fixed
- `diw` behavior on whitespace ([`7d4f4f0`](https://github.com/replit/codemirror-vim/commit/7d4f4f0), [#77](https://github.com/replit/codemirror-vim/pull/77))
- `noremap` adding the same mapping repeatedly and ignoring other mappings ([`6cb62bb`](https://github.com/replit/codemirror-vim/commit/6cb62bb), [#74](https://github.com/replit/codemirror-vim/pull/74))

## [@replit/codemirror-vim@6.0.4] - 2022-12-15

### Added
- `<C-r>` (insert register) in insert mode ([`e691a0d`](https://github.com/replit/codemirror-vim/commit/e691a0d), [#61](https://github.com/replit/codemirror-vim/pull/61))

### Fixed
- International keyboard layouts on macOS ([`0f2f22f`](https://github.com/replit/codemirror-vim/commit/0f2f22f), [#60](https://github.com/replit/codemirror-vim/pull/60))
- Operators on surrogate pairs ([`11cff99`](https://github.com/replit/codemirror-vim/commit/11cff99), [#58](https://github.com/replit/codemirror-vim/pull/58))
- Cursor rendering on emoji ([`a90af21`](https://github.com/replit/codemirror-vim/commit/a90af21), [#49](https://github.com/replit/codemirror-vim/pull/49))
- Handling of dead keys ([`d446ff8`](https://github.com/replit/codemirror-vim/commit/d446ff8), [#50](https://github.com/replit/codemirror-vim/pull/50))
- `J` (join lines) on blank lines ([`333c96a`](https://github.com/replit/codemirror-vim/commit/333c96a), [#51](https://github.com/replit/codemirror-vim/pull/51))
- Exception when destroying the vim plugin ([`6566d25`](https://github.com/replit/codemirror-vim/commit/6566d25), [#48](https://github.com/replit/codemirror-vim/pull/48))
- Compatibility with a breaking change in `@codemirror/search` ([`de8424f`](https://github.com/replit/codemirror-vim/commit/de8424f), [#53](https://github.com/replit/codemirror-vim/pull/53))

## [@replit/codemirror-vim@6.0.2] - 2022-07-27

### Added
- `+` (system clipboard) register ([`bfe419d`](https://github.com/replit/codemirror-vim/commit/bfe419d))
- Sentence text objects (`is`/`as`) ([`0a9f493`](https://github.com/replit/codemirror-vim/commit/0a9f493))
- `g0`, `g$` and `g<Arrow>` motions ([`361fb89`](https://github.com/replit/codemirror-vim/commit/361fb89))
- Mapping `<Esc>` in normal mode ([`9d8daf5`](https://github.com/replit/codemirror-vim/commit/9d8daf5))

### Fixed
- Search highlights not appearing when searching for the same text consecutively ([`bfff83c`](https://github.com/replit/codemirror-vim/commit/bfff83c))
- `zb` and `z-` scrolling with wrapped lines ([`e66faf0`](https://github.com/replit/codemirror-vim/commit/e66faf0)) and the two bindings being swapped ([`3b36ff7`](https://github.com/replit/codemirror-vim/commit/3b36ff7))
- Cursor not moving after insertions made by other plugins ([`dca64d9`](https://github.com/replit/codemirror-vim/commit/dca64d9))

## [@replit/codemirror-vim@6.0.1] - 2022-07-08

### Fixed
- Key events are handled according to the CodeMirror 6 API so vim mode sees keys before other handlers suppress them ([`25389b2`](https://github.com/replit/codemirror-vim/commit/25389b2), [#30](https://github.com/replit/codemirror-vim/pull/30); [`92709b8`](https://github.com/replit/codemirror-vim/commit/92709b8))
- Search results are highlighted in newly rendered content when the viewport changes ([`ad1991e`](https://github.com/replit/codemirror-vim/commit/ad1991e))
- Incorrect character coordinates when the editor is scrolled ([`8068238`](https://github.com/replit/codemirror-vim/commit/8068238))
- Merged upstream CodeMirror 5 vim keybinding fixes ([`74c791c`](https://github.com/replit/codemirror-vim/commit/74c791c))

## [@replit/codemirror-vim@6.0.0] - 2022-06-23

### Changed
- Updated to the stable `@codemirror` 6.x packages; the package major version now matches CodeMirror's ([`d4d905d`](https://github.com/replit/codemirror-vim/commit/d4d905d), [#26](https://github.com/replit/codemirror-vim/pull/26))

### Fixed
- `AltGr` is ignored in normal mode ([`27d2329`](https://github.com/replit/codemirror-vim/commit/27d2329), [#22](https://github.com/replit/codemirror-vim/pull/22))

## [@replit/codemirror-vim@0.20.0] - 2022-04-22

### Changed
- Updated `@codemirror` packages to 0.20.0 ([`caa8571`](https://github.com/replit/codemirror-vim/commit/caa8571))

## [@replit/codemirror-vim@0.19.1] - 2022-03-21

### Fixed
- Added `@codemirror/fold` to peer dependencies ([`c277526`](https://github.com/replit/codemirror-vim/commit/c277526))

## [@replit/codemirror-vim@0.19.0] - 2022-01-20

First stable release.

## [@replit/codemirror-vim@0.19.0-beta.7] - 2022-01-17

### Added
- Support for multiple selections in vim mode ([`2843edf`](https://github.com/replit/codemirror-vim/commit/2843edf))
- Search highlighting ([`b9c2b2a`](https://github.com/replit/codemirror-vim/commit/b9c2b2a))
- Status bar showing the current mode, pending keys and ex/search input ([`8092392`](https://github.com/replit/codemirror-vim/commit/8092392))

## [@replit/codemirror-vim@0.19.0-beta.6] - 2021-12-15

### Fixed
- Up/down navigation sometimes jumping two lines when line height isn't uniform ([`698c0e7`](https://github.com/replit/codemirror-vim/commit/698c0e7))

## [@replit/codemirror-vim@0.19.0-beta.4] - 2021-12-10

### Added
- Fat cursor follows the editor's font family and size ([`65397ec`](https://github.com/replit/codemirror-vim/commit/65397ec))

### Fixed
- Macro recording ([`b99d11c`](https://github.com/replit/codemirror-vim/commit/b99d11c))
- Page up/down movement ([`2e791e9`](https://github.com/replit/codemirror-vim/commit/2e791e9))
- Unhandled keyboard events are no longer consumed ([`cd3c4f5`](https://github.com/replit/codemirror-vim/commit/cd3c4f5))
- Cursor positioning error when the DOM element couldn't be found ([`249920f`](https://github.com/replit/codemirror-vim/commit/249920f))

## [@replit/codemirror-vim@0.19.0-beta.3] - 2021-12-03

### Fixed
- Decorations covering the vim cursor ([`33a4e7c`](https://github.com/replit/codemirror-vim/commit/33a4e7c), [`6833da7`](https://github.com/replit/codemirror-vim/commit/6833da7))

## [@replit/codemirror-vim@0.19.0-beta.1] - 2021-12-01

### Fixed
- Handling of `Cmd-C` ([`c91d070`](https://github.com/replit/codemirror-vim/commit/c91d070))
- Cursor is scrolled into view after vim commands ([`30146a9`](https://github.com/replit/codemirror-vim/commit/30146a9))
- Breakage under JS minifiers caused by `defineExtension` ([`04eddc0`](https://github.com/replit/codemirror-vim/commit/04eddc0))

## [@replit/codemirror-vim@0.19.0-beta.0] - 2021-11-29

Initial release: a port of CodeMirror 5's vim mode to CodeMirror 6 ([`9cdf622`](https://github.com/replit/codemirror-vim/commit/9cdf622)).

[@replit/codemirror-vim@6.4.0]: https://github.com/replit/codemirror-vim/compare/v6.3.0...master
[@replit/codemirror-vim@6.3.0]: https://github.com/replit/codemirror-vim/compare/v6.2.1...v6.3.0
[@replit/codemirror-vim@6.2.1]: https://github.com/replit/codemirror-vim/compare/v6.2.0...v6.2.1
[@replit/codemirror-vim@6.2.0]: https://github.com/replit/codemirror-vim/compare/v6.1.0...v6.2.0
[@replit/codemirror-vim@6.1.0]: https://github.com/replit/codemirror-vim/compare/v6.0.14...v6.1.0
[@replit/codemirror-vim@6.0.14]: https://github.com/replit/codemirror-vim/compare/3eeb206...v6.0.14
[@replit/codemirror-vim@6.0.13]: https://github.com/replit/codemirror-vim/compare/171fe7f...3eeb206
[@replit/codemirror-vim@6.0.12]: https://github.com/replit/codemirror-vim/compare/4dd2169...171fe7f
[@replit/codemirror-vim@6.0.11]: https://github.com/replit/codemirror-vim/compare/da81379...4dd2169
[@replit/codemirror-vim@6.0.10]: https://github.com/replit/codemirror-vim/compare/4c1b115...da81379
[@replit/codemirror-vim@6.0.9]: https://github.com/replit/codemirror-vim/compare/6fa8449...4c1b115
[@replit/codemirror-vim@6.0.8]: https://github.com/replit/codemirror-vim/compare/b21b9d1...6fa8449
[@replit/codemirror-vim@6.0.7]: https://github.com/replit/codemirror-vim/compare/8238b16...b21b9d1
[@replit/codemirror-vim@6.0.6]: https://github.com/replit/codemirror-vim/compare/b5474fa...8238b16
[@replit/codemirror-vim@6.0.5]: https://github.com/replit/codemirror-vim/compare/99d02d9...b5474fa
[@replit/codemirror-vim@6.0.4]: https://github.com/replit/codemirror-vim/compare/a86c280...99d02d9
[@replit/codemirror-vim@6.0.2]: https://github.com/replit/codemirror-vim/compare/43a33e6...a86c280
[@replit/codemirror-vim@6.0.1]: https://github.com/replit/codemirror-vim/compare/d4d905d...43a33e6
[@replit/codemirror-vim@6.0.0]: https://github.com/replit/codemirror-vim/compare/fcc2ccd...d4d905d
[@replit/codemirror-vim@0.20.0]: https://github.com/replit/codemirror-vim/compare/30e5687...fcc2ccd
[@replit/codemirror-vim@0.19.1]: https://github.com/replit/codemirror-vim/compare/008ac07...30e5687
[@replit/codemirror-vim@0.19.0]: https://github.com/replit/codemirror-vim/compare/da7f6c7...008ac07
[@replit/codemirror-vim@0.19.0-beta.7]: https://github.com/replit/codemirror-vim/compare/fd01591...ad08308
[@replit/codemirror-vim@0.19.0-beta.6]: https://github.com/replit/codemirror-vim/compare/e23fcfb...fd01591
[@replit/codemirror-vim@0.19.0-beta.4]: https://github.com/replit/codemirror-vim/compare/174ad3a...9bf5ccf
[@replit/codemirror-vim@0.19.0-beta.3]: https://github.com/replit/codemirror-vim/compare/e84275e...174ad3a
[@replit/codemirror-vim@0.19.0-beta.1]: https://github.com/replit/codemirror-vim/compare/db0d18b...fe3dffa
[@replit/codemirror-vim@0.19.0-beta.0]: https://github.com/replit/codemirror-vim/commit/db0d18b
