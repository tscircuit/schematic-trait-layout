import { chip } from "lib/builder"

/**
 * ```
 * ┌───┐      L
 * │  1├───●──┤
 * │  2├─┐ │  │
 * │  3├┐│ P  P
 * └───┘│└─┘  │
 *      │     │
 *      L     L
 * ```
 */
export default () => {
  const C = chip().rightpins(3)

  C.pin(1).line(7, 0).mark("m1").line(0, 1).label()
  C.fromMark("m1").line(0, -3).passive().line(0, -3).label()
  C.pin(2)
    .line(2, 0)
    .line(0, -2)
    .line(2, 0)
    .line(0, 1)
    .passive()
    .line(0, 2)
    .intersect()
  C.pin(3).line(1, 0).line(0, -3).label()

  return C
}
