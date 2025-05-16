import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { areNetlistsCompatible } from "lib/scoring/areNetlistsCompatible"

test("areNetlistsCompatible2: identical netlists using chip builder", () => {
  const defineChip = () => {
    const C = circuit()
    const U1 = C.chip().rightpins(1)
    U1.pin(1).label("L1")
    return C
  }

  const inputChip = defineChip()
  const templateChip = defineChip()

  expect(`\nInput:\n${inputChip.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1L1
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateChip.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1L1
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
  inputChip.pin(1).label("L1")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2) // More pins on the template
  templateChip.pin(1).label("L1")
  // Pin 2 on template is unused by input

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1L1
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1L1
    │  2│
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
  inputChip.pin(1).label("L1")
  inputChip.pin(2).label("L2")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(1) // Fewer pins on the template
  templateChip.pin(1).label("L1")

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1L1
    │  2L2
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1L1
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
  inputChip.pin(1).line(1, 0).passive().label("L1") // Input has 1 chip, 1 passive

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(1)
  templateChip.pin(1).label("L1") // Template has 1 chip, 0 passives

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1├L1
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1L1
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

test("areNetlistsCompatible2: template has extra connections/components not used by input", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(1)
  inputChip.pin(1).line(2, 0).label("N1")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(1).line(2, 0).label("N1") // Matches input
  templateChip.pin(2).line(2, 0).label("ExtraN") // Extra net

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1├─N1
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1├─N1
    │  2├─ExtraN
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

test("areNetlistsCompatible2: input connection not satisfiable by template's connections", () => {
  // Input connects chip.R1 to chip.R2
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(2)
  inputChip.pin(1).line(1, 0).mark("p1_end")
  inputChip.pin(2).line(1, 0).line(0, 1).intersect()

  // Template connects chip.R1 to a Net, and chip.R2 to a different Net (or same net but separate connections)
  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(1).label("NetA")
  templateChip.pin(2).label("NetB") // or .label("NetA") but still not a direct R1-R2 connection

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1├●
    │  2├┘
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1NetA
    │  2NetB
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
  inputChip.pin(1).line(1, 0).mark("p1_end_input")
  inputChip.pin(2).line(1, 0).line(0, 1).intersect()

  // Template: chip.R1, chip.R2, and an external Net "N_Extra" are all part of the same connection
  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().rightpins(2)
  templateChip.pin(1).line(1, 0).mark("p1_end_template")
  templateChip.pin(2).line(1, 0).line(0, 1).intersect().label("N_Extra")

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1├●
    │  2├┘
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
    ┌───┐
    │  1├N_Extra
    │  2├┘
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

test("areNetlistsCompatible2: complex compatible case with passives", () => {
  const inputCircuit = circuit()
  const inputChip = inputCircuit.chip().rightpins(2)
  inputChip.pin(1).line(2, 0).passive().mark("p1_passive_out")
  inputChip.pin(2).line(2, 0).intersect().label("A")

  const templateCircuit = circuit()
  const templateChip = templateCircuit.chip().leftpins(1).rightpins(2) // template main chip has more pins
  templateChip.pin(1).line(-2, 0).intersect().label("B") // chip0.R2 to passive0.P2 and N1
  templateChip.pin(2).line(2, 0).passive().mark("tp1_passive_out") // chip0.R1 to passive0.P1, passive0.P2 is tp1_passive_out
  templateChip.pin(3).line(2, 0).label("C") // chip0.L1 to ExtraNet (pin 3 is left pin 1)

  expect(`\nInput:\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Input:
    ┌───┐
    │  1├─P
    │  2├─A
    └───┘
    "
  `)
  expect(`\nTemplate:\n${templateCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
    Template:
      ┌───┐
    B─┤1 2├─P
      │  3├─C
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
