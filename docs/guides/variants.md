---
title: "Choose variants and named presets"
section: how-to
order: 3
description: "Resolve a variant separately from cube and match rules."
---

## A variant is a specification

```ts
import {settingsFor,variantSpec,startPosition,presetByKey,PRESETS} from "@johnmorrisdotca/sugoroku";
const settings = settingsFor("tabula",{points:1});
console.log(settings.variant.dice,startPosition(settings.variant).reserve);
console.log(variantSpec("hypergammon").checkers,presetByKey(PRESETS[0].key)?.names);
```

The engine reads checker counts, start layout, dice, direction, opening and goal, not a display name. Seven keys cover backgammon, its bar-start race, anti-backgammon, Nackgammon, Long Gammon, Hypergammon and Tabula. A preset pairs a variant with complete rules, preserving the named play choices documented from older sites.

## Validate the requested rules

`settingsFor` resolves partial rule choices; `rulesProblems` explains inconsistent complete rules. A single one-point game has no active cube; Crawford, Jacoby and beaver settings have their own applicable contexts. Do not swap a variant's start position without its move rules. `presetByName`/`presetByKey` return `undefined` for unknown names/keys. The [variant source notes](../VARIANTS.md) retain the readings and their reasons, including same-track and reserve-checker distinctions.
