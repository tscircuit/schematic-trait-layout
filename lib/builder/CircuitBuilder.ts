import type { InputNetlist, Box, Net, Connection } from "../types"
import { getReadableNetlist } from "../netlist/getReadableNetlist"
import { bifurcateXCircuit } from "./bifurcateXCircuit"
import { ChipBuilder } from "./ChipBuilder"
import type { Line } from "./circuit-types"
import { flipXCircuit } from "./flipCircuit"
import { getGridFromCircuit } from "./getGridFromCircuit"

export class CircuitBuilder {
  chips: ChipBuilder[] = []
  lines: Line[] = []

  clone(): CircuitBuilder {
    // TODO: Implement clone method
  }

  bifurcateX(chipId: string): [CircuitBuilder, CircuitBuilder] {
    return bifurcateXCircuit(this, chipId)
  }

  chip(): any {
    // TODO: Implement chip method
    const newChip = new ChipBuilder(this, `chip${this.chips.length}`)
    this.chips.push(newChip)
    return newChip
  }

  toString(): string {
    return getGridFromCircuit(this).toString()
  }

  getNetlist(): InputNetlist {
    // Create the netlist and return it
  }

  getReadableNetlist(): string {
    return getReadableNetlist(this.getNetlist())
  }

  flipX(): CircuitBuilder {
    return flipXCircuit(this)
  }
}
