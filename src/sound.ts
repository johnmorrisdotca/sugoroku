/**
 * THE SOUNDS OF A BOARD, optional: a checker set down, a checker hit, the dice
 * and the cube. The files are in the package's `sounds/` folder (short WAV
 * clips from Kenney's "Casino Audio", Creative Commons Zero: see
 * `sounds/CREDITS.txt`) and are found beside the code with `import.meta.url`,
 * so a bundler that follows that pattern ships them. A page that serves them
 * from somewhere else gives their addresses.
 *
 * @example
 * ```ts
 * import type { SoundName } from "@johnmorrisdotca/sugoroku/play";
 *
 * const value: SoundName = "clack";
 * console.log(value);
 * ```
 */
export type SoundName = "clack" | "hit" | "dice" | "cube";

/** The address of each sound.
 *
 * @example
 * ```ts
 * import type { SoundUrls } from "@johnmorrisdotca/sugoroku/play";
 *
 * const value: SoundUrls = {};
 * console.log(value);
 * ```
 */
export type SoundUrls = Partial<Record<SoundName, string>>;

const FILES: Record<SoundName, string> = { clack: "clack.wav", hit: "hit.wav", dice: "dice.wav", cube: "cube.wav" };

/** The sounds' addresses beside the package's code, or an empty set where `import.meta.url` is not an address (some test runners).
 *
 * @returns The sounds' addresses beside the package's code, or an empty set where `import.meta.url` is not an address (some test runners).
 * @example
 * ```ts
 * import { packagedSounds } from "@johnmorrisdotca/sugoroku/play";
 *
 * console.log(Object.keys(packagedSounds()));
 * ```
 */
export function packagedSounds(): SoundUrls {
  try {
    const urls: SoundUrls = {};
    for (const name of Object.keys(FILES) as SoundName[]) urls[name] = new URL(`../sounds/${FILES[name]}`, import.meta.url).href;
    return urls;
  } catch {
    return {};
  }
}

/** Optional board-sound playback and cleanup methods.
 *
 * @example
 * ```ts no-run
 * import { legalPlaysOf, newGame, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import type { SoundPlayer } from "@johnmorrisdotca/sugoroku/play";
 * import { createSounds } from "@johnmorrisdotca/sugoroku/play";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const play = legalPlaysOf(game)[0];
 * const sounds: SoundPlayer = createSounds({});
 * console.log(typeof sounds.play);
 * sounds.destroy();
 * ```
 */
export type SoundPlayer = {
  play: (name: SoundName) => void;
  /** Stop and let go of everything. */
  destroy: () => void;
};

/** A player for the sounds, which makes its audio only when first asked to play, as browsers insist on a gesture first. Plays nothing where there is no audio.
 *
 * @param urls - Optional URLs of the native board sounds.
 * @returns A player for the sounds, which makes its audio only when first asked to play, as browsers insist on a gesture first. Plays nothing where there is no audio.
 * @example
 * ```ts no-run
 * import { legalPlaysOf, newGame, rollOpening, settingsFor } from "@johnmorrisdotca/sugoroku";
 * import { createSounds } from "@johnmorrisdotca/sugoroku/play";
 *
 * const settings = settingsFor("backgammon",{points:5,cube:true});
 * const game = rollOpening(newGame(settings),[3,1]);
 * const play = legalPlaysOf(game)[0];
 * const sounds = createSounds({});
 * console.log(typeof sounds.play);
 * sounds.destroy();
 * ```
 */
export function createSounds(urls: SoundUrls): SoundPlayer {
  const cache = new Map<SoundName, HTMLAudioElement>();
  let gone = false;
  return {
    play(name) {
      if (gone || typeof Audio === "undefined") return;
      const url = urls[name];
      if (url === undefined) return;
      let audio = cache.get(name);
      if (audio === undefined) {
        audio = new Audio(url);
        audio.preload = "auto";
        audio.volume = 0.7;
        cache.set(name, audio);
      }
      try {
        audio.currentTime = 0;
        void audio.play()?.catch(() => undefined);
      } catch {
        /* A browser that will not play it yet: no sound, no error. */
      }
    },
    destroy() {
      gone = true;
      for (const audio of cache.values()) audio.pause();
      cache.clear();
    },
  };
}
