# Backgammon embeds

The shared builder has a playable-board maker and an article-position maker. It covers every observed attribute, mounted option and native draw option, or explains why structured data/callback/custom-colour options belong to host code. Copied code uses the package's current major version. Setup stays in the URL, including cleared choices and disabled defaults.

The playable board preserves its native game and match getters and methods: roll, move, undo, done, double, take, drop, beaver, resign, nextGame, newMatch and record. Every attribute is reflected; camel names are autoEnd and computerDelay. Assigning beaver changes the attribute; calling beaver() retains its action. Boolean attributes accept false/off/no/0. Options accepts the complete native mount choices, custom colours and names, a match and callbacks. Attribute choices take precedence; presets take priority over variant/rules. Callback and presentation changes preserve play. Disconnected queued updates cannot remount a board.

Sugoroku-position uses the native drawSugoroku writer. Position is a GNU 14-character ID (with turn identifying the on-roll side) or complete JSON Position data. The JSON has two 24-count point arrays and white/black pairs for bar, reserve and off. Counts and totals are validated against the variant. GNU IDs cannot encode reserve checkers; use JSON or options.position for those diagrams. Without position, the chosen variant's start is drawn. Value is the structured position or null for invalid input. Options accepts all native drawing fields, position and onChange; style defaults to true and can be disabled when host code supplies the native style.

Both makers support display size small/medium/large (320/480/640px), optional pixel width, device/light/dark theme and a spoken label. Width and label restore the original host values when removed. Native auto orientation follows available width and styles work inside shadow roots. Static positions remain pictures; playable boards retain native keyboard, touch, reduced-motion and drag behavior.

Native playable events retain the same meaning and callbacks retain their original detail. Events now bubble, compose and have JSON-safe copies. Sugoroku-load gives the playable game/match or the static variant/position. Sugoroku-change gives a static position, and sugoroku-error gives a plain message with a visible status. Frames forward { type, detail }; hosts should check the sender origin and frame.

Frames at embed/ and embed/position/ validate variants, presets, looks, player strengths, booleans, bounded integers and seeds, consistent rules and position data, ignoring malformed fields. They have noindex, a device colour-scheme, transparent margins and no document scrolling. They read no storage or hosted services; copied imports use jsDelivr. Local packaged sounds retain their existing opt-in behavior.

## Builder usage


[Build a backgammon embed](https://johnmorrisdotca.github.io/sugoroku/builder.html), preview a playable board or an article's position, and copy element, iframe, module, React 19, Vue, Svelte, Angular, HTML or URL code. Choices stay in the URL; embeds read no storage.

The playable board adds display `size` (small 320px, medium 480px, large 640px), pixel `width` and a spoken `label`. Attributes have reflected properties, with `autoEnd` and `computerDelay` for hyphenated names. `options` accepts all native mounted options, including colours, names, match and callbacks. Existing `game` and `match` getters and board methods remain. Assigning `beaver` reflects the rule while calling `beaver()` still performs the native action.

`<sugoroku-position position="4HPwATDgc/ABMA" turn="white" size="small">` shows a GNU Backgammon position ID; `position` also accepts complete JSON position data. Without it, the element shows the chosen variant's start. Its structured `value` and native drawing `options` are available to host code. `defineBoard` and `definePosition` accept custom tags; `@johnmorrisdotca/sugoroku/element/define` registers both. The position also supports `variant`, `board`, `checkers`, `theme`, `home`, `view`, `numbers`, `orientation`, `lang`, `size`, `width` and `label`. See [the embed guide](docs/embeds.md).
