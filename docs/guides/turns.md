---
title: "Play legal turns and undo moves"
section: how-to
order: 2
description: "Distinguish a move from a full turn and honor required dice."
---

## Manual moves or a complete play

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playMove,endTurn,undoMove} from "@johnmorrisdotca/sugoroku";
const game = rollOpening(newGame(settingsFor("backgammon")),[3,1]);
const play = legalPlaysOf(game)[0];
const first = playMove(game,play.moves[0]);
console.log(first.moves.length,undoMove(first).moves.length);
const moved = play.moves.reduce((state,step)=>playMove(state,step),game);
console.log(endTurn(moved).phase);
```

`playMove` takes source/destination and keeps the turn in progress. `undoMove` takes back one move within that turn; `restartTurn` restores its starting position. Call `endTurn` only after all required dice have been played. Alternatively `playTurn` takes the whole play and ends it itself: do not call `endTurn` again.

## Let native rules decide

Use `legalMoves` for next steps and `legalPlaysOf` for complete turns. The search enforces playing as many dice as possible and the larger die when only one can be used. Doubles become four moves for ordinary backgammon; Tabula uses three dice without that special doubling. Bar entry, hitting and bearing off belong to the variant. Invalid phase, roll or move calls throw; they do not silently accept a partial turn. See [notation](records.md) and [nextMoves](api:nextMoves).
