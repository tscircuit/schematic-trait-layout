import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"

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

  // expect([
  //   ...cju(circuitJson).schematic_component.list(),
  //   ...cju(circuitJson).schematic_port.list(),
  //   ...cju(circuitJson).schematic_net_label.list(),
  //   ...cju(circuitJson).source_component.list(),
  //   ...cju(circuitJson).source_trace.list(),
  //   ...cju(circuitJson).source_port.list(),
  //   ...cju(circuitJson).source_net.list(),
  // ]).toMatchInlineSnapshot()

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
})
