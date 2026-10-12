---
title: "表記と記録の再生"
section: how-to
order: 5
description: "時系列の操作を保ち、標準の規則で記録を検証します。"
---

## 実際の操作を記録する

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,GameRecorder,replayRecord,formatPlay} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const game = rollOpening(newGame(settings),[3,1]);
const play = legalPlaysOf(game)[0];
const record = new GameRecorder(settings);
record.startGame();record.opening([3,1]);record.turn("white",[3,1],play.moves);
console.log(formatPlay(play.moves),replayRecord(record.text()).ok);
```

記録器は操作を書き、再生が検証します。設定、段階、合法な手番、キューブ、申告した結果を確認し、拒否では `{ok:false,line,reason}` を返します。途中までの記録も現在のゲームを持てます。記録の版とパッケージの版は別です。

## シードと局面

記録にシードがあれば、開始時の同点も含め、すべての目が `seededDice` の順に合う必要があります。外部の目ならシードを省略し、関係のないものを後から付けません。数字だけの文字列は数値で渡します。`formatPlay` と `parsePlay` は種類に合う合法な表記を扱います。GNU 局面 ID は手番側を伴う対応する局面を表せますが、未投入の駒は含められません。その場合は標準のテキストや JSON を使います。[positionId](api:positionId)と [記録形式](../../../README.md#games-as-text)を参照してください。
