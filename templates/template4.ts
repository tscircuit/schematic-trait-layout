import circuit from "lib/builder"

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
  const C = circuit()
  const U1 = C.chip().rightpins(3)

  U1.pin(1).line(3, 0).mark("m1").line(0, 2).label()
  U1.fromMark("m1").line(0, -4).passive().line(0, -2).label()

  return C
}
