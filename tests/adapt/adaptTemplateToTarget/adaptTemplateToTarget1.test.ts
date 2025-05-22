import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"

test("adaptTemplateToTarget adds missing pins on a side", () => {
  /* target circuit --------------------------------------------------- */
  const target = new CircuitBuilder()
  target.chip().leftpins(2).rightpins(1) // 2 left pins required

  /* template circuit (one pin short) --------------------------------- */
  const template = new CircuitBuilder()
  template.chip().leftpins(1).rightpins(1)

  /* run adaptation --------------------------------------------------- */
  const { appliedOperations } = adaptTemplateToTarget({
    template,
    target: target.getNetlist(),
  })

  /* assertions ------------------------------------------------------- */
  expect(template.chips[0]!.leftPinCount).toBe(2) // pin was added
  expect(appliedOperations.length).toBe(1)
  expect(appliedOperations[0]!.type).toBe("add_pins_to_side")

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
    ┌───┐
    ┤1 4├
    ┤2 3├
    └───┘
    "
  `)
})
