import type { InputNetlist, Side } from "./input-types"

/**
 * Construct two new netlists by cutting the given box out of the original
 * netlist. Anything connected to the box on the cut side will be in the same
 * netlist. Replace any connections to the box with labels
 */
export const getNetlistSubsetsByBoxCut = (params: {
  netlist: InputNetlist
  boxId: string
}): [InputNetlist, InputNetlist] | null => {
  const { netlist, boxId } = params

  // TODO
  return null
}
