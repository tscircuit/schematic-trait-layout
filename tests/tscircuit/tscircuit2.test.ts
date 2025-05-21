import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

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
        pin6: "AGND",
        pin5: "DGND",
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
  C.defaultChipWidth = 4
  const U1 = C.chip().leftpins(4).rightpins(4)

  U1.pin(1).line(-2, 0).passive().line(-1, 0).line(0, -1).label()
  U1.pin(2).line(-1, 0).line(0, 2).passive().line(0, 1).label()
  U1.pin(3).line(-1, 0).line(0, -1).connect()
  U1.pin(4).line(-1, 0).line(0, -1).label()
  U1.pin(8).line(1, 0).line(0, 2).line(1, 0).intersect()
  U1.pin(7).line(2, 0).line(0, 2).passive().line(0, 1).label()
  U1.pin(6).line(1, 0).line(0, -1).connect()
  U1.pin(5).line(1, 0).line(0, -1).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
      L      L
      │     ┌●
      P┌───┐│P
    ┌P├┤1 8├┘│
    L └┤2 7├─┘
      ┌┤3 6├┐
      ├┤4 5├┤
      L└───┘L
    "
  `)

  const newCircuitJson = applyCircuitLayoutToCircuitJson(
    circuitJson,
    convertCircuitJsonToInputNetlist(circuitJson),
    C,
  )

  expect(cju(newCircuitJson).schematic_component.list()).toMatchInlineSnapshot(`
    [
      {
        "center": {
          "x": 2,
          "y": 2.5,
        },
        "pin_spacing": 0.2,
        "pin_styles": undefined,
        "port_arrangement": undefined,
        "port_labels": {
          "pin1": "EN1",
          "pin2": "EN2",
          "pin5": "DGND",
          "pin6": "AGND",
        },
        "rotation": 0,
        "schematic_component_id": "schematic_component_0",
        "size": {
          "height": 4,
          "width": 3.2,
        },
        "source_component_id": "source_component_0",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": -1.5,
          "y": 4,
        },
        "schematic_component_id": "schematic_component_1",
        "size": {
          "height": 1,
          "width": 1,
        },
        "source_component_id": "source_component_1",
        "symbol_display_value": "1kΩ",
        "symbol_name": "boxresistor_right",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": -0.5,
          "y": 5,
        },
        "schematic_component_id": "schematic_component_2",
        "size": {
          "height": 1,
          "width": 1,
        },
        "source_component_id": "source_component_2",
        "symbol_display_value": "10kΩ",
        "symbol_name": "boxresistor_up",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": 6.5,
          "y": 5,
        },
        "schematic_component_id": "schematic_component_3",
        "size": {
          "height": 1,
          "width": 1,
        },
        "source_component_id": "source_component_3",
        "symbol_display_value": "10kΩ",
        "symbol_name": "boxresistor_up",
        "type": "schematic_component",
      },
    ]
  `)

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
