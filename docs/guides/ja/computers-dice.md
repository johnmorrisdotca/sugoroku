---
title: "コンピューターの手と再現できるサイコロ"
section: explanation
order: 7
description: "合法な判断、同点の乱数、時間制限の探索を分けます。"
---

## 二つの乱数の型

```ts
import {settingsFor,newGame,rollOpening,choosePlay,seededRandom,seededDice,rollFrom} from "@johnmorrisdotca/sugoroku";
const game = rollOpening(newGame(settingsFor("backgammon")),[3,1]);
console.log(choosePlay(game,{strength:"greedy",random:seededRandom(42)}).moves);
console.log(rollFrom(seededDice(42),2));
```

`Random` は [0,1) の値、`DiceSource` は 1〜6 の整数です。取り違えないでください。シード付き記録の検証には、目を時系列に取得します。設置した盤面のホスト指定モードでは外部の目も渡せます。

## 強さと時間

random は合法な手を選び、greedy は結果の局面を評価します。careful と strong は候補と応手を先読みします。標準の探索にはミリ秒の予算があり、同点の乱数や速度で選択が変わる場合があります。比較を再現するならシード付きの同点処理と固定した方針を使います。負荷を受け入れるホストでは `budget:Infinity` で時間制限を外せます。勝つ可能性の評価は近似で、厳密な確率や試合の期待値ではありません。`computerAction` は段階に従い、`stepComputer` が進めます。終了なら `null` です。[ComputerOptions](api:ComputerOptions)を参照してください。
