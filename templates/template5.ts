import { circuit } from "lib/builder"

/**
 * ```
 * ┌───┐     ┌───┐
 * │1 3├─────┤1 2│
 * │2 4│     └───┘
 * └───┘
 * ```
 */
export default () => {
  const C = circuit()
  const U1 = C.chip().leftpins(2).rightpins(2).at(0, 0)
  const U2 = C.chip().leftpins(1).rightpins(1).at(10, 1)

  U1.pin(3).line(3, 0).mark("bus")
  U2.pin(1).line(-3, 0).connect()

  return C
}
