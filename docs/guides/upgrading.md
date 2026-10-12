---
title: "Upgrading and moving a host"
section: upgrading
order: 10
description: "Preserve native numbering, records and embed precedence."
---

## Version 1 and record version

The current public major is 1; [the changelog](../../CHANGELOG.md) records actual releases. The docs rollout changes comments and navigation without changing SDK behavior. The record's format version is independent; never rewrite it to the package version. To preserve a saved game, retain its variant, complete rules, action order and the seed only when dice followed that seed.

Native embeds now expose reflected choices, display widths and spoken labels while preserving getters and actions. Presets take precedence over variant/rule attributes; host callbacks and presentation updates preserve play. Static positions remain diagrams. [The existing embed contract](../embeds.md) explains the beaver reflected-property/action compatibility and custom tags.

## Another backgammon engine

Map own-point numbering, side indices, bar and borne-off positions explicitly. Keep Tabula's same-track movement and reserve checkers separate from ordinary backgammon/GNU IDs. Import a foreign notation only through native parsing and verify a record before accepting its score. Another engine's cube policy, match equity or computer rating is not interchangeable with Sugoroku's heuristics. There is no published second-major migration to invent.
