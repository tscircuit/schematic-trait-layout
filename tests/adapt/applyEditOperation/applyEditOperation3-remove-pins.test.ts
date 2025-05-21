import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"
test("remove pins from side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(3).rightpins(1)

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1  │
    ┤2  │
    ┤3 4├
    └───┘
    "
  `)

  applyEditOperation(C, {
    type: "remove_pins_from_side",
    chipId: U.chipId,
    side: "left",
    oldPinCount: 3,
    newPinCount: 1,
  })
  expect(U.leftPinCount).toBe(1)
  expect(U.totalPinCount).toBe(2)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 2├
    └───┘
    "
  `)
})
