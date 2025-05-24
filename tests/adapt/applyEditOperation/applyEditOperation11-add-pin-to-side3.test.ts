import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("add pin to side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1).rightpins(2)
  U.pin(2).line(2, 0).label()
  U.pin(3).line(2, 0).line(0, 1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐ B
    │  3├─┘
    ┤1 2├─A
    └───┘
    "
  `)

  applyEditOperation(C, {
    type: "add_pin_to_side",
    chipId: U.chipId,
    side: "right",
    betweenPinNumbers: [3, 4],
  })

  // Expect pin 1, then new pin, then pin 2 (now pin 3)
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  4├ B
    │  3├─┘
    ┤1 2├─A
    └───┘
    "
  `)

  expect(U.leftPinCount).toBe(1)
  expect(U.totalPinCount).toBe(4)
})
