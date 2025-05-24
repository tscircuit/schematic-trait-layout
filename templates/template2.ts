import { circuit } from "lib/builder"

/**
 * ```
 *  U1   A
 * ┌───┐ │
 * │  7├─┘┌─R2─B
 * │  6├──┘
 * │  5├────R3─C
 * │  4├─────┤
 * │  3├──┤  │
 * │  2├┐ │  │
 * │  1├● │  │
 * └───┘│ R5 R4
 *      │ │  │
 *      F E  D
 * ```
 */
export default () => {
  const C = circuit()
  const U1 = C.chip().rightpins(7)

  U1.pin(7).line(2, 0).line(0, 2).label()
  U1.pin(6).line(3, 0).line(0, 1).line(2, 0).passive().line(2, 0).label()
  U1.pin(5).line(5, 0).passive().line(2, 0).label()
  U1.pin(4).line(6, 0).line(0, -4).passive().line(0, -2).label()
  U1.pin(3).line(3, 0).line(0, -3).passive().line(0, -2).label()
  U1.pin(2).line(1, 0).line(0, -4).label() // Default label "L"

  // Pin 7 connects to the horizontal segment of Pin 6's trace
  U1.pin(1).line(1, 0).intersect()

  return C
}
