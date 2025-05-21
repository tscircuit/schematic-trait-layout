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
    ┤4  │
    ┤3 4├
    └───┘
    "
  `)
})

test("remove pins from side", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(3).rightpins(1)
  applyEditOperation(C, {
    type: "remove_pins_from_side",
    chipId: U.chipId,
    side: "left",
    oldPinCount: 3,
    newPinCount: 1,
  })
  expect(U.leftPinCount).toBe(1)
  expect(U.totalPinCount).toBe(2)
})

test("add passive to pin", () => {
  const C = new CircuitBuilder()
  const U = C.chip().leftpins(1)
  U.pin(1).line(-1, 0)
  applyEditOperation(C, {
    type: "add_passive_to_pin",
    chipId: U.chipId,
    pinNumber: 1,
  })
  expect(C.chips.length).toBe(2) // original + passive
})

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

test("remove chip", () => {
  const C = new CircuitBuilder()
  const U1 = C.chip().leftpins(1)
  const U2 = C.chip().leftpins(1)
  U1.pin(1).line(-1, 0)
  applyEditOperation(C, { type: "remove_chip", chipId: U1.chipId })
  expect(C.chips.find((c) => c.chipId === U1.chipId)).toBeUndefined()
  // All artefacts that referenced U1 are gone
  for (const l of C.lines) {
    expect(l.start.ref.boxId).not.toBe(U1.chipId)
    expect(l.end.ref.boxId).not.toBe(U1.chipId)
  }
})
