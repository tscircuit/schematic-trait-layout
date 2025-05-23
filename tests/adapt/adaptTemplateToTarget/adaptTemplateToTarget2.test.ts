import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"

test("adaptTemplateToTarget2 adds missing labels and removes extra labels", () => {
  /* target circuit --------------------------------------------------- */
  const target = new CircuitBuilder()
  const gU1 = target.chip().leftpins(2).rightpins(2)
  gU1.pin(1).line(-2, 0).label()

  /* template circuit (one pin short) --------------------------------- */
  const template = new CircuitBuilder()
  const eU1 = template.chip().leftpins(2).rightpins(2)
  eU1.pin(4).line(2, 0).label()

  expect(`\n${target.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    A─┤1 4├
      ┤2 3├
      └───┘
    "
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    ┤1 4├─A
    ┤2 3├
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
        "pinNumber": 1,
        "type": "add_label_to_pin",
      },
      {
        "chipId": "U1",
        "pinNumber": 4,
        "type": "clear_pin",
      },
    ]
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
      U1
     ┌───┐
    B┤1 4├
     ┤2 3├
     └───┘
    "
  `)
})
