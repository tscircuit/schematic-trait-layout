import type { InputNetlist } from "lib/input-types"
import { BaseSolver } from "./BaseSolver"
import { SingleMatchSolver } from "./SingleMatchSolver"
import type { CircuitBuilder } from "lib/builder"

/**
 * For each input netlist, find the best match template.
 */
export class MatchPhaseSolver extends BaseSolver {
  activeSubSolver?: SingleMatchSolver | null = null
  inputNetlists: InputNetlist[]
  currentInputNetlistIndex = 0

  matchedTemplates: Array<{
    template: CircuitBuilder
    netlist: InputNetlist
  }> = []

  constructor(opts: {
    inputNetlists: InputNetlist[]
  }) {
    super()
    this.inputNetlists = opts.inputNetlists
  }

  _step() {
    if (this.activeSubSolver) {
      this.activeSubSolver.step()
      if (this.activeSubSolver.solved) {
        this.currentInputNetlistIndex++
        this.activeSubSolver = null
      } else {
        return
      }
    }

    this.activeSubSolver = new SingleMatchSolver({
      inputNetlist: this.inputNetlists[this.currentInputNetlistIndex]!,
    })
  }
}
