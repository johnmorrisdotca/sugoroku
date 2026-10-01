/**
 * THE SOUNDS OF A BOARD, optional: a checker set down, a checker hit, the dice
 * and the cube. The files are in the package's `sounds/` folder (short WAV
 * clips from Kenney's "Casino Audio", Creative Commons Zero: see
 * `sounds/CREDITS.txt`) and are found beside the code with `import.meta.url`,
 * so a bundler that follows that pattern ships them. A page that serves them
 * from somewhere else gives their addresses.
 */
export type SoundName = "clack" | "hit" | "dice" | "cube";

/** The address of each sound. */
export type SoundUrls = Partial<Record<SoundName, string>>;

const FILES: Record<SoundName, string> = { clack: "clack.wav", hit: "hit.wav", dice: "dice.wav", cube: "cube.wav" };

/** The sounds' addresses beside the package's code, or an empty set where `import.meta.url` is not an address (some test runners). */
export function packagedSounds(): SoundUrls {
  try {
    const urls: SoundUrls = {};
    for (const name of Object.keys(FILES) as SoundName[]) urls[name] = new URL(`../sounds/${FILES[name]}`, import.meta.url).href;
    return urls;
  } catch {
    return {};
  }
}

export type SoundPlayer = {
  play: (name: SoundName) => void;
  /** Stop and let go of everything. */
  destroy: () => void;
};

/** A player for the sounds, which makes its audio only when first asked to play, as browsers insist on a gesture first. Plays nothing where there is no audio. */
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
