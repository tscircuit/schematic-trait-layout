import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible2: template has extra connections/components not used by input", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(1)
  inputChip.pin(1).line(2, 0).label("A")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(1).line(2, 0).label("A") // Matches input
  templateChip.pin(2).line(2, 0).label("E") // Extra net

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  1├─A
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
    │  2├─E
    │  1├─A
    └───┘
    "
  `)

  expect(inputCircuit.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │       U1       │1  ── A         
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)
  expect(templateCircuit.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │       U1       │2  ── E         
                      │                │1  ── A         
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)

  expect(
    areNetlistsCompatible(
      inputCircuit.getNetlist(),
      templateCircuit.getNetlist(),
    ),
  ).toBe(true)
})
