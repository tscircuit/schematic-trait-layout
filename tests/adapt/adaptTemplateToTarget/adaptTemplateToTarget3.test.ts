import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"

test("adaptTemplateToTarget3 removes extra chip when target has fewer chips", () => {
  /* target circuit (single chip) ------------------------------------- */
  const target = new CircuitBuilder()
  const tU1 = target.chip().leftpins(2).rightpins(2)
  tU1.pin(1).line(-4, 0).passive().label("R1")
  tU1.pin(2).line(-2, 0).label("INPUT")
  tU1.pin(3).line(3, 0).label("OUTPUT")
  tU1.pin(4).line(3, 0).label("VCC")

  /* template circuit (two chips connected) --------------------------- */
  const template = new CircuitBuilder()
  const eU1 = template.chip().leftpins(2).rightpins(2).at(0, 0)
  const eU2 = template.chip().leftpins(1).rightpins(1).at(10, 1)
  // Connect U1 pin 4 to U2 pin 1
  eU1.pin(4).line(3, 0).mark("bus")
  eU2.pin(1).line(-3, 0).connect()

  expect(`\n${target.toString()}\n`).toMatchInlineSnapshot(`
    "
         U1
        ┌───┐
    R2──┤1 4├──V
      I─┤2 3├──O
        └───┘
    "
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1        U2
    ┌───┐     ┌───┐
    ┤1 4├─────┤1 2├
    ┤2 3├     └───┘
    └───┘
    "
  `)

  /* run adaptation --------------------------------------------------- */
  const { appliedOperations } = adaptTemplateToTarget({
    template,
    target: target.getNetlist(),
  })

  expect(appliedOperations).toMatchInlineSnapshot(`
    [
      {
        "chipId": "U1",
        "pinNumber": 2,
        "type": "add_label_to_pin",
      },
      {
        "chipId": "U1",
        "pinNumber": 3,
        "type": "add_label_to_pin",
      },
      {
        "chipId": "U1",
        "pinNumber": 4,
        "type": "add_label_to_pin",
      },
      {
        "chipId": "U2",
        "type": "remove_chip",
      },
    ]
  `)

  /* verify adaptation result ----------------------------------------- */
  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
      U1
     ┌───┐
     ┤1 4├───C
    A┤2 3├B
     └───┘
    "
  `)

  // SUCCESS: Template now has 1 chip as expected
  expect(template.chips.length).toBe(1) // U2 was successfully removed
  expect(appliedOperations.some(op => op.type === "remove_chip")).toBe(true) // remove_chip operation was applied
})