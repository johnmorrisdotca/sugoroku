/**
 * Sugoroku, played in a page: `mountSugoroku` draws a game into any element and
 * plays it by touch and mouse, with the doubling cube, Undo, the computer for
 * either side or both, optional sounds, and the words in English and Japanese. A
 * separate entry (`@johnmorrisdotca/sugoroku/play`), so a server never loads any of it.
 */
export { ensureSugorokuPlayStyle, mountSugoroku } from "./mount.ts";
export type { SugorokuEventDetail, SugorokuLook, SugorokuMount, SugorokuMountOptions } from "./mount.ts";
export { SUGOROKU_PLAY_STYLE } from "./playStyle.ts";
export { SUGOROKU_STRINGS, sugorokuLanguageOf, sugorokuSay } from "./strings.ts";
export type { SugorokuLanguage } from "./strings.ts";
export { createSounds, packagedSounds } from "./sound.ts";
export type { SoundName, SoundPlayer, SoundUrls } from "./sound.ts";
