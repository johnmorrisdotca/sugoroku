---
title: "盤面と局面の描画・埋め込み"
section: how-to
order: 6
description: "静的な図と標準の遊べる盤面を選びます。"
---

## 図はSVG文字列

```ts
import {settingsFor,startPosition} from "@johnmorrisdotca/sugoroku";
import {drawSugoroku} from "@johnmorrisdotca/sugoroku/draw";
const settings = settingsFor("nackgammon");
console.log(drawSugoroku(startPosition(settings.variant),{variant:settings.variant,label:"Nackgammonの開始",numbers:true}).startsWith("<svg"));
```

局面と種類を合わせ、読み上げラベルを付けます。`view`、上がる側、向きは図を変え、規則は変えません。遊べる盤面は`/play`を使い、ホストの撤去時に破棄します。

```ts no-run
import {mountSugoroku} from "@johnmorrisdotca/sugoroku/play";
const host = document.createElement("div");document.body.append(host);
const board = mountSugoroku(host,{variant:"backgammon",seed:42,computer:{white:null,black:null},dice:"host"});
console.log(board.game().phase);board.destroy();
```

## 二種類の作成

[ビルダー](https://johnmorrisdotca.github.io/sugoroku/builder.html)で遊べる盤面と記事用の局面を選べます。`/element/define`は`sugoroku-board`と`sugoroku-position`を登録します。静的な局面は対応するGNU IDまたは完全なJSONを受け、画像のままです。表示幅、テーマ、ラベルは規則を変えません。イベントはShadow DOMを越え、iframeからも送られるのでoriginと送信元を確認します。[全仕様](../../embeds.md)にgetter、コールバック、設定の優先順があります。
