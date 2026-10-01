/**
 * Sugoroku's drawing: SVG text for a board with its checkers, dice and cube, the
 * style that makes it a board, and the colours it is made of. A separate entry
 * (`@johnmorrisdotca/sugoroku/draw`), so a server that only checks a game never
 * loads any of it.
 */
export { colourProperty, SUGOROKU_BOARD_NAMES, SUGOROKU_BOARDS, SUGOROKU_CHECKER_SET_NAMES, SUGOROKU_CHECKER_SETS, SUGOROKU_COLOUR_NAMES } from "./colours.ts";
export type { SugorokuBoardName, SugorokuCheckerSetName, SugorokuColours } from "./colours.ts";
export { colourStyle, drawSugoroku, MOST_DRAWN } from "./draw.ts";
export type { SugorokuDrawOptions } from "./draw.ts";
export { boardSize, BoardLayout } from "./geometry.ts";
export type { BoardOptions, Box, Orientation } from "./geometry.ts";
export { SUGOROKU_STYLE } from "./style.ts";
