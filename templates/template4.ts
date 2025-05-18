import { circuit } from "lib/builder"

/**
 * ```
 *         L
 * ┌───┐   │
 * │  3├───┤
 * │  2├─L │
 * │  1├┐  P
 * └───┘│  │
 *      L  L
 * ```
 */
export default () => {
  const C = circuit()
  const U1 = C.chip().rightpins(3)

  U1.pin(3).line(4, 0).mark("m1").line(0, 2).label()
  U1.fromMark("m1").line(0, -2).passive().line(0, -2).label()

  U1.pin(2).line(2, 0).label()
  U1.pin(1).line(1, 0).line(0, -2).label()

  return C
}
