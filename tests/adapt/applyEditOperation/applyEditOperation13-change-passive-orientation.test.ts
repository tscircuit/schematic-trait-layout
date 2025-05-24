import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

test("change passive orientation from vertical to horizontal", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1)

  // Create a vertical passive (entry from bottom, exit to top)
  U.pin(1).line(-2, 0).line(0, -2).passive().line(0, -2)

  expect(C.chips.length).toBe(2) // U + passive

  // Find the passive component
  const passive = C.chips.find((chip) => chip.isPassive)
  expect(passive).toBeDefined()
  expect(passive!.chipId).toMatch(/^R\d+$/)

  // Verify it's vertical (has bottom/top pins)
  expect(passive!.bottomPinCount).toBe(1)
  expect(passive!.topPinCount).toBe(1)
  expect(passive!.leftPinCount).toBe(0)
  expect(passive!.rightPinCount).toBe(0)

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    ├─┤1  │
    │ └───┘
    R2
    │
    │
    "
  `)

  // Apply the orientation change
  applyEditOperation(C, {
    type: "change_passive_orientation",
    chipId: passive!.chipId,
    fromOrientation: "vertical",
    toOrientation: "horizontal",
  })

  // Verify the passive is now horizontal (has left/right pins)
  expect(passive!.leftPinCount).toBe(1)
  expect(passive!.rightPinCount).toBe(1)
  expect(passive!.bottomPinCount).toBe(0)
  expect(passive!.topPinCount).toBe(0)

  // Note: The visual representation may not change immediately as pin positions
  // and connections would need to be recalculated
  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    ├─┤1  │
    │ └───┘
    R2
    │
    │
    "
  `)
})

test("change passive orientation from horizontal to vertical", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1)

  // Create a horizontal passive (entry from left, exit to right)
  U.pin(1).line(-2, 0).passive().line(-2, 0)

  expect(C.chips.length).toBe(2) // U + passive

  // Find the passive component
  const passive = C.chips.find((chip) => chip.isPassive)
  expect(passive).toBeDefined()

  // Verify it's horizontal (has left/right pins)
  expect(passive!.leftPinCount).toBe(1)
  expect(passive!.rightPinCount).toBe(1)
  expect(passive!.bottomPinCount).toBe(0)
  expect(passive!.topPinCount).toBe(0)

  // Apply the orientation change
  applyEditOperation(C, {
    type: "change_passive_orientation",
    chipId: passive!.chipId,
    fromOrientation: "horizontal",
    toOrientation: "vertical",
  })

  // Verify the passive is now vertical (has bottom/top pins)
  expect(passive!.bottomPinCount).toBe(1)
  expect(passive!.topPinCount).toBe(1)
  expect(passive!.leftPinCount).toBe(0)
  expect(passive!.rightPinCount).toBe(0)
})
