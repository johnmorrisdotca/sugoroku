# Contributing

Ideas, bug reports and pull requests are welcome in the
[issues](https://github.com/johnmorrisdotca/sugoroku/issues).

## Working on it

```sh
pnpm install
pnpm check          # lint, types and tests
pnpm test:package   # pack it as npm does, install it in an empty project, import every entry
pnpm test:demo      # build the demo and play it in real browsers (needs `pnpm exec playwright install chromium webkit` once)
pnpm docs:make      # rewrite docs/strings-ja.md after changing a word of the board
```

A change to the rules is tested beside it, and must leave the engine agreeing with trying
everything (`src/brute.fixture.ts`) on positions of every variant, and every variant's games
ending (`src/simulate.test.ts`). A variant is a row in `src/variants.ts`; add its source to
`docs/VARIANTS.md` in the same change, and a test that exercises what is different about it.
A change to the dice, or to how a record asks for them, changes what a seed makes, and
games kept by their seed would replay differently: say so in the changelog.

The computer has to stay quick (a move well under a tenth of a second, in
`src/computer.test.ts`) and has to be written for this package: no code, weights or tables
from any other program, and nothing under a GPL or LGPL licence. Art and sound only if
Creative Commons Zero or public domain, verified at the source and credited in
`sounds/CREDITS.txt`.

## House rules, shared by every package of the family

- Open an issue first for anything bigger than a typo, so that we can agree on the shape before you spend time on it.
- No runtime dependencies. Every function that plays or checks a game is pure: it returns new values and never changes what it was given.
- Tests sit beside the code they test. A rule you change has a test that would have caught it.
- Words a player reads come in English and Japanese. If you cannot write the Japanese, say so in the pull request and someone will.
- Option values and names are kebab case.
- Art and sound are CC0 or public domain only, checked at the source, and credited in the README. No GPL or LGPL code.
- Needs Node 22 or later. A change a user would notice gets a line in `CHANGELOG.md`.

## Releasing

A version tag (`v1.2.3`, the same as `package.json`'s version) runs
`.github/workflows/release.yml`: it checks and builds the package, attaches the
tarball to a GitHub release, and publishes it to npm by trusted publishing,
with no token. Write the release in `CHANGELOG.md` first.
