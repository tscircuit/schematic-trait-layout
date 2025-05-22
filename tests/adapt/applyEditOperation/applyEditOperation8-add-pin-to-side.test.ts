import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("add pin to side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(2).rightpins(1) // Pins 1, 2 on left, Pin 3 on right
  U.pin(1).line(-1, 0).label()
  U.pin(2).line(-2, 0).line(0, -1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
     L┤1  │
    ┌─┤2 3├
    L └───┘
    "
  `)

  applyEditOperation(C, {
    type: "add_pin_to_side",
    chipId: U.chipId,
    side: "left",
    betweenPinNumbers: [1, 2],
  })

  expect(U.leftPinCount).toBe(3)
  expect(U.totalPinCount).toBe(4)

  // Expect pin 1, then new pin, then pin 2 (now pin 3)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
     L┤1  │
      ┤2  │
    ┌─┤3 4├
    L └───┘
    "
  `)
})
