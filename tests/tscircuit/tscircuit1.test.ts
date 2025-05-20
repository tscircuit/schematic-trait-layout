import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

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
    ...cju(circuitJson).schematic_port.list(),
    ...cju(circuitJson).schematic_net_label.list(),
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
      {
        "center": {
          "x": -0.6000000000000001,
          "y": 0.1,
        },
        "display_pin_label": undefined,
        "distance_from_component_edge": 0.4,
        "facing_direction": "left",
        "pin_number": 1,
        "schematic_component_id": "schematic_component_0",
        "schematic_port_id": "schematic_port_0",
        "side_of_component": "left",
        "source_port_id": "source_port_0",
        "true_ccw_index": 0,
        "type": "schematic_port",
      },
      {
        "center": {
          "x": -0.6000000000000001,
          "y": -0.1,
        },
        "display_pin_label": undefined,
        "distance_from_component_edge": 0.4,
        "facing_direction": "left",
        "pin_number": 2,
        "schematic_component_id": "schematic_component_0",
        "schematic_port_id": "schematic_port_1",
        "side_of_component": "left",
        "source_port_id": "source_port_1",
        "true_ccw_index": 1,
        "type": "schematic_port",
      },
      {
        "center": {
          "x": 0.6000000000000001,
          "y": -0.1,
        },
        "display_pin_label": undefined,
        "distance_from_component_edge": 0.4,
        "facing_direction": "right",
        "pin_number": 3,
        "schematic_component_id": "schematic_component_0",
        "schematic_port_id": "schematic_port_2",
        "side_of_component": "right",
        "source_port_id": "source_port_2",
        "true_ccw_index": 2,
        "type": "schematic_port",
      },
      {
        "center": {
          "x": 0.6000000000000001,
          "y": 0.1,
        },
        "display_pin_label": undefined,
        "distance_from_component_edge": 0.4,
        "facing_direction": "right",
        "pin_number": 4,
        "schematic_component_id": "schematic_component_0",
        "schematic_port_id": "schematic_port_3",
        "side_of_component": "right",
        "source_port_id": "source_port_3",
        "true_ccw_index": 3,
        "type": "schematic_port",
      },
      {
        "center": {
          "x": -1.4662092999999996,
          "y": -0.04580519999999926,
        },
        "display_pin_label": "pos",
        "distance_from_component_edge": 0.4,
        "facing_direction": "right",
        "pin_number": 1,
        "schematic_component_id": "schematic_component_1",
        "schematic_port_id": "schematic_port_4",
        "side_of_component": undefined,
        "source_port_id": "source_port_4",
        "true_ccw_index": undefined,
        "type": "schematic_port",
      },
      {
        "center": {
          "x": -2.5687907,
          "y": -0.04525870000000072,
        },
        "display_pin_label": "neg",
        "distance_from_component_edge": 0.4,
        "facing_direction": "left",
        "pin_number": 2,
        "schematic_component_id": "schematic_component_1",
        "schematic_port_id": "schematic_port_5",
        "side_of_component": undefined,
        "source_port_id": "source_port_5",
        "true_ccw_index": undefined,
        "type": "schematic_port",
      },
      {
        "anchor_position": {
          "x": 0.6000000000000001,
          "y": -0.1,
        },
        "anchor_side": "left",
        "center": {
          "x": 0.6000000000000001,
          "y": -0.1,
        },
        "schematic_net_label_id": "schematic_net_label_0",
        "source_net_id": "source_net_0",
        "text": "GND",
        "type": "schematic_net_label",
      },
      {
        "anchor_position": {
          "x": -2.5687907,
          "y": -0.04525870000000072,
        },
        "anchor_side": "right",
        "center": {
          "x": -2.5687907,
          "y": -0.04525870000000072,
        },
        "schematic_net_label_id": "schematic_net_label_1",
        "source_net_id": "source_net_0",
        "text": "GND",
        "type": "schematic_net_label",
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
              "netId": "GND,U1.3",
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
              "netId": "GND,R1.2",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "GND,U1.3",
        },
        {
          "netId": "GND,R1.2",
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
                     2│                │3  ── GND,U1.3  
                      └────────────────┘


                      ┌────────────────┐
            U1.1 ──  1│       R1       │2  ── GND,R1.2  
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)

  const C = new CircuitBuilder()
  const U1 = C.chip().leftpins(2).rightpins(2)

  U1.pin(1).line(-2, 0).passive().line(-1, 0).line(0, -1).label()
  U1.pin(3).line(2, 0).label()

  expect(`\n${C.toString()}\n`).toMatchInlineSnapshot(`
    "
       ┌───┐
    ┌P─┤1 4├
    L  ┤2 3├─L
       └───┘
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
          "y": 2,
        },
        "pin_spacing": 0.2,
        "pin_styles": undefined,
        "port_arrangement": undefined,
        "port_labels": {},
        "rotation": 0,
        "schematic_component_id": "schematic_component_0",
        "size": {
          "height": 2,
          "width": 2,
        },
        "source_component_id": "source_component_0",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": -1.5,
          "y": 2.5,
        },
        "schematic_component_id": "schematic_component_1",
        "size": {
          "height": 1,
          "width": 1,
        },
        "source_component_id": "source_component_1",
        "symbol_display_value": "1kΩ",
        "symbol_name": "boxresistor_left",
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
  ).toMatchSvgSnapshot(import.meta.path, "tscircuit1-original")
  expect(
    convertCircuitJsonToSchematicSvg(newCircuitJson, {
      grid: {
        cellSize: 1,
        labelCells: true,
      },
    }),
  ).toMatchSvgSnapshot(import.meta.path, "tscircuit1-layout")
})
