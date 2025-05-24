import { test, expect } from "bun:test"
import { SchematicLayoutPipelineSolver } from "../../lib/solvers/SchematicLayoutPipelineSolver"
import { circuit } from "../../lib/builder"

test("e2e2", () => {
  // Create a circuit using CircuitBuilder similar to template1.ts
  const C = circuit()

  // Add a chip with 2 left pins and 2 right pins (similar to README example)
  const U1 = C.chip().leftpins(4).rightpins(4)
  U1.pin(1).line(-5, 0).passive().line(-2, 0).label("X")
  U1.pin(2).line(-3, 0).label("Y")
  U1.pin(5).line(4, 0).label("W")
  U1.pin(6).line(4, 0).label("Z")

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
            U1
           ┌───┐
    X─R2───┤1 8├
        Y──┤2 7├
           ┤3 6├───Z
           ┤4 5├───W
           └───┘
    "
  `)
  const inputNetlist = C.getNetlist()

  const solver = new SchematicLayoutPipelineSolver({
    inputNetlist,
  })

  solver.solve()

  expect(
    `\n${solver.matchPhaseSolver?.outputMatchedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
     U1   A
    ┌───┐ │
    │  7├─┘┌─R2B
    │  6├──┘
    │  5├────R3C
    │  4├─────┤
    │  3├──┤  │
    │  2├┐ │  │
    │  1├● │  │
    └───┘│ R5 R4
         │ │  │
         F E  D
    "
  `)

  expect(
    `\n${solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
               R2B
       U1
      ┌───┐
    R3┤1 8├──────
    G─┤2 7├───
      ┤3 6├┐
      ┤4 5├●
      └───┘│
           │
           F
    "
  `)
})
