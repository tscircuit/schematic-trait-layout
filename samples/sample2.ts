import { chip } from "lib/builder"

/**
 * ```
 *       L
 * ┌───┐ │
 * │   ├─┘┌─B─L
 * │   ├──┘
 * │   ├────B─L
 * │   ├─────┐
 * │   ├──┐  │
 * │   ├┐ │  │
 * │   ├┤ │  │
 * └───┘│ B  B
 *      │ │  │
 *      L L  L
 * ```
 */
export default () => {
  const C = chip().rightpins(7)

  C.pin(1).line(2, 0).line(0, 2).label()
  C.pin(2)
    .line(3, 0)
    .line(0, 1)
    .line(2, 0)
    .passive("horizontal")
    .line(2, 0)
    .label()
  C.pin(3).line(5, 0).passive("horizontal").line(2, 0).label()
  C.pin(4).line(6, 0).line(0, -4).passive("vertical").line(0, -2).label()
  C.pin(5).line(3, 0).line(0, -3).passive("vertical").line(0, -2).label()
  C.pin(6).line(1, 0).line(0, -4).label()

  // TODO
  // C.pin(7).line(1, 0).line(0, -3).label()
  // change to....
  C.pin(7).line(1, 0).intersect()

  return C
}
