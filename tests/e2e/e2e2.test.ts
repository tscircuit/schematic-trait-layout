import { test, expect } from "bun:test"
import { SchematicLayoutPipelineSolver } from "../../lib/solvers/SchematicLayoutPipelineSolver"
import { circuit } from "../../lib/builder"
import { getReadableNetlist } from "../../lib/netlist/getReadableNetlist"

test("e2e2", () => {
  // Create a circuit using CircuitBuilder similar to template1.ts
  const C = circuit()

  // Add a chip with 4 left pins and 4 right pins
  const U1 = C.chip().leftpins(4).rightpins(4)
  U1.pin(1).line(-5, 0).passive().line(-2, 0).label("X")
  U1.pin(2).line(-3, 0).label("Y")
  U1.pin(7).line(4, 0).label()
  U1.pin(8).line(4, 0).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
            U1
           ┌───┐
    X─R2───┤1 8├───B
        Y──┤2 7├───A
           ┤3 6├
           ┤4 5├
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
       U1
      ┌───┐
    X3┤1 8├─I────
    G─┤2 7├─H─
      ┤3 6├
      ┤4 5├
      └───┘
    "
  `)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.getReadableNetlist(),
  ).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
            R3.2 ──  1│                │8  ── I         
               G ──  2│       U1       │7  ── H         
                     3│                │6               
                     4│                │5               
                      └────────────────┘


                      ┌────────────────┐
               X ──  1│       R3       │2  ── U1.1      
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)
})
