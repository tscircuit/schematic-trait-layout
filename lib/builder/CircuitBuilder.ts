import type { InputNetlist, Box, Net, Connection } from "../input-types"
import { getReadableNetlist } from "../netlist/getReadableNetlist"
import { bifurcateXCircuit } from "./bifurcateXCircuit"
import { ChipBuilder } from "./ChipBuilder"
import type { Line, NetLabel, ConnectionPoint, PortReference } from "./circuit-types"
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
    const c = new ChipBuilder(this, id, true)
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
        nb.connect(line.start.ref, line.end.ref)
      }
    }

    /* ------------------------------------------------------------------
     * d. Handle intersections / connectionPoints
     * ------------------------------------------------------------------ */

    // Helper to register a port under a coordinate key "x,y"
    const addToCoordMap = (
      map: Map<string, PortReference[]>,
      key: string,
      ref: PortReference,
    ) => {
      const arr = map.get(key) ?? []
      arr.push(ref)
      map.set(key, arr)
    }

    // Collect ports that share the same physical coordinate
    const portsByCoord = new Map<string, PortReference[]>()

    // 1. connectionPoints (added by .connect() / .intersect())
    for (const cp of this.connectionPoints) {
      addToCoordMap(portsByCoord, `${cp.x},${cp.y}`, cp.ref)
    }

    // We only want to auto-join things at coordinates that contain at least
    // one explicit ConnectionPoint (either .connect() or .intersect()).
    const coordsWithCP = new Set<string>()
    for (const cp of this.connectionPoints) {
      coordsWithCP.add(`${cp.x},${cp.y}`)
    }

    // 2. line end-points
    for (const line of this.lines) {
      addToCoordMap(portsByCoord, `${line.start.x},${line.start.y}`, line.start.ref)
      addToCoordMap(portsByCoord, `${line.end.x},${line.end.y}`, line.end.ref)
    }

    // 3. connect every pair of ports that sit on a coordinate that has a CP
    for (const [key, refs] of portsByCoord.entries()) {
      if (!coordsWithCP.has(key)) continue   // ← skip coords without CP
      for (let i = 0; i < refs.length; ++i) {
        for (let j = i + 1; j < refs.length; ++j) {
          nb.connect(refs[i]!, refs[j]!)
        }
      }
    }

    // 4. Handle .intersect() points that fall on the *body* of a line
    const isCoordOnSegment = (x: number, y: number, line: Line): boolean => {
      if (line.start.x === line.end.x) {
        // vertical
        if (x !== line.start.x) return false
        const yMin = Math.min(line.start.y, line.end.y)
        const yMax = Math.max(line.start.y, line.end.y)
        return y >= yMin && y <= yMax
      } else if (line.start.y === line.end.y) {
        // horizontal
        if (y !== line.start.y) return false
        const xMin = Math.min(line.start.x, line.end.x)
        const xMax = Math.max(line.start.x, line.end.x)
        return x >= xMin && x <= xMax
      }
      return false // (diagonals not supported)
    }

    for (const cp of this.connectionPoints) {
      for (const line of this.lines) {
        if (isCoordOnSegment(cp.x, cp.y, line)) {
          nb.connect(cp.ref, line.start.ref) // line.start.ref === line.end.ref
        }
      }
    }

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
