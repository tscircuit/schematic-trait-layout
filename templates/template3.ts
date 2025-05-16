import circuit from "lib/builder"

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
  const C = circuit()
  const U1 = C.chip().rightpins(3)

  U1.pin(1).line(7, 0).mark("m1").line(0, 1).label()
  U1.fromMark("m1").line(0, -3).passive().line(0, -3).label()
  U1.pin(2)
    .line(2, 0)
    .line(0, -2)
    .line(2, 0)
    .line(0, 1)
    .passive()
    .line(0, 2)
    .intersect()
  U1.pin(3).line(1, 0).line(0, -3).label()

  return C
}
