import { chip } from "lib/builder"

/**
 * ```
 *        L
 * ┌───┐  │
 * │  1├──┤
 * │  2│  │
 * │  3│  P
 * └───┘  │
 *        L
 * ```
 */
export default () => {
  const C = chip().rightpins(3)

  C.pin(1).line(3, 0).mark("m1").line(0, 2).label()
  C.fromMark("m1").line(0, -4).passive().line(0, -2).label()

  return C
}
