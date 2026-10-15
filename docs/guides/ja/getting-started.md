---
title: "はじめに"
section: tutorial
order: 1
description: "ゲームを開始し、合法な一手番を進めます。"
---

## 純粋な状態から始める

npmで`@johnmorrisdotca/sugoroku`をインストールします。主入口はDOMを使わず、種類、規則、ゲーム、試合、サイコロ、記録を扱います。描画と設置は別入口です。

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playTurn} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const game = rollOpening(newGame(settings),[3,1]);
const play = legalPlaysOf(game)[0];
const next = playTurn(game,play.moves);
console.log(game.turn,next.turn,next.phase);
```

開始時の大きい目で白が選ばれ、通常のバックギャモンではその二つの目を使います。`playTurn`は合法な一手番全体を進めて終了します。比較やホスト側の操作取消には元の状態を保持します。規則は新しい値を返します。

[合法な手番](turns.md)、[種類](variants.md)、[キューブと試合](matches.md)、[標準盤面](drawing-embeds.md)を参照してください。[主入口](entry:main)には各関数の例があります。別エンジンの入力は、標準の番号と規則へ対応させます。
