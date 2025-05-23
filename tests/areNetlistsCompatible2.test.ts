import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible2: identical netlists using chip builder", () => {
  const defineChip = () => {
    const C = circuit()
    const U1 = C.chip().rightpins(1)
    U1.pin(1).label("A")
    return C
  }

  const inputChip = defineChip()
  const templateChip = defineChip()

  expect(`\nInput:\n${inputChip.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  1A
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateChip.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
    │  1A
    └───┘
    "
  `)

  expect(
    areNetlistsCompatible(inputChip.getNetlist(), templateChip.getNetlist()),
  ).toBe(true)
})

test("areNetlistsCompatible2: template has more pins on a box", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(1)
  inputChip.pin(1).label("A")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2) // More pins on the template
  templateChip.pin(1).label("A")
  // Pin 2 on template is unused by input

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  1A
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
    │  2├
    │  1A
    └───┘
    "
  `)

  expect(
    areNetlistsCompatible(
      inputCircuit.getNetlist(),
      templateCircuit.getNetlist(),
    ),
  ).toBe(true)
})

test("areNetlistsCompatible2: input requires more pins than template", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(2)
  inputChip.pin(1).label("A")
  inputChip.pin(2).label("B")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(1) // Fewer pins on the template
  templateChip.pin(1).label("A")

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  2B
    │  1A
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
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

test("areNetlistsCompatible2: different number of boxes (components)", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(1)
  inputChip.pin(1).line(1, 0).passive().label("A") // Input has 1 chip, 1 passive

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(1)
  templateChip.pin(1).label("A") // Template has 1 chip, 0 passives

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  1├RA
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
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

test("areNetlistsCompatible2: input connection satisfied by a larger template connection", () => {
  // Input: chip.R1 connects to chip.R2
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(2)
  inputChip.pin(2).line(1, 0).mark("p1_end_input")
  inputChip.pin(1).line(1, 0).line(0, 1).intersect()

  // Template: chip.R1, chip.R2, and an external Net "N_Extra" are all part of the same connection
  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(2).line(1, 0).mark("p1_end_template")
  templateChip.pin(1).line(1, 0).line(0, 1).intersect().line(2, 0).label("A")

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
     U1
    ┌───┐
    │  2├●
    │  1├┘
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
     U1
    ┌───┐
    │  2├●─A
    │  1├┘
    └───┘
    "
  `)

  expect(inputCircuit.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │       U1       │2  ── U1.1      
                      │                │1  ── U1.2      
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)

  expect(templateCircuit.getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │       U1       │2  ── ...       
                      │                │1  ── ...       
                      └────────────────┘

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: U1, Pin 1
        - Net: A
        - Box Pin: U1, Pin 2"
  `)

  expect(inputCircuit.getNetlist()).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "leftPinCount": 0,
          "rightPinCount": 2,
          "topPinCount": 0,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 1,
            },
            {
              "boxId": "U1",
              "pinNumber": 2,
            },
          ],
        },
      ],
      "nets": [],
    }
  `)

  expect(
    areNetlistsCompatible(
      inputCircuit.getNetlist(),
      templateCircuit.getNetlist(),
    ),
  ).toBe(true)
})
