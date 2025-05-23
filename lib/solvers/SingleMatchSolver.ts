import type { InputNetlist } from "lib/input-types"
import { BaseSolver } from "./BaseSolver"
import type { CircuitBuilder } from "lib/builder"

/**
 * Find the best match template for a netlist
 */
export class SingleMatchSolver extends BaseSolver {
  inputNetlist: InputNetlist

  outputBestMatchTemplate: CircuitBuilder | null = null

  constructor(opts: {
    inputNetlist: InputNetlist
  }) {
    super()
    this.inputNetlist = opts.inputNetlist
  }

  _step() {
    // TODO the single matcher should take the inputNetlist and compare it to
    // the templates (see templates/index.ts) then set the outputBestMatchTemplate
  }
}
