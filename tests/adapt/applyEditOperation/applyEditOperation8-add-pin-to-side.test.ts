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
    // Add a new pin between original pin 1 and pin 2 on the left side.
    // In the context of ChipBuilder's leftpins, this means inserting
    // at index 1 (0-indexed) of the leftPins array.
    // The ccwPinNumbers of the existing pins will be adjusted.
    // Original pin 1 (ccw 1) remains pin 1.
    // New pin becomes pin 2.
    // Original pin 2 (ccw 2) becomes pin 3.
    // Original pin 3 (ccw 3, on right) becomes pin 4.
    betweenPinNumbers: [1, 2],
  })

  // expect(U.leftPinCount).toBe(3)
  // expect(U.totalPinCount).toBe(4) // 3 left + 1 right

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
