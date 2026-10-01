# Changelog

All notable changes to this project are written here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-01

The first release: Sugoroku, backgammon and its variants, with their rules, the
doubling cube and matches, games as text, a computer player and the board drawn and
played in a page, and a demo to play.

- The rules of backgammon: entry from the bar, hitting, blocks, both dice if possible
  and the larger if only one, doubles four times, bearing off including the higher-number
  rule; held to a brute-force search on thousands of positions of every variant.
- Seven variants as rows of settings, and the names ItsYourTurn.com and GoldToken.com
  printed as presets: Backgammon, Backgammon Race, Anti-Backgammon, Nackgammon, Long
  Gammon, Hypergammon and Tabula, with matches to 3, 5, 7 and 9 points. How each was read
  is in `docs/VARIANTS.md`.
- The doubling cube (offer, take, drop, beaver off by default), gammon and backgammon
  scoring, match play with the Crawford rule and the dead cube, the Jacoby rule for money
  play, giving up and drawing.
- Games as text that replay against the rules, a seeded dice sequence, standard move
  notation, positions as text, and GNU Backgammon's position ID for the standard board.
- A computer player in four strengths (`random`, `greedy`, `careful`, `strong`) with a
  cube it can reason about, written for this package.
- The board drawn as SVG, lying down or standing up, with the checkers, dice and cube,
  named boards and checkers, any colours, light and dark, and numbers on the points;
  played by touch and mouse as a function or a `<sugoroku-board>` tag, with undo, the cube
  and either side the computer's, in English and Japanese, with optional sounds from
  Kenney's CC0 Casino Audio pack.
- A demo with a variant chooser, match length, computer strength and every look.
