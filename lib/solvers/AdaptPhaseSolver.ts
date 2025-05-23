import type { InputNetlist } from "lib/input-types"
import type { CircuitBuilder } from "lib/builder"
import { BaseSolver } from "./BaseSolver"
import { adaptTemplateToTarget } from "lib/adapt/adaptTemplateToTarget"
import type { EditOperation } from "lib/adapt/EditOperation"

/**
 * Adapts matched templates to fit their target netlists by applying edit operations.
 */
export class AdaptPhaseSolver extends BaseSolver {
  matchedTemplates: Array<{
    template: CircuitBuilder
    netlist: InputNetlist
  }>

  currentTemplateIndex = 0

  outputAdaptedTemplates: Array<{
    template: CircuitBuilder
    netlist: InputNetlist
    appliedOperations: EditOperation[]
  }> = []

  constructor(opts: {
    matchedTemplates: Array<{
      template: CircuitBuilder
      netlist: InputNetlist
    }>
  }) {
    super()
    this.matchedTemplates = opts.matchedTemplates
  }

  _step() {
    if (this.currentTemplateIndex >= this.matchedTemplates.length) {
      this.solved = true
      return
    }

    const currentMatch = this.matchedTemplates[this.currentTemplateIndex]!

    // Clone the template to avoid mutating the original
    const templateClone = currentMatch.template.clone()

    // Adapt the template to match the target netlist
    const { appliedOperations } = adaptTemplateToTarget({
      template: templateClone,
      target: currentMatch.netlist,
    })

    this.outputAdaptedTemplates.push({
      template: templateClone,
      netlist: currentMatch.netlist,
      appliedOperations,
    })

    this.currentTemplateIndex++
  }
}
