import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import type { EditOperation } from "./EditOperation"
import { getPinSubsetNetlist } from "./getPinSubsetNetlist"

export const computeEditOperationsToFixPinSubsetNetlist = (params: {
  currentNetlist: InputNetlist
  targetNetlist: InputNetlist
  chipId: string
  pinNumber: number
}): EditOperation[] => {
  const { currentNetlist, targetNetlist, chipId, pinNumber } = params

  const operations: EditOperation[] = []

  // Build the “pin-subset” netlists for the pin in the current vs. target
  const currentSubset = getPinSubsetNetlist({
    netlist: currentNetlist,
    chipId,
    pinNumber,
  })
  const targetSubset = getPinSubsetNetlist({
    netlist: targetNetlist,
    chipId,
    pinNumber,
  })

  const pinBoxId = `${chipId}.pin${pinNumber}`

  /* ------------------------------------------------------------------ *
   * Helpers                                                             *
   * ------------------------------------------------------------------ */
  const pinAppearsInConnection = (
    conn: any,
    boxId: string,
    pinNum: number,
  ): boolean =>
    conn.connectedPorts.some(
      (p: any) => "boxId" in p && p.boxId === boxId && p.pinNumber === pinNum,
    )

  const hasLabelConnection = (subset: InputNetlist): boolean =>
    subset.connections.some(
      (c) =>
        pinAppearsInConnection(c, pinBoxId, 1) &&
        c.connectedPorts.some((p) => "netId" in p),
    )

  const numberOfConnections = (subset: InputNetlist): number =>
    subset.connections.filter((c) => pinAppearsInConnection(c, pinBoxId, 1))
      .length

  /* Does the subset contain a connection from the pin to a “passive” chip? */
  const hasPassiveConnection = (subset: InputNetlist): boolean =>
    subset.connections.some(
      (c) =>
        pinAppearsInConnection(c, pinBoxId, 1) &&
        c.connectedPorts.some((p) => "boxId" in p && /^R\d+$/.test(p.boxId)),
    )

  /* ------------------------------------------------------------------ *
   * Decide what edit-operation(s) are required                          *
   * ------------------------------------------------------------------ */

  // 1. Clear pin if target has NO connections but current does
  if (
    numberOfConnections(targetSubset) === 0 &&
    numberOfConnections(currentSubset) > 0
  ) {
    operations.push({
      type: "clear_pin",
      chipId,
      pinNumber,
    })
    return operations
  }

  // 2. Add passive element if target has one but current does not
  if (
    hasPassiveConnection(targetSubset) &&
    !hasPassiveConnection(currentSubset)
  ) {
    operations.push({
      type: "add_passive_to_pin",
      chipId,
      pinNumber,
    })
    return operations
  }

  // 3. Add label if target has a label but current does not
  if (hasLabelConnection(targetSubset) && !hasLabelConnection(currentSubset)) {
    operations.push({
      type: "add_label_to_pin",
      chipId,
      pinNumber,
    })
  }

  // (additional rules can be appended here in the future)

  return operations
}
