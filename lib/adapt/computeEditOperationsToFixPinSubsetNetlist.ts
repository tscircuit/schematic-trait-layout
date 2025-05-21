import type { CircuitBuilder } from "lib/builder"
import type { InputNetlist } from "lib/input-types"
import type { EditOperation } from "./EditOperation"

export const computeEditOperationsToFixPinSubsetNetlist = (params: {
  currentNetlist: InputNetlist
  targetNetlist: InputNetlist
  chipId: string
  pinNumber: number
}): EditOperation[] => {
  const { currentNetlist, targetNetlist, chipId, pinNumber } = params

  // TODO
}
