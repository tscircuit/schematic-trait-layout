import { chip } from "lib/builder"

/**
 * ```
 *       L
 * ┌───┐ │
 * │  1├─┘┌─P─L
 * │  2├──┘
 * │  3├────P─L
 * │  4├─────┐
 * │  5├──┐  │
 * │  6├┐ │  │
 * │  7├● │  │
 * └───┘│ P  P
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
  C.pin(4).line(6, 0).line(0, -4).passive().line(0, -2).label()
  C.pin(5).line(3, 0).line(0, -3).passive().line(0, -2).label()
  C.pin(6).line(1, 0).line(0, -4).label() // Default label "L"

  // Pin 7 connects to the horizontal segment of Pin 6's trace
  C.pin(7).line(1, 0).intersect()

  return C
}
