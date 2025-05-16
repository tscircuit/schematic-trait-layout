import { chip } from "lib/builder"

/**
 * ```
 *         ┌───┐
 * ┌───────┤1 3├───L
 * │    ┌──┤2 4├───L
 * P    │  └───┘
 * │    L
 * L
 * ```
 */
export default () => {
  const C = chip().leftpins(2).rightpins(2)
  C.pin(1).line(-8, 0).line(0, -2).passive().line(0, -2).label()
  C.pin(2).line(-3, 0).line(0, -2).label()
  C.pin(3).line(4, 0).label()
  C.pin(4).line(4, 0).label()

  return C
}
