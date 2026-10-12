---
title: "Computer choices and reproducible dice"
section: explanation
order: 7
description: "Separate legal decisions, random ties and time-limited lookahead."
---

## Two different random streams

```ts
import {settingsFor,newGame,rollOpening,choosePlay,seededRandom,seededDice,rollFrom} from "@johnmorrisdotca/sugoroku";
const game = rollOpening(newGame(settingsFor("backgammon")),[3,1]);
console.log(choosePlay(game,{strength:"greedy",random:seededRandom(42)}).moves);
console.log(rollFrom(seededDice(42),2));
```

A `Random` returns a fraction in [0,1); a `DiceSource` returns an integer from 1 to 6. Do not pass one where the other is expected. Keep die calls in chronological order so a seeded record can verify them. The host may instead supply dice through the mounted host-dice mode.

## Strength and time

Random chooses a legal play; greedy evaluates resulting positions. Careful and strong look ahead through candidate plays and replies. Default lookahead uses a millisecond budget, so ties/randomness and machine speed can affect a choice. Supply seeded tie-breaking randomness and use a fixed policy for repeatable comparisons; `budget:Infinity` removes the time cutoff when a host deliberately accepts the cost. Evaluated win chances are a heuristic, not exact dice probabilities or match equity. `computerAction` follows the phase; `stepComputer` applies it, returning `null` when the game is over. See [ComputerOptions](api:ComputerOptions).
