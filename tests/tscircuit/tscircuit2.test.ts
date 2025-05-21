import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("tscircuit2", async () => {
  const circuitJson: any[] = await runTscircuitCode(`
import { sel } from "tscircuit"

export default () => (
  <board routingDisabled>
    <chip
      name="U1"
      footprint="soic8"
      pinLabels={{
        pin1: "EN1",
        pin2: "EN2",
        pin5: "DGND",
        pin6: "D1",
        pin7: "D0",
        pin8: "VCC"
      }}
      connections={{
        pin1: sel.R1.pin1,
        pin5: sel.net.GND,
        pin6: sel.net.D0,
        pin7: [sel.R3.pin1, sel.net.D1],
        pin8: sel.net.VCC,
      }}
    />
    <resistor
      name="R1"
      resistance="1k"
      footprint="0402"
      schX={-4}
      connections={{ pin2: sel.net.GND }}
    />
    <resistor
      name="R2"
      resistance="10k"
      schX={-2}
      schY={2}
      schRotation="90deg"
      connections={{ pin1: sel.U1.pin2, pin2: "net.VCC" }}
    />
    <resistor
      name="R3"
      resistance="10k"
      schX={2}
      schY={2}
      schRotation="90deg"
      connections={{
        pin2: sel.net.VCC,
      }}
    />
  </board>
)

  `)

  // HACK: Add schematic_net_label_id since core doesn't add it currently
  let schLabelIdCounter = 0
  for (const schLabel of cju(circuitJson).schematic_net_label.list()) {
    // @ts-expect-error until circuit-json adds schematic_net_label_id
    schLabel.schematic_net_label_id ??= `schematic_net_label_${schLabelIdCounter++}`
  }

  expect(
    getReadableNetlist(convertCircuitJsonToInputNetlist(circuitJson)),
  ).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
            R1.1 ──  1│                │8  ── U1.8,VCC  
            R2.1 ──  2│       U1       │7  ── ...       
                     3│                │6  ── D0,U1.6   
                     4│                │5  ── GND,U1.5  
                      └────────────────┘


                      ┌────────────────┐
            U1.1 ──  1│       R1       │2  ── GND,R1.2  
                      └────────────────┘


                           R2.2,VCC    
                              │        
                              2        
                      ┌────────────────┐
                      │       R2       │                
                      └────────────────┘
                              1        
                              │        
                             U1.2      


                           R3.2,VCC    
                              │        
                              2        
                      ┌────────────────┐
                      │       R3       │                
                      └────────────────┘
                              1        
                              │        
                             U1.7      

    Complex Connections (more than 2 points):
      (none)"
  `)

  const C = new CircuitBuilder()
  C.defaultChipWidth = 2
  C.defaultPinSpacing = 0.2
  C.defaultLineDistanceMultiple = 0.4
  const U1 = C.chip().leftpins(4).rightpins(4)

  U1.pin(1).line(-3, 0).passive().line(-1, 0).line(0, -1).label()
  U1.pin(2).line(-1, 0).line(0, 3).passive().line(0, 1).label()
  // U1.pin(3).line(-1, 0).line(0, -1).connect()
  // U1.pin(4).line(-1, 0).line(0, -1).label()
  U1.pin(8).line(1, 0).line(0, 3).line(1, 0).intersect()
  U1.pin(7).line(2, 0).line(0, 2).passive().line(0, 1).label()
  U1.pin(6).line(1, 0).label()
  U1.pin(5).line(1, 0).line(0, -1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
      ┤1 8├
      L2 7├
      P3 ●├
    ┬P┤4 P├
    L └─L─┘
    "
  `)

  expect(normalizeNetlist(C.getNetlist())).toMatchInlineSnapshot(`
    {
      "normalizedNetlist": {
        "boxes": [
          {
            "bottomPinCount": 0,
            "boxIndex": 0,
            "leftPinCount": 4,
            "rightPinCount": 4,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 0,
            "boxIndex": 1,
            "leftPinCount": 1,
            "rightPinCount": 1,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 1,
            "boxIndex": 2,
            "leftPinCount": 0,
            "rightPinCount": 0,
            "topPinCount": 1,
          },
          {
            "bottomPinCount": 1,
            "boxIndex": 3,
            "leftPinCount": 0,
            "rightPinCount": 0,
            "topPinCount": 1,
          },
        ],
        "connections": [
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 1,
              },
              {
                "boxIndex": 1,
                "pinNumber": 1,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 2,
              },
              {
                "boxIndex": 2,
                "pinNumber": 2,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 5,
              },
              {
                "netIndex": 4,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 6,
              },
              {
                "netIndex": 3,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 7,
              },
              {
                "boxIndex": 3,
                "pinNumber": 2,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 8,
              },
              {
                "boxIndex": 3,
                "pinNumber": 1,
              },
              {
                "netIndex": 2,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 1,
                "pinNumber": 2,
              },
              {
                "netIndex": 0,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 2,
                "pinNumber": 1,
              },
              {
                "netIndex": 1,
              },
            ],
          },
        ],
        "nets": [
          {
            "netIndex": 0,
          },
          {
            "netIndex": 1,
          },
          {
            "netIndex": 2,
          },
          {
            "netIndex": 3,
          },
          {
            "netIndex": 4,
          },
        ],
      },
      "transform": {
        "boxIdToBoxIndex": {
          "chip0": 0,
          "passive1": 1,
          "passive2": 2,
          "passive3": 3,
        },
        "netIdToNetIndex": {
          "L1": 0,
          "L2": 1,
          "L3": 2,
          "L4": 3,
          "L5": 4,
        },
      },
    }
  `)

  expect(
    normalizeNetlist(convertCircuitJsonToInputNetlist(circuitJson)),
  ).toMatchInlineSnapshot(`
    {
      "normalizedNetlist": {
        "boxes": [
          {
            "bottomPinCount": 0,
            "boxIndex": 0,
            "leftPinCount": 4,
            "rightPinCount": 4,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 0,
            "boxIndex": 1,
            "leftPinCount": 1,
            "rightPinCount": 1,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 1,
            "boxIndex": 2,
            "leftPinCount": 0,
            "rightPinCount": 0,
            "topPinCount": 1,
          },
          {
            "bottomPinCount": 1,
            "boxIndex": 3,
            "leftPinCount": 0,
            "rightPinCount": 0,
            "topPinCount": 1,
          },
        ],
        "connections": [
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 1,
              },
              {
                "boxIndex": 1,
                "pinNumber": 1,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 2,
              },
              {
                "boxIndex": 2,
                "pinNumber": 1,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 5,
              },
              {
                "netIndex": 3,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 6,
              },
              {
                "netIndex": 0,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 7,
              },
              {
                "boxIndex": 3,
                "pinNumber": 1,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 7,
              },
              {
                "netIndex": 1,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 0,
                "pinNumber": 8,
              },
              {
                "netIndex": 6,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 1,
                "pinNumber": 2,
              },
              {
                "netIndex": 2,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 2,
                "pinNumber": 2,
              },
              {
                "netIndex": 4,
              },
            ],
          },
          {
            "connectedPorts": [
              {
                "boxIndex": 3,
                "pinNumber": 2,
              },
              {
                "netIndex": 5,
              },
            ],
          },
        ],
        "nets": [
          {
            "netIndex": 0,
          },
          {
            "netIndex": 1,
          },
          {
            "netIndex": 2,
          },
          {
            "netIndex": 3,
          },
          {
            "netIndex": 4,
          },
          {
            "netIndex": 5,
          },
          {
            "netIndex": 6,
          },
        ],
      },
      "transform": {
        "boxIdToBoxIndex": {
          "R1": 1,
          "R2": 2,
          "R3": 3,
          "U1": 0,
        },
        "netIdToNetIndex": {
          "D0,U1.6": 0,
          "D1,U1.7": 1,
          "GND,R1.2": 2,
          "GND,U1.5": 3,
          "R2.2,VCC": 4,
          "R3.2,VCC": 5,
          "U1.8,VCC": 6,
        },
      },
    }
  `)

  const newCircuitJson = applyCircuitLayoutToCircuitJson(
    circuitJson,
    convertCircuitJsonToInputNetlist(circuitJson),
    C,
  )

  expect(
    convertCircuitJsonToSchematicSvg(circuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "tscircuit2-original")
  expect(
    convertCircuitJsonToSchematicSvg(newCircuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "tscircuit2-layout")
})
