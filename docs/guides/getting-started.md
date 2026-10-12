---
title: "Getting started"
section: tutorial
order: 1
description: "Open a game and play one complete legal turn."
---

## Pure state first

Install `@johnmorrisdotca/sugoroku` with npm. The root entry provides variants, rules, games, matches, dice and records without DOM. Drawing and mounting have separate entries.

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playTurn} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const game = rollOpening(newGame(settings),[3,1]);
const play = legalPlaysOf(game)[0];
const next = playTurn(game,play.moves);
console.log(game.turn,next.turn,next.phase);
```

White's higher opening die selects White; ordinary backgammon plays those two opening dice. `playTurn` applies a complete legal play and ends the turn. Keep the original state if you need to compare or undo host actions; rule functions return new values.

Next read [legal turns](turns.md), [variants](variants.md), [cube/matches](matches.md) or [native boards](drawing-embeds.md). Every public export has its own example in the [root reference](entry:main). Inputs from another engine should first be mapped to native numbering and variant rules.
