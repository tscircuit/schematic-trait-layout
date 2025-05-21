import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("tscircuit1", async () => {
  const circuitJson: any[] = await runTscircuitCode(`
import { sel } from "tscircuit"

export default () => (
  <board routingDisabled>
    <chip
      name="U1"
      footprint="soic4"
      connections={{ pin1: sel.R1.pin1, pin3: sel.net.GND1 }}
    />
    <resistor
      name="R1"
      schX={-3}
      resistance="1k"
      footprint="0402"
      connections={{ pin2: sel.net.GND2 }}
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
          "x": -3,
          "y": 0,
        },
        "schematic_component_id": "schematic_component_1",
        "size": {
          "height": 0.388910699999999,
          "width": 1.0583332999999997,
        },
        "source_component_id": "source_component_1",
        "symbol_display_value": "1kΩ",
        "symbol_name": "boxresistor_right",
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
          "x": -3.5337907,
          "y": 0.045805199999999324,
        },
        "display_pin_label": "pos",
        "distance_from_component_edge": 0.4,
        "facing_direction": "left",
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
          "x": -2.4312092999999995,
          "y": 0.04525870000000065,
        },
        "display_pin_label": "neg",
        "distance_from_component_edge": 0.4,
        "facing_direction": "right",
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
        "text": "GND1",
        "type": "schematic_net_label",
      },
      {
        "anchor_position": {
          "x": -2.4312092999999995,
          "y": 0.04525870000000065,
        },
        "anchor_side": "left",
        "center": {
          "x": -2.4312092999999995,
          "y": 0.04525870000000065,
        },
        "schematic_net_label_id": "schematic_net_label_1",
        "source_net_id": "source_net_1",
        "text": "GND2",
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
              "netId": "GND1,U1.3",
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
              "netId": "GND2,R1.2",
            },
          ],
        },
      ],
      "nets": [
        {
          "netId": "GND1,U1.3",
        },
        {
          "netId": "GND2,R1.2",
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
                     2│                │3  ── GND1,U1.3 
                      └────────────────┘


                      ┌────────────────┐
            U1.1 ──  1│       R1       │2  ── GND2,R1.2 
                      └────────────────┘

    Complex Connections (more than 2 points):
      (none)"
  `)

  const C = (mode?: "cj" | "ascii") => {
    const C = new CircuitBuilder()
    if (mode === "cj") {
      C.defaultChipWidth = 2
      C.defaultPinSpacing = 0.2
    }
    const U1 = C.chip().leftpins(2).rightpins(2)

    U1.pin(1).line(-1, 0).passive().line(-1, 0).line(0, -1).label()
    U1.pin(3).line(1, 0).label()
    return C
  }

  expect(`\n${C("ascii").toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    ┌P┤1 4├
    L ┤2 3├L
      └───┘
    "
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
            "leftPinCount": 2,
            "rightPinCount": 2,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 0,
            "boxIndex": 1,
            "leftPinCount": 1,
            "rightPinCount": 1,
            "topPinCount": 0,
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
                "pinNumber": 3,
              },
              {
                "netIndex": 1,
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
        ],
        "nets": [
          {
            "netIndex": 0,
          },
          {
            "netIndex": 1,
          },
        ],
      },
      "transform": {
        "boxIdToBoxIndex": {
          "R1": 1,
          "U1": 0,
        },
        "netIdToNetIndex": {
          "GND1,U1.3": 1,
          "GND2,R1.2": 0,
        },
      },
    }
  `)

  expect(normalizeNetlist(C("cj").getNetlist())).toMatchInlineSnapshot(`
    {
      "normalizedNetlist": {
        "boxes": [
          {
            "bottomPinCount": 0,
            "boxIndex": 0,
            "leftPinCount": 2,
            "rightPinCount": 2,
            "topPinCount": 0,
          },
          {
            "bottomPinCount": 0,
            "boxIndex": 1,
            "leftPinCount": 1,
            "rightPinCount": 1,
            "topPinCount": 0,
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
                "pinNumber": 3,
              },
              {
                "netIndex": 1,
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
        ],
        "nets": [
          {
            "netIndex": 0,
          },
          {
            "netIndex": 1,
          },
        ],
      },
      "transform": {
        "boxIdToBoxIndex": {
          "chip0": 0,
          "passive1": 1,
        },
        "netIdToNetIndex": {
          "L1": 0,
          "L2": 1,
        },
      },
    }
  `)

  const newCircuitJson = applyCircuitLayoutToCircuitJson(
    circuitJson,
    convertCircuitJsonToInputNetlist(circuitJson),
    C("cj"),
  )

  expect(cju(newCircuitJson).schematic_component.list()).toMatchInlineSnapshot(`
    [
      {
        "center": {
          "x": 1,
          "y": 0.30000000000000004,
        },
        "pin_spacing": 0.2,
        "pin_styles": undefined,
        "port_arrangement": undefined,
        "port_labels": {},
        "rotation": 0,
        "schematic_component_id": "schematic_component_0",
        "size": {
          "height": 0.6000000000000001,
          "width": 1.2,
        },
        "source_component_id": "source_component_0",
        "type": "schematic_component",
      },
      {
        "center": {
          "x": -1,
          "y": 0.4000000000000001,
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
