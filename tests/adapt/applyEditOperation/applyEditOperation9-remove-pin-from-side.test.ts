import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("remove pin from side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(3).rightpins(1) // Pins 1, 2 on left, Pin 3 on right
  U.pin(1).line(-1, 0).label()
  U.pin(2).line(-2, 0).label()
  U.pin(3).line(-2, 0).line(0, -1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
     A┤1  │
    B─┤2  │
    ┌─┤3 4├
    C └───┘
    "
  `)

  applyEditOperation(C, {
    type: "remove_pin_from_side",
    chipId: U.chipId,
    side: "left",
    pinNumber: 2,
  })

  // expect(U.leftPinCount).toBe(3)
  // expect(U.totalPinCount).toBe(4) // 3 left + 1 right

  // Expect pin 1, then new pin, then pin 2 (now pin 3)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
     A┤1  │
    B─┤2  │
    ┌─┤3 4├
    C └───┘
    "
  `)
})
