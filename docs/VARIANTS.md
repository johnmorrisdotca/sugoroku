# The variants, and how each was read

Every variant is a row of settings (`VARIANTS` in `src/variants.ts`) and every name
that a player met on ItsYourTurn.com or GoldToken.com is a *preset*: a variant with the
rules that name stood for (`PRESETS` in `src/rules.ts`, found by `presetByName`). The
engine never looks at a variant's name, only at its row.

Everything below was checked against the pages named in [Sources](#sources) on
2026-10-01. Where a source is silent or unclear this says so, and says which reading was
chosen and why.

## The table

The settings of a variant: how many checkers, where they start, how many dice, how
doubles play, which way each side goes round, what wins, and a limit on turns.

| Key | Checkers | Start | Dice | Doubles | Direction | Goal | Turn limit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `backgammon` | 15 | 24:2, 13:5, 8:3, 6:5 | 2 | four moves | opposed | bear off first | none |
| `backgammon-race` | 15 | all off the board, on the bar | 2 | four moves | opposed | bear off first | none |
| `anti-backgammon` | 15 | as `backgammon` | 2 | four moves | opposed | bear off **last** | draw at 500 turns each |
| `nackgammon` | 15 | 24:2, 23:2, 13:4, 8:3, 6:4 | 2 | four moves | opposed | bear off first | none |
| `long-gammon` | 15 | 24:15 | 2 | four moves | opposed | bear off first | none |
| `hypergammon` | 3 | 24:1, 23:1, 22:1 | 2 | four moves | opposed | bear off first | none |
| `tabula` | 15 | all off the board | 3 | no special doubles | same way round, one track | bear off first | none |

Points are the mover's own (24 is the farthest from bearing off). `opposed` means one
side's 24-point is the other's 1-point, as in backgammon; in Tabula both sides enter at
the same table and go the same way. Tabula also keeps every checker in the first half of
the track (own points 13 to 24) until all fifteen have entered.

The rules a name adds are separate from the variant: the match length (`points`, where 1
is a single game and 0 is money play), the doubling cube, the Crawford rule, the Jacoby
rule, beavers, and whether gammons and backgammons count extra (`Rules` in
`src/rules.ts`). A one-point game has no cube, since it is its own Crawford game.

## Every name

| Name on the site | Preset | Variant | Match | Cube | Gammons |
| --- | --- | --- | --- | --- | --- |
| Backgammon | `backgammon` | `backgammon` | single game | no | no |
| Backgammon Level 2, Level 3 | `backgammon` | `backgammon` | single game | no | no |
| Casual Backgammon | `backgammon` | `backgammon` | single game | no | no |
| Backgammon (3 Point) | `backgammon-3` | `backgammon` | 3 | yes, with Crawford | yes |
| Backgammon (5 Point), Pro Backgammon, Pro Backgammon Level 2 | `backgammon-5` | `backgammon` | 5 | yes, with Crawford | yes |
| Backgammon (7 Point) | `backgammon-7` | `backgammon` | 7 | yes, with Crawford | yes |
| Backgammon (9 Point), Pro Backgammon-9 | `backgammon-9` | `backgammon` | 9 | yes, with Crawford | yes |
| Backgammon Race, Backgammon Race Level 2 | `backgammon-race` | `backgammon-race` | single game | no | no |
| Pro Backgammon Race | `backgammon-race-5` | `backgammon-race` | 5 | yes, with Crawford | yes |
| Anti-Backgammon | `anti-backgammon` | `anti-backgammon` | single game | no | no |
| Nackgammon | `nackgammon` | `nackgammon` | single game | no | no |
| Nackgammon (3 Point) | `nackgammon-3` | `nackgammon` | 3 | yes, with Crawford | yes |
| Nackgammon (5 Point), Pro Nackgammon | `nackgammon-5` | `nackgammon` | 5 | yes, with Crawford | yes |
| Nackgammon (7 Point) | `nackgammon-7` | `nackgammon` | 7 | yes, with Crawford | yes |
| Nackgammon (9 Point) | `nackgammon-9` | `nackgammon` | 9 | yes, with Crawford | yes |
| Long Gammon | `long-gammon` | `long-gammon` | single game | no | no |
| Long Gammon (3, 5, 7, 9 Point) | `long-gammon-3` and so on | `long-gammon` | 3, 5, 7, 9 | yes, with Crawford | yes |
| Hypergammon | `hypergammon` | `hypergammon` | single game | no | no |
| Hypergammon (3 Point), (5 Point) | `hypergammon-3`, `hypergammon-5` | `hypergammon` | 3, 5 | yes, with Crawford | yes |
| Tabula | `tabula` | `tabula` | single game | no | no |

## What the sources say, and what was decided

### The rules every variant shares

ItsYourTurn's backgammon help, and GoldToken's rules page, agree on the movement and
they are the ordinary rules: a checker may not land on a point held by two or more of the
other side; landing on a lone checker hits it and sends it to the bar; a side with a
checker on the bar must enter it before anything else, onto the other side's home board
at 25 minus the die; both dice must be played if possible, and if only one can be, the
larger if either can; doubles are four moves; a side may bear off only with every checker
home, by the exact die or, with nothing on a higher point, by a larger one. GoldToken adds
that the opening throw decides who starts and that "it is never possible to start the game
with doubles", which is what the engine does: each side throws a die, a tie is thrown
again, and the higher die's side plays both dice as its first roll. ItsYourTurn arrives at
the same thing (the roll that decides who starts is the starter's first roll).

### Scoring, the cube, the Crawford rule

ItsYourTurn: "Pro Backgammon" is a match to 5 points, a single game is 1, a gammon 2 and a
backgammon 3, multiplied by the cube. The cube starts invisible at 1, either side may
double at the start of its turn, only the side that took the last double may redouble,
a dropped double ends the game at the cube's value before the offer. The Crawford round is
the game after a side first reaches one point short (4 of 5, and 8 of 9 for Pro
Backgammon-9). GoldToken says the same for its point matches, and adds that once the cube
is high enough for either side to win the match with it the cube is frozen (`cubeIsDead`
here), that a game may be given up at the worst the position could cost (`concedeKind`),
and that an offer of a draw ends the whole match (`agreeDraw`, and a drawn game ends the
match). Neither site has beavers or the Jacoby rule; both are options here for money play
(`points: 0`) and are off by default, as the Jacoby rule and beaver are described on
Wikipedia's Backgammon page. The cube stops at 64, the highest number on a cube, though
Wikipedia notes the stakes may in principle go on.

### "Backgammon", "Casual Backgammon", "Level 2" and "Level 3"

*Unclear in the brief; clear in ItsYourTurn's help.*

- **Level 2 and Level 3** are not rules. ItsYourTurn's tournament FAQ ("Where are Level 2
  or Level 3 tournament types?") says they are tournament tiers: a Level 2 tournament is
  open to somebody who has already won a tournament section, and Level 3 to a winner of a
  round 2 or higher section or of a Level 2 section. "Backgammon Level 2" is therefore
  Backgammon played in a Level 2 tournament, and "Pro Backgammon Level 2" Pro Backgammon
  in one. They share their base game's preset.
- **Casual Backgammon.** The same FAQ: "Both of these are regular backgammon with no
  doubling cube and no distinction between single wins, gammons, and backgammons. The
  reason for having these two categories ... is to divide the backgammon tournaments."
  So Casual Backgammon is Backgammon: the preset shared with it.
- **Plain "Backgammon"** on ItsYourTurn is "the first player to bear off all her checkers
  wins": a single game, no cube. On GoldToken, which has "Backgammon (3 Point)" and so
  on beside plain "Backgammon", the rules page does not say what the plain one is; the
  chosen reading is the same single game with no cube (the cube is described there under
  "multipoint gammon"). If GoldToken's plain Backgammon in fact scored gammons, the preset
  differs from it only in `gammons`.

### Backgammon Race

*The brief called this "race (no contact)"; ItsYourTurn's help says otherwise.* "In
Backgammon Race, all checkers are on the bar at the start of the game. They must be played
onto the board according to the roll of the dice. As in regular backgammon, checkers
enter the board in the opponent's home table. A player may move checkers on the board
even while checkers that were originally on the bar remain there; however, checkers that
are hit and sent to the bar by the opponent must be played off the bar before any others
are moved. All other rules are the same as regular Backgammon. The doubling cube is not
used." Hitting is still possible: it is a game that starts from the bar, not a game with
no contact. That is what `backgammon-race` is: `reserve` checkers (never entered) may
enter whenever the side likes, while checkers on the `bar` (hit) must enter first. The
page's note that it resembles Acey-Deucey "but a roll of doubles is played the same as in
regular Backgammon" is why no acey-deucey bonus applies. "Pro Backgammon Race" is the same
start "played with a doubling cube. Match to 5 points, Crawford round supported."

### Anti-Backgammon

ItsYourTurn: "The object of Anti-Backgammon (BA) is to not be the first to bear off all
your pieces. If an Anti-Backgammon game reaches 500 moves per side, then it is declared a
draw regardless of the state of the game. All other rules are the same. The doubling cube
is not used." So the board and the moves are the standard ones, the side that bears off
every checker first loses, there is no cube and no gammons, and a game of 500 turns each is
a draw (`drawAfter: 500`).

### Nackgammon

bkgm.com: invented by Nack Ballard; "the setup is the same as in backgammon except that one
checker from each player's six-point and mid-point are moved to the opponent's two-point.
The players start with four back checkers rather than the usual two." That is 24:2, 23:2,
13:4, 8:3, 6:4. bkgm says it is "played using the doubling cube and the Jacoby rule", which
is how it is played for money; ItsYourTurn only says it is "the same as regular backgammon,
but with a different starting board", and its Pro Nackgammon is the same board "played with
a doubling cube. Match to 5 points". GoldToken's "Nackgammon (n Point)" are read as
`Backgammon (n Point)` on this board. The Jacoby rule is not used in matches.

### Long Gammon

bkgm.com: "all fifteen of your checkers start on the opponent's one-point. All other rules
of the game are the same as regular backgammon. The doubling cube is used. Gammons and
backgammons count double and triple as usual." The start is 24:15. Plain "Long Gammon"
on GoldToken is read as a single game and the point variants as matches, as for Backgammon.

### Hypergammon

bkgm.com and Wikipedia: three checkers each, on the opponent's one, two and three points
(here 24, 23 and 22); the rules are those of backgammon; a cube is used, and money play
uses the Jacoby rule. Hugh Sconyers solved the game by computer in the early 1990s. GoldToken's
"Hypergammon (3 Point)" and "(5 Point)" are matches with the cube.

### Tabula

bkgm.com ("Tabula (Roman Backgammon)", after Kowalski): three dice; all fifteen checkers
start off the board; both sides enter into the same starting table and move the same way
round; a roll is three separate moves ("there is no such thing as doubles"); "you may not
move a checker to the second half of the board until all of your other checkers have been
entered"; a checker on a point alone is a blot and can be hit and must re-enter first;
"you must play all three numbers of a roll if possible"; once all fifteen are in the
finishing table they may bear off.

Decisions where the page is silent:

- When not all three numbers can be played, as many as possible must be, and where there
  is a choice of which, the higher dice (the rule for two dice, extended).
- Bearing off uses the ordinary rule, including a larger die taking the highest checker
  when nothing is on a higher point. The page says only "by rolling a number that
  corresponds to the point"; the ordinary rule is the one the other variants use, and
  without it a side with its last checkers on low points could be stuck.
- The opening: "each player rolls one die. The player who rolls the higher number goes
  first. That player then rolls all three of his dice" (`opening: "die-each"`).
- A game with the board played the same way round shares hits: a side behind another
  can hit its blots, and the one in front cannot hit back (`inContact` and the computer's
  shot counting handle it).

## Not included

Three well-known traditional games were left out of 1.0, each for a stated reason:

- **Plakoto** (bkgm.com): a lone checker is not hit but *pinned* by the checker that lands
  on it, a pinned checker cannot move, and pinning the "mother" checker loses. Pinning
  needs a state the other variants do not (which of two checkers on a point is pinned), and
  it would have been added to the engine for one game.
- **Fevga**: no hitting at all, a first-checker-past rule and a limit on primes.
- **Acey-deucey** (American): a roll of 1 and 2 plays, then names any double to play, then
  rolls again, with a start off the board. It would be `backgammon-race` plus a bonus roll
  and a choice that the dice flow does not yet have.

None of the names on the two sites needs them. Each is a row of settings and a few rules away, and
the table above is where it would go.

## Sources

Checked 2026-10-01.

- ItsYourTurn.com, Backgammon help: <https://www.itsyourturn.com/t_helptopic2040.html>
  (the whole game, Pro, Race, Anti, Nackgammon, the cube and the Crawford round, game codes
  BX, BP, BA, BN, BR, BS, BO, B9).
- ItsYourTurn.com, tournament FAQ: <https://www.itsyourturn.com/t_helptopic1050.html>
  (Casual Backgammon, Level 2 and Level 3).
- GoldToken.com, Backgammon rules: <https://www.goldtoken.com/games/play?rules=Backgammon>
  (read from the Internet Archive's copy of 2024-10-09,
  <http://web.archive.org/web/20241009050112/https://www.goldtoken.com/games/play?rules=Backgammon>,
  because the live page answered a script with an error): the opening throw, scoring,
  the cube and its freezing, conceding, drawing, the Crawford round. GoldToken has no
  public rules page for its Nackgammon, Long Gammon, Hypergammon or Tabula that could be
  read; those follow bkgm.com.
- bkgm.com: [Nackgammon](https://www.bkgm.com/variants/Nackgammon.html),
  [LongGammon](https://www.bkgm.com/variants/LongGammon.html),
  [Hyper-backgammon](https://www.bkgm.com/variants/HyperBackgammon.html),
  [Tabula](https://www.bkgm.com/variants/Tabula.html),
  [Plakoto](https://www.bkgm.com/variants/Plakoto.html),
  [Fevga](https://www.bkgm.com/variants/Fevga.html),
  [American Acey-Deucey](https://www.bkgm.com/variants/AceyDeucey-American.html),
  [Tavli](https://www.bkgm.com/variants/Tavli.html).
- Wikipedia: [Backgammon](https://en.wikipedia.org/wiki/Backgammon) (the cube, the Crawford
  and Jacoby rules, the beaver) and [Hypergammon](https://en.wikipedia.org/wiki/Hypergammon).
- The GNU Backgammon manual's description of the position ID format, used for `positionId`:
  <https://www.gnu.org/software/gnubg/manual/gnubg.html>. Only the written format was used,
  and nothing of that program's code, data or weights.
- The Keith count, for doubling in a race, as given on bkgm.com
  ([Cube Handling in Noncontact Positions](https://bkgm.com/articles/CubeHandlingInRaces/)):
  each side's pip count plus 2 for each checker beyond the first on the 1-point, 1 for
  each beyond the first on the 2-point, 1 for each beyond three on the 3-point and 1 for
  each empty point among the 4, 5 and 6, and the side on roll adds a seventh (rounded
  down); double if that count exceeds the other's by no more than 4, redouble by no more
  than 3, and take if the doubler's exceeds the taker's by at least 2.
- The name: [Sugoroku, Wikipedia](https://en.wikipedia.org/wiki/Sugoroku) and the Japanese
  Wikipedia's [すごろく](https://ja.wikipedia.org/wiki/%E3%81%99%E3%81%94%E3%82%8D%E3%81%8F).
