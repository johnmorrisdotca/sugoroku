---
title: "Handle the cube and match score"
section: how-to
order: 4
description: "Offer, take or drop only in the allowed phase."
---

## A cube decision before rolling

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playTurn,canDouble,offerDouble,takeDouble,newMatch,pointsToGo} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const opened = rollOpening(newGame(settings),[3,1]);
const game = playTurn(opened,legalPlaysOf(opened)[0].moves);
console.log(canDouble(game),takeDouble(offerDouble(game)).cube);
console.log(pointsToGo(newMatch(settings),"white"));
```

A double is offered before rolling by the eligible cube owner, or either side while centred. Taking doubles the cube and transfers ownership; dropping ends at the old value. A beaver needs its rule enabled and an offered double, and has its own response phase. Consult `canDouble`/`canBeaver` rather than guessing from the displayed value.

## Record one result once

`newMatch` keeps scores, results and Crawford bookkeeping; `startGame` inherits the current score and cube-free Crawford flag. Feed the completed `GameResult` once to `finishGame`. A match ends at its point target, while points 0 keeps the score without a target. Single, gammon and backgammon multipliers respect configured rules. The dead cube and Crawford restrictions are native decisions. See [finishGame](api:finishGame) and [record validation](records.md).
