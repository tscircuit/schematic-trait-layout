import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { applyEditOperation } from "lib/adapt/applyEditOperation"

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
