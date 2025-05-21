import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"

test("computeEditOperationsToFixPinSubsetNetlist1", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(2).rightpins(2)
  U.pin(1).line(-1, 0).label()
  U.pin(2).line(-2, 0).line(0, -1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot()
})
