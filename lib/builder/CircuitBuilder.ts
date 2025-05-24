import type { InputNetlist, Box, Net, Connection } from "../input-types"
import { getReadableNetlist } from "../netlist/getReadableNetlist"
import { ChipBuilder } from "./ChipBuilder"
import { PinBuilder } from "./PinBuilder"
import type {
  Line,
  NetLabel,
  ConnectionPoint,
  PortReference,
} from "./circuit-types"
import { flipXCircuit } from "./flipCircuit"
import { getGridFromCircuit } from "./getGridFromCircuit"
import { NetlistBuilder } from "../netlist/NetlistBuilder"
import { isSamePortRef } from "./isSamePortRef"

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export class CircuitBuilder {
  chips: ChipBuilder[] = []
  netLabels: NetLabel[] = []
  lines: Line[] = []
  connectionPoints: ConnectionPoint[] = []

  public defaultChipWidth = 4
  public defaultPinSpacing = 0.2
  public defaultPassiveWidth = 1
  public defaultPassiveHeight = 0.2

  private autoLabelCounter = 1

  /* ------------------------------------------------------------------ *
   * Deep-clone without JSON.stringify (avoids cyclic-structure error)  *
   * ------------------------------------------------------------------ */
  clone(): CircuitBuilder {
    const clone = new CircuitBuilder()

    /* 1.  basic scalar state */
    clone.autoLabelCounter = this.autoLabelCounter

    /* 2.  chips ------------------------------------------------------- */
    for (const chip of this.chips) {
      const c = new ChipBuilder(clone, chip.chipId, chip.isPassive)

      // location and pin counts
      c.x = chip.x
      c.y = chip.y
      c.leftPinCount = chip.leftPinCount
      c.rightPinCount = chip.rightPinCount
      c.topPinCount = chip.topPinCount
      c.bottomPinCount = chip.bottomPinCount
      c.pinPositionsAreSet = chip.pinPositionsAreSet

      // Create proper PinBuilder objects for adaptation to work correctly
      const mkPins = (count: number, first: number, originalPins: any[]) =>
        Array.from({ length: count }, (_, i) => {
          const pb = new PinBuilder(c, first + i)
          // Copy coordinates from original pin if it exists
          const originalPin = originalPins[i]
          if (originalPin && typeof originalPin.x === "number") {
            pb.x = originalPin.x
          }
          if (originalPin && typeof originalPin.y === "number") {
            pb.y = originalPin.y
          }
          return pb
        })

      /* order must match original builder semantics                    */
      c.leftPins = mkPins(c.leftPinCount, 1, chip.leftPins)
      c.bottomPins = mkPins(
        c.bottomPinCount,
        c.leftPinCount + 1,
        chip.bottomPins,
      )
      c.rightPins = mkPins(
        c.rightPinCount,
        c.leftPinCount + c.bottomPinCount + 1,
        chip.rightPins,
      )
      c.topPins = mkPins(
        c.topPinCount,
        c.leftPinCount + c.bottomPinCount + c.rightPinCount + 1,
        chip.topPins,
      )

      clone.chips.push(c)
    }

    /* 3.  simple collections (no cycles inside) ---------------------- */
    clone.lines = structuredClone(this.lines)
    clone.netLabels = structuredClone(this.netLabels)
    clone.connectionPoints = structuredClone(this.connectionPoints)

    return clone
  }

  chip(id?: string): ChipBuilder {
    id ??= `U${this.chips.length + 1}`
    const c = new ChipBuilder(this, id)
    this.chips.push(c)
    return c
  }

  passive(): ChipBuilder {
    const id = `R${this.chips.length + 1}`
    const c = new ChipBuilder(this, id, true)
    this.chips.push(c)
    return c
  }

  toString(): string {
    return getGridFromCircuit(this, {
      chipLabels: true,
      showAxisLabels: true,
      gridScaleX: 2,
      gridScaleY: 5,
    }).toString()
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
      addToCoordMap(
        portsByCoord,
        `${line.start.x},${line.start.y}`,
        line.start.ref,
      )
      addToCoordMap(portsByCoord, `${line.end.x},${line.end.y}`, line.end.ref)
    }

    // 3. connect every pair of ports that sit on a coordinate that has a CP
    for (const [key, refs] of portsByCoord.entries()) {
      if (!coordsWithCP.has(key)) continue // ← skip coords without CP
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
    return (
      alphabet[this.autoLabelCounter++ - 1] ??
      `L${this.autoLabelCounter - alphabet.length}`
    )
  }

  getGrid(): any {
    return getGridFromCircuit(this)
  }
}
