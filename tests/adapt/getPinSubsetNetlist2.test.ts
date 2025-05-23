import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { getPinSubsetNetlist } from "lib/adapt/getPinSubsetNetlist"
import { getPinShapeSignature } from "lib/adapt/getPinShapeSignature"

test("getPinSubsetNetlist should reflect connections made via .intersect()", () => {
  const C = circuit()
  const U1 = C.chip().rightpins(2).at(0, 0)

  U1.pin(1).line(5, 0).label()
  U1.pin(2).line(1, 0).passive().line(1, 0).line(0, -1).intersect()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  2├R2┐
    │  1├──●─A
    └───┘
    "
  `)

  const netlist = C.getNetlist()

  expect(
    getPinShapeSignature({
      netlist,
      chipId: "U1",
      pinNumber: 1,
    }),
  ).toMatchInlineSnapshot(`"L1B0R1T0,L0B0R1T0|C[b0.2,b1.1,n0]"`)
  expect(
    getPinShapeSignature({
      netlist,
      chipId: "U1",
      pinNumber: 2,
    }),
  ).toMatchInlineSnapshot(`"L1B0R1T0,L0B0R1T0|C[b0.1,b1.1]"`)
})
