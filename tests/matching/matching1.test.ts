import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { findBestMatch } from "lib/matching/findBestMatch"
import type { InputNetlist } from "lib/input-types"
import { TEMPLATE_FNS } from "templates/index"
import { getMatchingIssues } from "lib/matching/getMatchingIssues"
import template3 from "templates/template3"
import template4 from "templates/template4"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"
import { getPinShapeSignature } from "lib/adapt/getPinShapeSignature"

test("findBestMatch should find a compatible template and snapshot it", () => {
  // 1. Construct an input netlist using the circuit builder
  const inputCircuit = circuit()
  const u1 = inputCircuit.chip().rightpins(3) // chip0, global pin 1 is right pin 1
  u1.pin(3).line(5, 0).mark("m1").line(0, -2).passive().line(0, -1).label() // Connects chip0.pin(1) to net "SignalOut"
  u1.fromMark("m1").line(3, 0).label()
  u1.pin(2).line(2, 0).label()

  expect(`\n${inputCircuit.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  3├────┼──B
    │  2├─C  │
    │  1├    R2
    └───┘    A
    "
  `)

  expect(`\n${template3().toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐      A
    │  3├───●──┤
    │  2├─┐ │  │
    │  1├┐│ R3 R2
    └───┘│└─┘  │
         │     │
         C     B
    "
  `)

  expect(template3().getReadableNetlist()).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
                      │                │3  ── ...       
                      │       U1       │2  ── R3.1      
                      │                │1  ── C         
                      └────────────────┘


                             ...       
                              │        
                              2        
                      ┌────────────────┐
                      │       R2       │                
                      └────────────────┘
                              1        
                              │        
                              B        


                             ...       
                              │        
                              2        
                      ┌────────────────┐
                      │       R3       │                
                      └────────────────┘
                              1        
                              │        
                             U1.2      

    Complex Connections (more than 2 points):
      - Connection 1:
        - Box Pin: U1, Pin 3
        - Net: A
        - Box Pin: R2, Pin 2
        - Box Pin: R3, Pin 2"
  `)
  expect(`\n${template4().toString()}\n`).toMatchInlineSnapshot(`
    "
     U1     A
    ┌───┐   │
    │  3├───┤
    │  2├─C │
    │  1├┐  R2
    └───┘│  │
         D  B
    "
  `)

  expect(
    getPinShapeSignature({
      netlist: inputCircuit.getNetlist(),
      chipId: "U1",
      pinNumber: 3,
    }),
  ).toMatchInlineSnapshot(`"L0B1R0T1,L0B0R1T0|C[b0.2,b1.1,n0]"`)

  expect(
    getPinShapeSignature({
      netlist: template3().getNetlist(),
      chipId: "U1",
      pinNumber: 3,
    }),
  ).toMatchInlineSnapshot(`"L0B1R0T1,L0B0R1T0,L0B1R0T1|C[b0.2,b1.1,b2.2,n0]"`)

  expect(
    getPinShapeSignature({
      netlist: template4().getNetlist(),
      chipId: "U1",
      pinNumber: 3,
    }),
  ).toMatchInlineSnapshot(`"L0B1R0T1,L0B0R1T0|C[b0.2,b1.1,n0]"`)

  // Matching issues
  expect(
    getMatchingIssues({
      targetNetlist: normalizeNetlist(inputCircuit.getNetlist())
        .normalizedNetlist,
      candidateNetlist: normalizeNetlist(template3().getNetlist())
        .normalizedNetlist,
    }),
  ).toMatchInlineSnapshot(`
    [
      {
        "candidateBoxIndex": 0,
        "targetBoxIndex": 0,
        "targetPinNumber": 3,
        "targetPinShapeSignature": "L0B1R0T1,L0B0R1T0|C[b0.2,b1.1,n0]",
        "type": "matched_box_missing_pin_shape",
      },
      {
        "candidateBoxIndex": 2,
        "targetBoxIndex": 1,
        "targetPinNumber": 2,
        "targetPinShapeSignature": "L0B0R3T0,L0B0R1T0|C[b0.3,b1.1,n0]",
        "type": "matched_box_missing_pin_shape",
      },
    ]
  `)
  expect(
    getMatchingIssues({
      targetNetlist: normalizeNetlist(inputCircuit.getNetlist())
        .normalizedNetlist,
      candidateNetlist: normalizeNetlist(template4().getNetlist())
        .normalizedNetlist,
    }),
  ).toMatchInlineSnapshot(`[]`)

  // 2. Find the best match against all templates
  const bestMatchCircuit = findBestMatch(
    inputCircuit.getNetlist(),
    TEMPLATE_FNS.map((fn) => fn()),
  )

  // 3. Assert that a match was found
  expect(bestMatchCircuit).not.toBeNull()

  // 4. Take an inline snapshot of the matched template's string representation
  // This input is designed to match template1.
  // TODO this is incorrect, template4 is a better match than template3
  expect(`\n${bestMatchCircuit!.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1     A
    ┌───┐   │
    │  3├───┤
    │  2├─C │
    │  1├┐  R2
    └───┘│  │
         D  B
    "
  `)
})
