import { test, expect } from "bun:test"
import { SchematicLayoutPipelineSolver } from "../../lib/solvers/SchematicLayoutPipelineSolver"
import { circuit } from "../../lib/builder"

test("SchematicLayoutPipelineSolver can process a CircuitBuilder netlist", () => {
  // Create a circuit using CircuitBuilder similar to template1.ts
  const C = circuit()

  // Add a chip with 2 left pins and 2 right pins (similar to README example)
  const U1 = C.chip().leftpins(2).rightpins(2)

  // Add a resistor connected to pin 1
  U1.pin(1).line(-8, 0).passive().label("R1")

  // Connect pin 2 to a labeled net
  U1.pin(2).line(-3, 0).label("INPUT")

  // Connect pin 3 to output
  U1.pin(3).line(4, 0).label("OUTPUT")

  // Connect pin 4 to VCC
  U1.pin(4).line(4, 0).label("VCC")

  // Get the netlist from the circuit
  const inputNetlist = C.getNetlist()

  const solver = new SchematicLayoutPipelineSolver({
    inputNetlist,
  })

  // Solver should be created successfully
  expect(solver).toBeDefined()
  expect(solver.solved).toBe(false)
  expect(solver.failed).toBe(false)

  solver.solve()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
             U1
            ┌───┐
    R2──────┤1 4├───V
         I──┤2 3├───O
            └───┘
    "
  `)

  expect(
    `\n${solver.matchPhaseSolver?.outputMatchedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
             U1
            ┌───┐
    ├───────┤1 4├───D
    │    ┌──┤2 3├───C
    R2   │  └───┘
    │    B
    A
    "
  `)

  expect(
    `\n${solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.toString()}\n`,
  ).toMatchInlineSnapshot(`
    "
              U1
             ┌───┐
     ────────┤1 4├───D
     │    ┌──┤2 3├───C
    ER2   │  └───┘
     A    B
    "
  `)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.template.getReadableNetlist(),
  ).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                     1│       U1       │4  ── D         
               B ──  2│                │3  ── C         
                      └────────────────┘


                                       
                              │        
                              3        
                      ┌────────────────┐
               E ──  1│       R2       │                
                      └────────────────┘
                              2        
                              │        
                              A        

    Complex Connections (more than 2 points):
      (none)"
  `)

  expect(
    solver.adaptPhaseSolver?.outputAdaptedTemplates[0]?.appliedOperations,
  ).toMatchInlineSnapshot(`
    [
      {
        "betweenPinNumbers": [
          0,
          1,
        ],
        "chipId": "R2",
        "side": "left",
        "type": "add_pin_to_side",
      },
      {
        "betweenPinNumbers": [
          2,
          3,
        ],
        "chipId": "R2",
        "side": "right",
        "type": "add_pin_to_side",
      },
      {
        "chipId": "R2",
        "pinNumber": 1,
        "type": "add_label_to_pin",
      },
      {
        "chipId": "R2",
        "pinNumber": 3,
        "type": "clear_pin",
      },
    ]
  `)
})
