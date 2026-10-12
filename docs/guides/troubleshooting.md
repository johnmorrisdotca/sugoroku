---
title: "Troubleshooting and FAQ"
section: troubleshooting
order: 9
description: "Interpret illegal-phase errors, refused records and unsupported IDs."
---

## Phase and turn errors

Roll only in the appropriate phase. Opening ties require another opening throw; some variants then require a normal roll rather than playing the opening dice. A complete `playTurn` already ends the turn. With individual `playMove` calls, finish required dice before `endTurn`. A double needs a before-roll decision and an eligible cube; take/drop require an actual offer. Check native legal lists and capability predicates before accepting host controls.

## Nullable parsing and replay

`parseHops`, `parsePlay` and `parsePosition` return `null` for invalid notation or data. `positionId` can return `null` for a position outside its format, including reserve checkers; `positionFromId` and `readEmbedPosition` reject invalid/incompatible inputs. Unknown preset lookups return `undefined`. A replay refusal instead has `ok:false`, a line number and reason. Inspect that discriminant before reading match/current fields.

`computerAction`, `stepComputer` and `sideToAct` return `null` when no decision is available; opening has no single acting side. Optional sound failures should not decide a game. Destroy removed mounts and import `/element/define` when tags need registration. See [turns](turns.md), [records](records.md) and [embeds](drawing-embeds.md).
