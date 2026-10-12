---
title: "Architecture and immutable state"
section: explanation
order: 8
description: "Follow the board, move, turn, game and match layers."
---

## Source organization

The rules, the formats and the computer are plain functions over plain data with no DOM. The
drawing and the playable board are separate entries.

```text
src/
├── index.ts          the main entry: everything but the drawing and the page
├── side.ts           the two sides, white and black
├── variants.ts       every variant as a row of settings
├── rules.ts          the rules a name adds (match, cube, Crawford, Jacoby, gammons), and the named presets
├── board.ts          a position as plain data: counts, pips, the start, which point is which
├── moves.ts          every move of one die, and what a move does
├── plays.ts          whole turns: the dice that must be played, every different play, what may be played next
├── game.ts           a game in play: the opening, a roll, a move, undo, the cube, giving up, the result
├── match.ts          a match: the score, the Crawford game, the end
├── random.ts         the seeded random numbers
├── dice.ts           seeded dice, and dice from the device
├── notation.ts       moves and positions as text, and reading a written play back
├── positionId.ts     position IDs for the standard board
├── record.ts         games as text: written as they are played, and replayed against the rules
├── evaluate.ts       how good a position is: pips, blots, points, primes, anchors, the Keith count
├── computer.ts       the computer's play and cube, in four strengths
├── colours.ts        the colours a board is made of, and the named boards and checkers
├── geometry.ts       where everything is on the drawn board, lying down or standing up
├── style.ts          the style that makes the drawing a board, and keeps it from being selected
├── draw.ts           the board as SVG text
├── draw-entry.ts     the "/draw" entry: everything that draws
├── strings.ts        the words, in English and Japanese
├── sound.ts          the optional sounds
├── playStyle.ts      the style of the playable board
├── mount.ts          a board to play in any element: touch, mouse, buttons, computer, events, record
├── play-entry.ts     the "/play" entry
├── element.ts        the <sugoroku-board> class
├── element-define.ts defines the tag on the page
└── version.ts        the package's version
```

Tests sit beside the code they test (`*.test.ts`). The rules are held to `brute.fixture.ts`,
which tries every order of the dice and every move on thousands of positions of every
variant; `simulate.test.ts` plays thousands of games to their end, at random and by the
computer, and checks that every checker is accounted for and the pips move by what was
played; and a game written down must replay to the same result. `scripts/` builds the demo
and checks the package as npm packs it; `demo/` is the playable page and `e2e/` plays it in
real browsers (Chromium and WebKit, at a phone's width and a desk's). The sounds are in
`sounds/`; `docs/VARIANTS.md` says how each variant was read.

## State and display

Position is checker counts, independent of dice and phase. GameState adds the turn plan, cube and result; Match carries completed results and Crawford bookkeeping. Lower-level move helpers assume native legal preconditions; public game transitions enforce phase and full-turn obligations. Record replay checks an action sequence through those transitions instead of trusting a supplied snapshot.

Drawing and mounting consume this state; they do not provide alternate rules. Colours and orientation affect SVG only. The static docs generator reads public comments and checked examples, and its build/search dependencies remain development tools. [The variant notes](../VARIANTS.md) preserve existing rule-source readings.
