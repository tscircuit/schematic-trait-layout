import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"

test("tscircuit1", async () => {
  const circuitJson: any[] = await runTscircuitCode(`
import { sel } from "tscircuit"

export default () => (
  <board routingDisabled>
    <chip name="U1" footprint="soic4" />
    <resistor name="R1" resistance="1k" schX={-2} schRotation="180deg" footprint="0402" />
    
    <trace from={sel.U1.pin1} to={sel.R1.pin1} />
    <trace from={sel.U1.pin3} to="net.GND" />
    <trace from={sel.R1.pin2} to={sel.net.GND} />
  </board>
)
  `)

  expect([
    ...cju(circuitJson).schematic_component.list(),
    // ...cju(circuitJson).schematic_port.list(),
    // ...cju(circuitJson).schematic_net_label.list(),
    // ...cju(circuitJson).source_component.list(),
    // ...cju(circuitJson).source_trace.list(),
    // ...cju(circuitJson).source_port.list(),
    // ...cju(circuitJson).source_net.list(),
  ]).toMatchInlineSnapshot(`
    [
      {
        "center": {
          "x": 0,
          "y": 0,
        },
        "pin_spacing": 0.2,
        "pin_styles": undefined,
        "port_arrangement": undefined,
        "port_labels": {},
        "rotation": 0,
        "schematic_component_id": "schematic_component_0",
        "size": {
          "height": 0.6000000000000001,
          "width": 0.4,
        },
        "source_component_id": "source_component_0",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": -2,
          "y": 0,
        },
        "schematic_component_id": "schematic_component_1",
        "size": {
          "height": 0.468910699999999,
          "width": 1.0583332999999997,
        },
        "source_component_id": "source_component_1",
        "symbol_display_value": "1kΩ",
        "symbol_name": "boxresistor_left",
        "type": "schematic_component",
      },
    ]
  `)

  expect(convertCircuitJsonToInputNetlist(circuitJson)).toMatchInlineSnapshot(`
    {
      "boxes": [
        {
          "bottomPinCount": 0,
          "boxId": "U1",
          "leftPinCount": 2,
          "rightPinCount": 2,
          "topPinCount": 0,
        },
        {
          "bottomPinCount": 0,
          "boxId": "R1",
          "leftPinCount": 1,
          "rightPinCount": 1,
          "topPinCount": 0,
        },
      ],
      "connections": [
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 1,
            },
            {
              "boxId": "R1",
              "pinNumber": 1,
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "U1",
              "pinNumber": 3,
            },
            {
              "netId": "GND",
            },
          ],
        },
        {
          "connectedPorts": [
            {
              "boxId": "R1",
              "pinNumber": 2,
            },
            {
              "netId": "GND",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "GND",
        },
      ],
    }
  `)

  expect(
    getReadableNetlist(convertCircuitJsonToInputNetlist(circuitJson)),
  ).toMatchInlineSnapshot(`
    "Boxes:


                      ┌────────────────┐
            R1.1 ──  1│       U1       │4               
                     2│                │3  ── GND       
                      └────────────────┘


                      ┌────────────────┐
            U1.1 ──  1│       R1       │2  ── GND       
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)

  const C = new CircuitBuilder()
  const U1 = C.chip().leftpins(2).rightpins(2)

  U1.pin(1).line(-2, 0).passive().line(-1, 0).line(0, -1).label()
  U1.pin(3).line(2, 0).label()

  const newCircuitJson = applyCircuitLayoutToCircuitJson(
    circuitJson,
    convertCircuitJsonToInputNetlist(circuitJson),
    C,
  )

  expect(cju(newCircuitJson).schematic_component.list()).toMatchInlineSnapshot()
})
