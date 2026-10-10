import { expect, it } from "vitest";
import { readEmbedPosition } from "./element.ts";
import { startPosition } from "./board.ts";
import { VARIANTS, VARIANT_KEYS } from "./variants.ts";
it("validates complete native positions, including race reserves",()=>{for(const variant of VARIANT_KEYS){const start=startPosition(VARIANTS[variant]);expect(readEmbedPosition(JSON.stringify(start),variant)).toEqual(start);}expect(readEmbedPosition("4HPwATDgc/ABMA")).toEqual(startPosition(VARIANTS.backgammon));});
it("rejects malformed counts, pairs, totals, IDs and oversized inputs",()=>{const start=startPosition(VARIANTS.backgammon);for(const value of["null","{}","{bad}","//////////////",JSON.stringify({...start,bar:[-1,0]}),JSON.stringify({...start,off:[1,0]}),JSON.stringify({...start,reserve:[0]})," ".repeat(10001)])expect(readEmbedPosition(value)).toBeNull();});
