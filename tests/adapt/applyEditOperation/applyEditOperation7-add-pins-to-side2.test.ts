import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("add pins to side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(2).rightpins(2)

  U.pin(1).line(-1, 0).label()
  U.pin(2).line(-2, 0).line(0, -1).label()
  U.pin(4).line(1, 0).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
     L┤1 4├L
    ┌─┤2 3├
    L └───┘
    "
  `)

  applyEditOperation(C, {
    type: "add_pins_to_side",
    chipId: U.chipId,
    side: "left",
    oldPinCount: 2,
    newPinCount: 3,
  })
  expect(U.leftPinCount).toBe(3)
  expect(U.totalPinCount).toBe(5)

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
      ┤1  │
     L┤2 5├L
    ┌─┤3 4├
    L └───┘
    "
  `)
})
