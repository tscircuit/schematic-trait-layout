import type { InputNetlist, Box, Net, Connection } from "../input-types"
import { getReadableNetlist } from "../netlist/getReadableNetlist"
import { bifurcateXCircuit } from "./bifurcateXCircuit"
import { ChipBuilder } from "./ChipBuilder"
import type { Line, NetLabel, ConnectionPoint } from "./circuit-types"
import { flipXCircuit } from "./flipCircuit"
import { getGridFromCircuit } from "./getGridFromCircuit"
import { NetlistBuilder } from "../netlist/NetlistBuilder"
import { isSamePortRef } from "./isSamePortRef"

export class CircuitBuilder {
  chips: ChipBuilder[] = []
  netLabels: NetLabel[] = []
  lines: Line[] = []
  connectionPoints: ConnectionPoint[] = []
  private autoLabelCounter = 1
  private _grid: any = null

  clone(): CircuitBuilder {
    // Deep copy via JSON serialization
    const json = JSON.stringify(this, (key, value) => {
      // Remove circular references
      if (key === "circuit") return undefined
      return value
    })
    const obj = JSON.parse(json)
    const clone = new CircuitBuilder()
    // Restore chips
    clone.chips = []
    for (const chip of obj.chips) {
      const chipBuilder = new ChipBuilder(clone, chip.chipId)
      chipBuilder.x = chip.x
      chipBuilder.y = chip.y
      chipBuilder.leftPins = []
      chipBuilder.rightPins = []
      chipBuilder.topPins = []
      chipBuilder.bottomPins = []
      chipBuilder.leftPinCount = chip.leftPinCount
      chipBuilder.rightPinCount = chip.rightPinCount
      chipBuilder.topPinCount = chip.topPinCount
      chipBuilder.bottomPinCount = chip.bottomPinCount
      // Pins will be rebuilt as needed
      clone.chips.push(chipBuilder)
    }
    clone.netLabels = JSON.parse(JSON.stringify(this.netLabels))
    clone.lines = JSON.parse(JSON.stringify(this.lines))
    clone.connectionPoints = JSON.parse(JSON.stringify(this.connectionPoints))
    clone.autoLabelCounter = this.autoLabelCounter
    return clone
  }

  bifurcateX(chipId: string): [CircuitBuilder, CircuitBuilder] {
    return bifurcateXCircuit(this, chipId)
  }

  chip(): ChipBuilder {
    const id = `chip${this.chips.length}`
    const c = new ChipBuilder(this, id)
    this.chips.push(c)
    return c
  }

  passive(): ChipBuilder {
    const id = `passive${this.chips.length}`
    const c = new ChipBuilder(this, id)
    this.chips.push(c)
    return c
  }

  toString(): string {
    return getGridFromCircuit(this).toString()
  }

  getNetlist(): InputNetlist {
    // a. NetlistBuilder
    const nb = new NetlistBuilder()
    // b. For every chip, push a Box
    for (const chip of this.chips) {
      nb.addBox({
        boxId: chip.chipId,
        leftPinCount: chip.leftPinCount || 0,
        rightPinCount: chip.rightPinCount || 0,
        topPinCount: chip.topPinCount || 0,
        bottomPinCount: chip.bottomPinCount || 0,
      })
    }
    // c. For every netLabel
    for (const label of this.netLabels) {
      nb.addNet({ netId: label.labelId })
      nb.connect(label.fromRef, { netId: label.labelId })
    }
    for (const line of this.lines) {
      if (!isSamePortRef(line.start.ref, line.end.ref)) {
        console.log("lineref", line.start.ref, line.end.ref)
        nb.connect(line.start.ref, line.end.ref)
      }
    }
    // d. Group connectionPoints by x,y
    // const groups: Record<string, ConnectionPoint[]> = {}
    // for (const cp of this.connectionPoints) {
    //   const key = `${cp.x},${cp.y}`
    //   if (!groups[key]) groups[key] = []
    //   groups[key].push(cp)
    // }
    // for (const group of Object.values(groups)) {
    //   for (let i = 0; i < group.length; ++i) {
    //     for (let j = i + 1; j < group.length; ++j) {
    //       nb.connect(group[i].ref, group[j].ref)
    //     }
    //   }
    // }
    // e. Return netlist
    return nb.getNetlist()
  }

  getReadableNetlist(): string {
    return getReadableNetlist(this.getNetlist())
  }

  flipX(): CircuitBuilder {
    return flipXCircuit(this)
  }

  generateAutoLabel(): string {
    return String(this.autoLabelCounter++)
  }

  getGrid(): any {
    if (!this._grid) {
      this._grid = getGridFromCircuit(this)
    }
    return this._grid
  }
}
