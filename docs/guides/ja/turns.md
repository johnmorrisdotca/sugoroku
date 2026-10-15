---
title: "合法な手番と手の取消"
section: how-to
order: 2
description: "一手と一手番を区別し、必要なサイコロを使います。"
---

## 一手ずつ、または一手番全体

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playMove,endTurn,undoMove} from "@johnmorrisdotca/sugoroku";
const game = rollOpening(newGame(settingsFor("backgammon")),[3,1]);
const play = legalPlaysOf(game)[0];
const first = playMove(game,play.moves[0]);
console.log(first.moves.length,undoMove(first).moves.length);
const moved = play.moves.reduce((state,step)=>playMove(state,step),game);
console.log(endTurn(moved).phase);
```

`playMove`は出発点と到着点を受け、手番の途中を保ちます。`undoMove`はその手番の最後の一手、`restartTurn`は手番全体を戻します。必要な目を使い終えてから`endTurn`を呼びます。別の方法として`playTurn`は全体を進め、終了も行います。その後にもう一度終了しないでください。

## 標準の規則に任せる

次の一手は`legalMoves`、手番全体は`legalPlaysOf`です。できる限り目を使い、一つだけなら大きい目を使う規則も守ります。通常のゾロ目は四手、Tabulaは三つのサイコロでゾロ目の特例はありません。バーからの復帰、ヒット、上がりも種類の規則です。不正な段階、目、手は例外になります。[表記](records.md)と[nextMoves](api:nextMoves)を参照してください。
