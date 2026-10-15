---
title: "困ったとき・よくある質問"
section: troubleshooting
order: 9
description: "段階の例外、拒否された記録、未対応のIDを確認します。"
---

## 段階と手番の例外

可能な段階で振ります。開始時に同点なら再び開始の目を取り、種類によっては開始の目を使わず通常のロールを待ちます。`playTurn`は終了も行います。一手ずつなら、必要な目を使ってから`endTurn`を呼びます。ダブルは振る前と使用可能なキューブが必要で、テイク・ドロップには提案が必要です。操作を受け付ける前に合法な一覧と可能かの判定を使います。

## nullと再生の拒否

`parseHops`、`parsePlay`、`parsePosition`は不正な表記やデータに`null`です。`positionId`は未投入の駒など形式外の局面に`null`、`positionFromId`と`readEmbedPosition`は不正・不適合な入力を拒否します。未知の設定は`undefined`です。再生の拒否は`ok:false`、行、理由なので、match/currentを読む前に確認します。

判断がなければ`computerAction`、`stepComputer`、`sideToAct`は`null`です。開始時には単独の操作側がありません。音の失敗でゲームを決めず、撤去する盤面は破棄します。登録には`/element/define`を使います。[手番](turns.md)、[記録](records.md)、[埋め込み](drawing-embeds.md)を参照してください。
