---
title: "Write notation and replay records"
section: how-to
order: 5
description: "Keep chronological actions and verify a record against native rules."
---

## Record what actually happened

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,GameRecorder,replayRecord,formatPlay} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const game = rollOpening(newGame(settings),[3,1]);
const play = legalPlaysOf(game)[0];
const record = new GameRecorder(settings);
record.startGame();record.opening([3,1]);record.turn("white",[3,1],play.moves);
console.log(formatPlay(play.moves),replayRecord(record.text()).ok);
```

A recorder writes actions; replay is the validator. It checks setup, phase, legal turns, cube decisions and claimed results, returning `{ok:false,line,reason}` on refusal. An unfinished record can have a valid current game. The record version is distinct from package version.

## Seed and position identity

If a record includes a seed, every die must match `seededDice` in order, including tied opening throws. Omit the seed for externally supplied dice; do not attach an unrelated one afterward. Text seeds consisting only of digits must be passed as numbers. `formatPlay`/`parsePlay` use standard move notation and variant-aware legal turns. GNU position IDs encode supported checker positions with an on-roll side, but cannot carry reserve checkers; native position text or JSON is available for those. See [positionId](api:positionId) and [the record format](../../README.md#games-as-text).
