import { circuit } from "lib/builder"

/**
 * ```
 *          U1
 *         ┌───┐
 * ├───────┤1 4├───D
 * │    ┌──┤2 3├───C
 * R2   │  └───┘
 * │    B
 * A
 * ```
 */
export default () => {
  const C = circuit()
  const U1 = C.chip().leftpins(2).rightpins(2)
  U1.pin(1).line(-8, 0).line(0, -2).passive().line(0, -2).label()
  U1.pin(2).line(-3, 0).line(0, -2).label()
  U1.pin(3).line(4, 0).label()
  U1.pin(4).line(4, 0).label()

  return C
}
