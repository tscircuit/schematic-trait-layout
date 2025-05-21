import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"
test("clear pin", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1)
  U.pin(1).line(-1, 0).label()
  expect(C.lines.length).toBe(1)
  expect(C.netLabels.length).toBe(1)
  applyEditOperation(C, {
    type: "clear_pin",
    chipId: U.chipId,
    pinNumber: 1,
  })
  expect(C.lines.length).toBe(0)
  expect(C.netLabels.length).toBe(0)
})
