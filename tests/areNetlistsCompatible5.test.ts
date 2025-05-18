import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible2: input connection not satisfiable by template's connections", () => {
  // Input connects chip.R1 to chip.R2
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(2)
  inputChip.pin(2).line(1, 0).mark("p1_end")
  inputChip.pin(1).line(1, 0).line(0, 1).intersect()

  // Template connects chip.R1 to a Net, and chip.R2 to a different Net (or same net but separate connections)
  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(2).label("A")
  templateChip.pin(1).label("A") // or .label("NetA") but still not a direct R1-R2 connection

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  2├●
    │  1├┘
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  2A
    │  1A
    └───┘
    "
  `)

  expect(
    areNetlistsCompatible(
      inputCircuit.getNetlist(),
      templateCircuit.getNetlist(),
    ),
  ).toBe(false)
})
