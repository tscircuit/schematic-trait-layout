import type { InputNetlist, Side } from "./input-types"

/**
 * For a given box, create new boxes that are just the given side of the box and
 * all the connections or other boxes that are connected to that side.
 *
 * If two sides share a connection (maybe indirectly through other boxes) they
 * have to be in the same netlist
 */
export const getNetlistSubsetForSidesOfBox = (params: {
  netlist: InputNetlist
  boxId: string
}): InputNetlist[] => {
  const { netlist, boxId } = params

  // TODO

  return []
}
