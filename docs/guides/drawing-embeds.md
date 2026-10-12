---
title: "Draw and embed boards or positions"
section: how-to
order: 6
description: "Choose a static diagram or a native playable board."
---

## A diagram is SVG text

```ts
import {settingsFor,startPosition} from "@johnmorrisdotca/sugoroku";
import {drawSugoroku} from "@johnmorrisdotca/sugoroku/draw";
const settings = settingsFor("nackgammon");
console.log(drawSugoroku(startPosition(settings.variant),{variant:settings.variant,label:"Nackgammon start",numbers:true}).startsWith("<svg"));
```

Match the position's variant and supply a spoken label. `view`, home direction and orientation affect the drawing, not the game rules. For interactive play, use `/play`; destroy its handle when removing the host.

```ts no-run
import {mountSugoroku} from "@johnmorrisdotca/sugoroku/play";
const host = document.createElement("div");document.body.append(host);
const board = mountSugoroku(host,{variant:"backgammon",seed:42,computer:{white:null,black:null},dice:"host"});
console.log(board.game().phase);board.destroy();
```

## Two native makers

The [builder](https://johnmorrisdotca.github.io/sugoroku/builder.html) offers a playable board and an article position. `/element/define` registers `sugoroku-board` and `sugoroku-position`. Static positions accept a compatible GNU ID or complete validated JSON, and stay pictures. Display size, width, theme and labels do not alter rules. Events cross shadow roots and frames forward JSON-safe detail; check the origin and sending frame. The [full embed contract](../embeds.md) preserves native getters, callbacks, rule/preset precedence and scoped behavior.
