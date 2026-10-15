---
title: "キューブと試合の得点"
section: how-to
order: 4
description: "可能な段階でダブル、テイク、ドロップを扱います。"
---

## 振る前のキューブ判断

```ts
import {settingsFor,newGame,rollOpening,legalPlaysOf,playTurn,canDouble,offerDouble,takeDouble,newMatch,pointsToGo} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("backgammon",{points:5,cube:true});
const opened = rollOpening(newGame(settings),[3,1]);
const game = playTurn(opened,legalPlaysOf(opened)[0].moves);
console.log(canDouble(game),takeDouble(offerDouble(game)).cube);
console.log(pointsToGo(newMatch(settings),"white"));
```

ダブルは振る前に、可能な所有者、または中央ならどちらからでも提案します。テイクで値が倍になり所有権が移り、ドロップは以前の値で終了します。beaverは有効な規則と提案中のダブルが必要で、専用の応答段階があります。表示値だけでなく`canDouble`、`canBeaver`を確認します。

## 結果を一度加える

`newMatch`は得点、結果、Crawfordを保持し、`startGame`は得点とキューブなしの指定を引き継ぎます。完了した`GameResult`を一度だけ`finishGame`に渡します。目標点で試合が終わり、points 0は目標なしで得点を続けます。勝ちの倍率は設定した規則に従い、死んだキューブとCrawfordも標準の判断です。[finishGame](api:finishGame)と[記録の検証](records.md)を参照してください。
