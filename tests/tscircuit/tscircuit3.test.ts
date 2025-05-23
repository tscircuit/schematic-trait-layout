import { runTscircuitCode } from "@tscircuit/eval"
import { cju } from "@tscircuit/circuit-json-util"
import { test, expect } from "bun:test"
import { convertCircuitJsonToInputNetlist } from "lib/circuit-json/convertCircuitJsonToInputNetlist"
import { getReadableNetlist } from "lib/netlist/getReadableNetlist"
import { CircuitBuilder } from "lib/builder"
import { applyCircuitLayoutToCircuitJson } from "lib/circuit-json/applyCircuitLayoutToCircuitJson"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { normalizeNetlist } from "lib/scoring/normalizeNetlist"

test("tscircuit3", async () => {
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

  const C = (mode: "ascii" | "cj") => {
    const C = new CircuitBuilder()
    if (mode === "cj") {
      C.defaultChipWidth = 2
      C.defaultPinSpacing = 0.2
      C.defaultLineDistanceMultiple = 0.4
    }
    const U1 = C.chip().leftpins(1).rightpins(1)

    return C
  }

  expect(`\n${C("ascii").toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    ┤1 2├
    └───┘
    "
  `)
})
