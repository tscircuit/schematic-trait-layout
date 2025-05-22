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
      ┌───┐
    L─┤1 4├
      ┤2 3├
      └───┘
    "
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 4├─L
    ┤2 3├
    └───┘
    "
  `)

  /* run adaptation --------------------------------------------------- */
  const { appliedOperations } = adaptTemplateToTarget({
    template,
    target: target.getNetlist(),
  })

  expect(appliedOperations).toMatchInlineSnapshot(`[
    {
      "chipId": "chip0",
      "pinNumber": 4,
      "type": "clear_label",
    },
    {
      "chipId": "chip0",
      "pinNumber": 1,
      "type": "add_label",
    },
  ]`)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    L─┤1 4├
      ┤2 3├
      └───┘
    "
  `)
})
