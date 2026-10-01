/**
 * Defines the `<sugoroku-board>` element on the page. Import it for its effect:
 *
 * ```html
 * <script type="module" src="https://cdn.jsdelivr.net/npm/@johnmorrisdotca/sugoroku@1/dist/element-define.js"></script>
 * <sugoroku-board variant="nackgammon" black="strong"></sugoroku-board>
 * ```
 *
 * A tag already defined is left as it is, and on a server, where there is no page, nothing happens.
 */
import { SugorokuBoard } from "./element.ts";

if (typeof customElements !== "undefined" && customElements.get("sugoroku-board") === undefined) customElements.define("sugoroku-board", SugorokuBoard);
