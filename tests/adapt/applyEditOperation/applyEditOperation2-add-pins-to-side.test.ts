import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("add pins to side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1).rightpins(1)
  applyEditOperation(C, {
    type: "add_pins_to_side",
    chipId: U.chipId,
    side: "left",
    oldPinCount: 1,
    newPinCount: 3,
  })
  expect(U.leftPinCount).toBe(3)
  expect(U.totalPinCount).toBe(4)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1  │
    ┤2  │
    ┤3 4├
    └───┘
    "
  `)
})
