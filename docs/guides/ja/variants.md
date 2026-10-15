---
title: "種類と名前付き設定"
section: how-to
order: 3
description: "盤面の種類とキューブ・試合の規則を分けます。"
---

## 種類は仕様

```ts
import {settingsFor,variantSpec,startPosition,presetByKey,PRESETS} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("tabula",{points:1});
console.log(settings.variant.dice,startPosition(settings.variant).reserve);
console.log(variantSpec("hypergammon").checkers,presetByKey(PRESETS[0].key)?.names);
```

エンジンは表示名ではなく、駒数、配置、目、方向、開始、目標を読みます。七つのキーに通常、バーからのレース、逆ルール、Nackgammon、Long Gammon、Hypergammon、Tabulaがあります。名前付き設定は種類と完全な規則を組にし、従来サイトの遊び方を保持します。

## 規則を確認する

`settingsFor`は部分指定を解決し、`rulesProblems`は完全な規則の矛盾を返します。1点の単独ゲームではキューブは使えません。Crawford、Jacoby、beaverには適用する条件があります。移動規則を変えず開始配置だけを取り替えないでください。未知の名前やキーに`presetByName`、`presetByKey`は`undefined`です。[種類の資料](../../VARIANTS.md)に解釈と理由、同じ経路や未投入の駒の違いがあります。
