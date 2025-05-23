import type { InputNetlist } from "lib/input-types"
import { BaseSolver } from "./BaseSolver"
import { AdaptSolver } from "./AdaptSolver"
import { MatchSolver } from "./MatchSolver"

type PipelineStep<T extends new (...args: any[]) => BaseSolver> = {
  solverName: string
  solverClass: T
  getConstructorParams: (
    instance: SchematicLayoutPipelineSolver,
  ) => ConstructorParameters<T>
  onSolved?: (instance: SchematicLayoutPipelineSolver) => void
}

function definePipelineStep<
  T extends new (
    ...args: any[]
  ) => BaseSolver,
  const P extends ConstructorParameters<T>,
>(
  solverName: keyof SchematicLayoutPipelineSolver,
  solverClass: T,
  getConstructorParams: (instance: SchematicLayoutPipelineSolver) => P,
  opts: {
    onSolved?: (instance: SchematicLayoutPipelineSolver) => void
  } = {},
): PipelineStep<T> {
  return {
    solverName,
    solverClass,
    getConstructorParams,
    onSolved: opts.onSolved,
  }
}

export class SchematicLayoutPipelineSolver extends BaseSolver {
  inputNetlist: InputNetlist

  matchSolver?: MatchSolver
  adaptSolver?: AdaptSolver

  startTimeOfPhase: Record<string, number> = {}
  endTimeOfPhase: Record<string, number> = {}
  timeSpentOnPhase: Record<string, number> = {}

  pipelineDef = [
    // TODO partition
    // TODO match
    definePipelineStep("matchSolver", MatchSolver, () => [], {
      onSolved: (pipeline) => {},
    }),
    definePipelineStep("adaptSolver", AdaptSolver, () => [], {
      onSolved: (pipeline) => {},
    }),
    // TODO adapt
    // TODO refine
    // TODO stitch
  ]

  constructor(opts: {
    inputNetlist: InputNetlist
  }) {
    super()
    this.inputNetlist = opts.inputNetlist
  }

  currentPipelineStepIndex = 0
  _step() {
    const pipelineStepDef = this.pipelineDef[this.currentPipelineStepIndex]
    if (!pipelineStepDef) {
      this.solved = true
      return
    }

    if (this.activeSubSolver) {
      this.activeSubSolver.step()
      if (this.activeSubSolver.solved) {
        this.endTimeOfPhase[pipelineStepDef.solverName] = performance.now()
        this.timeSpentOnPhase[pipelineStepDef.solverName] =
          this.endTimeOfPhase[pipelineStepDef.solverName]! -
          this.startTimeOfPhase[pipelineStepDef.solverName]!
        pipelineStepDef.onSolved?.(this)
        this.activeSubSolver = null
        this.currentPipelineStepIndex++
      } else if (this.activeSubSolver.failed) {
        this.error = this.activeSubSolver?.error
        this.failed = true
        this.activeSubSolver = null
      }
      return
    }

    const constructorParams = pipelineStepDef.getConstructorParams(this)
    // @ts-ignore
    this.activeSubSolver = new pipelineStepDef.solverClass(...constructorParams)
    ;(this as any)[pipelineStepDef.solverName] = this.activeSubSolver
    this.timeSpentOnPhase[pipelineStepDef.solverName] = 0
    this.startTimeOfPhase[pipelineStepDef.solverName] = performance.now()
  }
}
