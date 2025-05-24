import { test, expect } from "bun:test"
import { CircuitBuilder } from "lib/builder"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"

test("adaptTemplateToTarget3 removes extra chip when target has fewer chips", () => {
  /* target circuit (single chip) ------------------------------------- */
  const target = new CircuitBuilder()
  const tU1 = target.chip().leftpins(2).rightpins(2)
  tU1.pin(1).line(-4, 0).line(0, -1).passive().line(0, -2).label()

  /* template circuit (no passive, no label) --------------------------- */
  const template = new CircuitBuilder()
  const eU1 = template.chip().leftpins(2).rightpins(2).at(0, 0)

  expect(`\n${target.toString()}\n`).toMatchInlineSnapshot(`
    "
         U1
        ┌───┐
    ├───┤1 4├
    R2  ┤2 3├
    │   └───┘
    A
    "
  `)

  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    ┤1 4├
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
        "labelNetId": "A",
        "pinNumber": 1,
        "type": "add_passive_with_label_to_pin",
      },
    ]
  `)

  /* verify adaptation result ----------------------------------------- */
  expect(`\n${template.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    A2┤1 4├
      ┤2 3├
      └───┘
    "
  `)
})
