import type { InputNetlist } from "lib/input-types"
import { BaseSolver } from "./BaseSolver"
import type { CircuitBuilder } from "lib/builder"
import { TEMPLATE_FNS, TEMPLATE_FN_MAP } from "templates/index"
import { findBestMatch } from "lib/matching/findBestMatch"

/**
 * Find the best match template for a netlist
 */
export class SingleMatchSolver extends BaseSolver {
  inputNetlist: InputNetlist

  templates: Array<CircuitBuilder>

  outputBestMatchTemplate: CircuitBuilder | null = null

  constructor(opts: {
    inputNetlist: InputNetlist
  }) {
    super()
    this.inputNetlist = opts.inputNetlist
    this.templates = TEMPLATE_FNS.map((fn) => fn())
  }

  _step() {
    // TODO the single matcher should take the inputNetlist and compare it to
    // the templates (see templates/index.ts) then set the outputBestMatchTemplate
    this.outputBestMatchTemplate = findBestMatch(
      this.inputNetlist,
      this.templates,
    )
  }
}
