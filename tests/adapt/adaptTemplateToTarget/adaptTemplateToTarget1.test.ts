import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"

test("adaptTemplateToTarget adds missing pins on a side", () => {
  /* target circuit --------------------------------------------------- */
  const target = new CircuitBuilder()
  target.chip().leftpins(2).rightpins(2)

  /* template circuit (one pin short) --------------------------------- */
  const template = new CircuitBuilder()
  template.chip().leftpins(1).rightpins(1)

  expect(`\n${target.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 4├
    ┤2 3├
    └───┘
    "
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 2├
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
        "betweenPinNumbers": [
          0,
          1,
        ],
        "chipId": "chip0",
        "side": "left",
        "type": "add_pin_to_side",
      },
      {
        "betweenPinNumbers": [
          3,
          4,
        ],
        "chipId": "chip0",
        "side": "right",
        "type": "add_pin_to_side",
      },
    ]
  `)

  /* assertions ------------------------------------------------------- */
  expect(template.chips[0]!.leftPinCount).toBe(2) // pin was added
  expect(appliedOperations.length).toBe(2)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 4├
    ┤2 3├
    └───┘
    "
  `)
})
