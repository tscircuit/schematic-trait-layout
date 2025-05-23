import type { InputNetlist } from "lib/input-types"
import { BaseSolver } from "./BaseSolver"

/**
 * Find the best match template for a netlist
 */
export class SingleMatchSolver extends BaseSolver {
  inputNetlist: InputNetlist

  constructor(opts: {
    inputNetlist: InputNetlist
  }) {
    super()
    this.inputNetlist = opts.inputNetlist
  }
}
