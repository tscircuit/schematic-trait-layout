import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"

test("tscircuit1", async () => {
  const circuitJson: any[] = await runTscircuitCode(`
    import { sel } from "tscircuit"

    export default () => (
      <board routingDisabled>
        <chip name="U1" footprint="soic4" />
        <resistor name="R1" resistance="1k" footprint="0402" />
        <trace from={sel.U1.pin1} to={sel.R1.pin1} />
      </board>
    )
  `)

  expect([
    ...cju(circuitJson).schematic_component.list(),
    ...cju(circuitJson).schematic_port.list(),
    ...cju(circuitJson).source_component.list(),
    ...cju(circuitJson).source_trace.list(),
    ...cju(circuitJson).source_port.list(),
    ...cju(circuitJson).source_net.list(),
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
          "x": 0,
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
          "x": -0.5337907000000003,
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
          "x": 0.5687907000000003,
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
        "ftype": "simple_chip",
        "manufacturer_part_number": undefined,
        "name": "U1",
        "source_component_id": "source_component_0",
        "supplier_part_numbers": undefined,
        "type": "source_component",
      },
      {
        "are_pins_interchangeable": true,
        "display_resistance": "1kΩ",
        "ftype": "simple_resistor",
        "manufacturer_part_number": undefined,
        "name": "R1",
        "resistance": 1000,
        "source_component_id": "source_component_1",
        "supplier_part_numbers": {
          "jlcpcb": [
            "C11702",
            "C25543",
            "C106235",
          ],
        },
        "type": "source_component",
      },
      {
        "connected_source_net_ids": [],
        "connected_source_port_ids": [
          "source_port_0",
          "source_port_4",
        ],
        "display_name": ".U1 > .pin1 to .R1 > .pin1",
        "max_length": undefined,
        "min_trace_thickness": undefined,
        "source_trace_id": "source_trace_0",
        "subcircuit_connectivity_map_key": "unnamedsubcircuit47_connectivity_net0",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_trace",
      },
      {
        "name": "pin1",
        "pin_number": 1,
        "port_hints": [
          "pin1",
          "1",
        ],
        "source_component_id": "source_component_0",
        "source_port_id": "source_port_0",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
      {
        "name": "pin2",
        "pin_number": 2,
        "port_hints": [
          "pin2",
          "2",
        ],
        "source_component_id": "source_component_0",
        "source_port_id": "source_port_1",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
      {
        "name": "pin3",
        "pin_number": 3,
        "port_hints": [
          "pin3",
          "3",
        ],
        "source_component_id": "source_component_0",
        "source_port_id": "source_port_2",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
      {
        "name": "pin4",
        "pin_number": 4,
        "port_hints": [
          "pin4",
          "4",
        ],
        "source_component_id": "source_component_0",
        "source_port_id": "source_port_3",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
      {
        "name": "pin1",
        "pin_number": 1,
        "port_hints": [
          "anode",
          "pos",
          "left",
          "pin1",
          "1",
        ],
        "source_component_id": "source_component_1",
        "source_port_id": "source_port_4",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
      {
        "name": "pin2",
        "pin_number": 2,
        "port_hints": [
          "cathode",
          "neg",
          "right",
          "pin2",
          "2",
        ],
        "source_component_id": "source_component_1",
        "source_port_id": "source_port_5",
        "subcircuit_id": "subcircuit_source_group_0",
        "type": "source_port",
      },
    ]
  `)
})
