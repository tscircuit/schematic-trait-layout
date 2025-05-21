import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist, Box, Connection, Net } from "lib/input-types"

/**
 * Gets the subset of the netlist directly connected to the given pin.
 *
 * The pin is added to the netlist as a box. with only a single pin.
 *
 */
export function getPinSubsetNetlist(params: {
  netlist: InputNetlist
  chipId: string
  pinNumber: number
}): InputNetlist {
  const { netlist, chipId, pinNumber } = params

  const newBoxes: Box[] = [
    {
      boxId: `${chipId}.pin${pinNumber}`,
      leftPinCount: 0,
      rightPinCount: 1,
      topPinCount: 0,
      bottomPinCount: 0,
    },
  ]

  // TODO
}
