import type {
  InputNetlist,
  Box,
  Connection,
  Net,
  PortReference,
} from "../input-types"
import Debug from "debug"
import { getReadableNetlist } from "./getReadableNetlist"

const debug = Debug("mash")

type Edge = "left" | "right" | "up" | "down"

// Interfaces for storing and restoring pin state for mark/fromMark
interface BoxPinLayoutEntry {
  side: Side
  count: number
  startGlobalPin: number
}

interface PinConnectionState {
  x: number
  y: number
  lastConnected: PortReference | null
  lastDx: number
  lastDy: number
}

interface StoredMarkData {
  pinBuilder: PinBuilder
  state: PinConnectionState
}

const EDGE_MASKS: Record<Edge, number> = {
  left: 1,
  right: 2,
  up: 4,
  down: 8,
}

function glyph(mask: number): string {
  switch (mask) {
    case 0:
      return " "
    case EDGE_MASKS.left:
    case EDGE_MASKS.right:
      return "─"
    case EDGE_MASKS.up:
    case EDGE_MASKS.down:
      return "│"
    case EDGE_MASKS.left | EDGE_MASKS.right:
      return "─"
    case EDGE_MASKS.up | EDGE_MASKS.down:
      return "│"
    case EDGE_MASKS.left | EDGE_MASKS.up:
      return "┘"
    case EDGE_MASKS.left | EDGE_MASKS.down:
      return "┐"
    case EDGE_MASKS.right | EDGE_MASKS.up:
      return "└"
    case EDGE_MASKS.right | EDGE_MASKS.down:
      return "┌"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up:
      return "┴"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.down:
      return "┬"
    case EDGE_MASKS.left | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┤"
    case EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "├"
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┼"
    default:
      return " "
  }
}

/** 2‑D sparse grid – we keep it sparse so diagrams can grow in any direction */
class Grid {
  traces = new Map<string, number>() // key "x,y" → Edge mask
  overlay = new Map<string, string>() // key "x,y" → literal char

  addEdge(x: number, y: number, edge: Edge): void {
    const key = `${x},${y}`
    const maskValue = EDGE_MASKS[edge]
    this.traces.set(key, (this.traces.get(key) ?? 0) | maskValue)
  }

  putOverlay(x: number, y: number, ch: string): void {
    this.overlay.set(`${x},${y}`, ch)
  }

  *coords(): IterableIterator<[number, number]> {
    const seen = new Set<string>()
    for (const key of this.traces.keys()) seen.add(key)
    for (const key of this.overlay.keys()) seen.add(key)
    for (const key of seen) {
      const [xs, ys] = key.split(",")
      yield [Number(xs), Number(ys)]
    }
  }

  toString(): string {
    if (this.traces.size === 0 && this.overlay.size === 0) return ""

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const [x, y] of this.coords()) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const rows: string[] = []
    for (let y = maxY; y >= minY; y--) {
      let row = ""
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`
        const over = this.overlay.get(key)
        const trace = this.traces.get(key) ?? 0
        row += over ?? glyph(trace)
      }
      rows.push(row.replace(/ +$/g, ""))
    }
    return rows.join("\n")
  }
}

/********************  PUBLIC BUILDER API *************************************/

/***** CircuitBuilder *********************************************************/
export class CircuitBuilder {
  readonly grid = new Grid()
  readonly coordinateToNetItem = new Map<string, PortReference>()
  private readonly boxPinLayouts: Record<string, Array<BoxPinLayoutEntry>> = {}
  private readonly chipOrigins = new Map<string, { x: number; y: number }>()

  private nextChipIndex = 0
  nextPassiveId = 1
  nextLabelId = 1

  readonly netlistComponents: {
    boxes: Box[]
    nets: Net[]
    connections: Connection[]
  } = { boxes: [], nets: [], connections: [] }

  // --- CLONE: deep but shallow-array/map copy ---
  private _clone(): CircuitBuilder {
    const copy = circuit()

    // numeric counters
    copy.nextPassiveId = this.nextPassiveId
    copy.nextLabelId = this.nextLabelId
    ;(copy as any).nextChipIndex = (this as any).nextChipIndex

    // chip origins
    for (const [k, v] of this.chipOrigins) copy.chipOrigins.set(k, { ...v })

    // pin-layout table
    for (const [k, v] of Object.entries(this.boxPinLayouts))
      copy.boxPinLayouts[k] = v.map((e) => ({ ...e }))

    // grid
    for (const [k, m] of this.grid.traces) copy.grid.traces.set(k, m)
    for (const [k, c] of this.grid.overlay) copy.grid.overlay.set(k, c)

    // coordinate → port map
    for (const [k, r] of this.coordinateToNetItem)
      copy.coordinateToNetItem.set(k, { ...r })

    // netlist
    copy.netlistComponents.boxes = JSON.parse(
      JSON.stringify(this.netlistComponents.boxes),
    )
    copy.netlistComponents.nets = JSON.parse(
      JSON.stringify(this.netlistComponents.nets),
    )
    copy.netlistComponents.connections = JSON.parse(
      JSON.stringify(this.netlistComponents.connections),
    )

    return copy
  }

  // --- PRUNE CHIP SIDE: used by bifurcateX ---
  private _pruneChipSide(
    chipId: string,
    builder: CircuitBuilder,
    removeLeftSide: boolean, // true ↦ delete left pins, keep right pins
  ): void {
    const box = builder.netlistComponents.boxes.find((b) => b.boxId === chipId)!
    const leftCnt = box.leftPinCount
    const rightCnt = box.rightPinCount

    const pinsToRemove = new Set<number>()
    const pinsToKeep: number[] = []

    // decide which global pin numbers disappear / survive
    for (let i = 1; i <= leftCnt + rightCnt; i++) {
      const isLeft = i <= leftCnt
      if ((isLeft && removeLeftSide) || (!isLeft && !removeLeftSide))
        pinsToRemove.add(i)
      else pinsToKeep.push(i)
    }

    // new contiguous pin numbers for the kept ones
    const old2new: Record<number, number> = {}
    pinsToKeep.forEach((old, idx) => {
      old2new[old] = idx + 1
    })

    /* ── update chip box ─────────────────────────────── */
    if (removeLeftSide) {
      box.leftPinCount = 0
      box.rightPinCount = pinsToKeep.length
    } else {
      box.rightPinCount = 0
      box.leftPinCount = pinsToKeep.length
    }

    /* ── boxPinLayouts table ─────────────────────────── */
    builder.boxPinLayouts[chipId] = builder.boxPinLayouts[chipId]
      .filter((e) => (e.side === "left") !== removeLeftSide) // keep wanted side(s)
      .map((e) => ({
        ...e,
        startGlobalPin: old2new[e.startGlobalPin], // shift numbering
      }))

    /* ── coordinate-to-net items, grid & overlay ─────── */
    for (const [coord, ref] of [...builder.coordinateToNetItem]) {
      if ("boxId" in ref && ref.boxId === chipId) {
        if (pinsToRemove.has(ref.pinNumber)) {
          builder.coordinateToNetItem.delete(coord)
          builder.grid.traces.delete(coord)
          builder.grid.overlay.delete(coord)
        } else {
          ref.pinNumber = old2new[ref.pinNumber]
        }
      }
    }
    // numeric labels printed inside the body
    for (const [coord, ch] of [...builder.grid.overlay]) {
      if (/^\d+$/.test(ch)) {
        const n = Number(ch)
        if (pinsToRemove.has(n)) builder.grid.overlay.delete(coord)
        else if (old2new[n] && old2new[n] !== n)
          builder.grid.overlay.set(coord, String(old2new[n]))
      }
    }

    /* ── connections / nets  ─────────────────────────── */
    for (const conn of [...builder.netlistComponents.connections]) {
      conn.connectedPorts = conn.connectedPorts
        .filter(
          (p) =>
            !(
              "boxId" in p &&
              p.boxId === chipId &&
              pinsToRemove.has(p.pinNumber)
            ),
        )
        .map((p) => {
          if ("boxId" in p && p.boxId === chipId)
            return { ...p, pinNumber: old2new[p.pinNumber] }
          return p
        }) as any

      if (conn.connectedPorts.length < 2)
        builder.netlistComponents.connections =
          builder.netlistComponents.connections.filter((c) => c !== conn)
    }

    // drop orphan nets + their geometry
    const liveNets = new Set<string>()
    for (const c of builder.netlistComponents.connections)
      for (const p of c.connectedPorts) if ("netId" in p) liveNets.add(p.netId)

    builder.netlistComponents.nets = builder.netlistComponents.nets.filter(
      (n) => liveNets.has(n.netId),
    )

    for (const [coord, ref] of [...builder.coordinateToNetItem])
      if ("netId" in ref && !liveNets.has(ref.netId)) {
        builder.coordinateToNetItem.delete(coord)
        builder.grid.traces.delete(coord)
        builder.grid.overlay.delete(coord)
      }

    // finally keep only what is still connected to the preserved pins
    builder._retainReachableFromChip(chipId)

    // --- Redraw the chip body for the pruned chip ---
    const chipBoxData = builder.netlistComponents.boxes.find(
      (b) => b.boxId === chipId,
    )!
    const origin = builder.chipOrigins.get(chipId) ?? { x: 0, y: 0 }

    const currentPinCounts = {
      left: chipBoxData.leftPinCount,
      right: chipBoxData.rightPinCount,
      top: chipBoxData.topPinCount,
      bottom: chipBoxData.bottomPinCount,
    }
    const { bodyWidth, bodyHeight } =
      builder._calculateChipVisualDimensions(currentPinCounts)

    builder._drawChipOutlineAndPinNumbers(
      chipId,
      origin.x,
      origin.y,
      bodyWidth,
      bodyHeight,
      currentPinCounts,
      builder.boxPinLayouts[chipId] || [],
      builder.grid, // Pass the grid explicitly
    )
  }

  private _calculateChipVisualDimensions(pinCounts: {
    left: number
    right: number
    top: number
    bottom: number
  }): { bodyWidth: number; bodyHeight: number } {
    const maxH = Math.max(pinCounts.top, pinCounts.bottom, 0)
    const maxV = Math.max(pinCounts.left, pinCounts.right, 0)
    // Ensure minimum dimensions for the chip body
    const bodyWidth = Math.max(5, maxH === 0 ? 1 : maxH + 2)
    const bodyHeight = Math.max(3, maxV === 0 ? 1 : maxV + 2)
    return { bodyWidth, bodyHeight }
  }

  private _drawChipOutlineAndPinNumbers(
    chipId: string,
    originX: number,
    originY: number,
    bodyWidth: number,
    bodyHeight: number,
    pinCounts: { left: number; right: number; top: number; bottom: number },
    boxLayout: ReadonlyArray<BoxPinLayoutEntry>,
    targetGrid: Grid, // Accept Grid as a parameter
  ): void {
    const W = bodyWidth
    const H = bodyHeight
    const ox = originX
    const oy = originY
    const bodyItem: PortReference | null = null // Body segments are not net items

    const seg = (x0: number, y0: number, x1: number, y1: number) =>
      this.drawOrthogonalSegmentOnGrid(
        ox + x0,
        oy + y0,
        ox + x1,
        oy + y1,
        bodyItem,
        targetGrid,
      )

    if (W === 1 && H === 1) {
      targetGrid.putOverlay(ox, oy, "+")
    } else if (W === 1) {
      seg(0, 0, 0, H - 1)
    } else if (H === 1) {
      seg(0, 0, W - 1, 0)
    } else {
      seg(0, 0, W - 1, 0) // Bottom edge
      seg(0, H - 1, W - 1, H - 1) // Top edge
      seg(0, 0, 0, H - 1) // Left edge
      seg(W - 1, 0, W - 1, H - 1) // Right edge
    }

    // Draw pin numbers inside body
    const pinSideIndices: Record<Side, number> = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }

    const sortedBoxLayout = [...boxLayout].sort((a, b) => {
      const sideAIndex = SIDES_CCW.indexOf(a.side)
      const sideBIndex = SIDES_CCW.indexOf(b.side)
      if (sideAIndex !== sideBIndex) return sideAIndex - sideBIndex
      return a.startGlobalPin - b.startGlobalPin
    })

    for (const layoutEntry of sortedBoxLayout) {
      const { side, count, startGlobalPin } = layoutEntry
      for (let k = 0; k < count; k++) {
        const globalPinNum = startGlobalPin + k
        const sideIndex = pinSideIndices[side]++

        let pinX = 0
        let pinY = 0
        switch (side) {
          case "left":
            pinX = ox
            pinY = oy + H - 1 - (1 + sideIndex)
            break
          case "bottom": // Pins are along the bottom edge (y=oy), numbers inside (y=oy+1)
            pinX = ox + 1 + sideIndex
            pinY = oy
            break
          case "right":
            pinX = ox + W - 1
            pinY = oy + 1 + sideIndex
            break
          case "top": // Pins are along the top edge (y=oy+H-1), numbers inside (y=oy+H-2)
            pinX = ox + 1 + sideIndex
            pinY = oy + H - 1
            break
        }

        const label = String(globalPinNum)
        let lx = 0
        let ly = 0
        switch (side) {
          case "left":
            lx = pinX + 1
            ly = pinY
            break
          case "right":
            lx = pinX - 1
            ly = pinY
            break
          case "top":
            lx = pinX
            ly = pinY - 1
            break
          case "bottom":
            lx = pinX
            ly = pinY + 1
            break
        }
        targetGrid.putOverlay(lx, ly, label)
      }
    }
  }

  /**
   * Split the circuit into two independent circuits along a vertical
   * axis through the specified chip.  The first element of the tuple
   * keeps the chip's left-hand pins, the second keeps its right-hand pins.
   */
  bifurcateX(chipId: string): [CircuitBuilder, CircuitBuilder] {
    const left = this._clone()
    const right = this._clone()

    // remove right-hand pins from the “left” clone
    this._pruneChipSide(chipId, left, false /* keep-left */)

    // remove left-hand pins (and renumber) in the “right” clone
    this._pruneChipSide(chipId, right, true /* keep-right */)

    return [left, right]
  }

  // ── Keep only the part of the circuit that is electrically reachable
  //    from the still-present pins of the chosen chip ─────────────────────
  private _retainReachableFromChip(chipId: string): void {
    const portKey = (p: PortReference): string =>
      "boxId" in p ? `b:${p.boxId}:${p.pinNumber}` : `n:${p.netId}`

    /* 1 – seed the search with every remaining pin of the chip */
    const chipBox = this.netlistComponents.boxes.find(
      (b) => b.boxId === chipId,
    )!
    const totalPins =
      chipBox.leftPinCount +
      chipBox.rightPinCount +
      chipBox.topPinCount +
      chipBox.bottomPinCount
    const queue: PortReference[] = []
    const visited = new Set<string>()
    for (let i = 1; i <= totalPins; i++) {
      const p: PortReference = { boxId: chipId, pinNumber: i }
      visited.add(portKey(p))
      queue.push(p)
    }

    /* 2 – breadth-first walk over the connection graph */
    while (queue.length) {
      const current = queue.pop()!
      for (const conn of this.netlistComponents.connections) {
        if (
          !conn.connectedPorts.some(
            (cp) => portKey(cp as PortReference) === portKey(current),
          )
        )
          continue
        for (const cp of conn.connectedPorts as PortReference[]) {
          const k = portKey(cp)
          if (!visited.has(k)) {
            visited.add(k)
            queue.push(cp)
          }
        }
      }
    }

    const keepBoxes = new Set<string>()
    const keepNets = new Set<string>()
    for (const k of visited)
      k.startsWith("b:")
        ? keepBoxes.add(k.split(":")[1]!)
        : keepNets.add(k.split(":")[1]!)

    /* 3 – prune every structure that is not reachable */
    this.netlistComponents.connections = this.netlistComponents.connections
      .map((c) => ({
        connectedPorts: c.connectedPorts.filter((p) =>
          visited.has(portKey(p as PortReference)),
        ),
      }))
      .filter((c) => c.connectedPorts.length >= 2)

    this.netlistComponents.boxes = this.netlistComponents.boxes.filter((b) =>
      keepBoxes.has(b.boxId),
    )

    this.netlistComponents.nets = this.netlistComponents.nets.filter((n) =>
      keepNets.has(n.netId),
    )

    for (const id of Object.keys(this.boxPinLayouts))
      if (!keepBoxes.has(id)) delete this.boxPinLayouts[id]

    for (const [coord, ref] of [...this.coordinateToNetItem])
      if (!visited.has(portKey(ref))) {
        this.coordinateToNetItem.delete(coord)
        this.grid.traces.delete(coord)
        this.grid.overlay.delete(coord)
      }
  }

  /** Create a new chip inside the circuit. You can later move it with `.at()` */
  chip(): ChipBuilder {
    const chipId = `chip${this.nextChipIndex++}`
    this.chipOrigins.set(chipId, { x: 0, y: 0 }) // Default origin
    const chip = new ChipBuilder(this, chipId)
    this.netlistComponents.boxes.push({
      boxId: chipId,
      leftPinCount: 0,
      rightPinCount: 0,
      topPinCount: 0,
      bottomPinCount: 0,
    })
    return chip
  }

  /** Records the pin layout for a given box, called by ChipBuilder. */
  recordBoxPinLayout(
    chipId: string,
    side: Side,
    count: number,
    startGlobalPin: number,
  ): void {
    if (!this.boxPinLayouts[chipId]) {
      this.boxPinLayouts[chipId] = []
    }
    this.boxPinLayouts[chipId].push({ side, count, startGlobalPin })
  }

  // ── Grid‑level helpers (ex‑ChipBuilder methods) ──────────────────────────

  addEdge(x: number, y: number, edge: Edge): void {
    this.grid.addEdge(x, y, edge)
  }

  putOverlay(x: number, y: number, ch: string): void {
    this.grid.putOverlay(x, y, ch)
  }

  associateCoordinateWithNetItem(
    x: number,
    y: number,
    item: PortReference | null,
  ): void {
    if (!item) return
    const key = `${x},${y}`
    if (!this.coordinateToNetItem.has(key)) {
      this.coordinateToNetItem.set(key, item)
    }
  }

  // ── Netlist helpers (moved verbatim from old ChipBuilder) ─────────────────

  private areSamePortRef(a: PortReference, b: PortReference): boolean {
    if ("boxId" in a && "boxId" in b)
      return a.boxId === b.boxId && a.pinNumber === b.pinNumber
    if ("netId" in a && "netId" in b) return a.netId === b.netId
    return false
  }

  private isPortInConnection(item: PortReference, conn: Connection): boolean {
    return conn.connectedPorts.some((p) =>
      this.areSamePortRef(item, p as PortReference),
    )
  }

  private findConnectionContaining(
    item: PortReference,
  ): Connection | undefined {
    return this.netlistComponents.connections.find((c) =>
      this.isPortInConnection(item, c),
    )
  }

  connectItems(a: PortReference | null, b: PortReference | null): void {
    if (!a || !b || this.areSamePortRef(a, b)) return
    const ca = this.findConnectionContaining(a)
    const cb = this.findConnectionContaining(b)
    if (ca && cb && ca !== cb) {
      // merge
      for (const p of cb.connectedPorts)
        if (!this.isPortInConnection(p as PortReference, ca))
          ca.connectedPorts.push(p as PortReference)
      this.netlistComponents.connections =
        this.netlistComponents.connections.filter((x) => x !== cb)
    } else if (ca) {
      if (!this.isPortInConnection(b, ca)) ca.connectedPorts.push(b)
    } else if (cb) {
      if (!this.isPortInConnection(a, cb)) cb.connectedPorts.push(a)
    } else {
      this.netlistComponents.connections.push({ connectedPorts: [a, b] })
    }
  }

  /** Draw a straight H/V segment and record net identity. */
  drawOrthogonalSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    item: PortReference | null,
    targetGrid?: Grid, // Optional: specify which grid to draw on
  ): void {
    const gridToUse = targetGrid ?? this.grid
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)
    let x = x0
    let y = y0
    // Association with net item should still use the main circuit's map
    this.associateCoordinateWithNetItem(x, y, item)
    while (x !== x1 || y !== y1) {
      const nx = x + dx
      const ny = y + dy
      if (dx !== 0) {
        if (dx > 0) {
          gridToUse.addEdge(x, y, "right")
          gridToUse.addEdge(nx, ny, "left")
        } else {
          gridToUse.addEdge(x, y, "left")
          gridToUse.addEdge(nx, ny, "right")
        }
      } else if (dy !== 0) {
        if (dy > 0) {
          gridToUse.addEdge(x, y, "up")
          gridToUse.addEdge(nx, ny, "down")
        } else {
          gridToUse.addEdge(x, y, "down")
          gridToUse.addEdge(nx, ny, "up")
        }
      }
      x = nx
      y = ny
      this.associateCoordinateWithNetItem(x, y, item)
    }
  }

  /** Draw orthogonal segment on a specific grid. Helper for _drawChipOutlineAndPinNumbers */
  private drawOrthogonalSegmentOnGrid(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    item: PortReference | null,
    grid: Grid,
  ): void {
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)
    let x = x0
    let y = y0
    // For body drawing, we don't associate with net items here,
    // but if this were for general use, it might need more thought.
    // this.associateCoordinateWithNetItem(x, y, item) // Potentially skip for body
    while (x !== x1 || y !== y1) {
      const nx = x + dx
      const ny = y + dy
      if (dx !== 0) {
        if (dx > 0) {
          grid.addEdge(x, y, "right")
          grid.addEdge(nx, ny, "left")
        } else {
          grid.addEdge(x, y, "left")
          grid.addEdge(nx, ny, "right")
        }
      } else if (dy !== 0) {
        if (dy > 0) {
          grid.addEdge(x, y, "up")
          grid.addEdge(nx, ny, "down")
        } else {
          grid.addEdge(x, y, "down")
          grid.addEdge(nx, ny, "up")
        }
      }
      x = nx
      y = ny
      // this.associateCoordinateWithNetItem(x, y, item) // Potentially skip for body
    }
  }

  /** String representation of the whole circuit */
  toString(): string {
    return this.grid.toString()
  }

  /** Final netlist (deep‑copied) */
  getNetlist(): InputNetlist {
    return structuredClone(this.netlistComponents)
  }

  getReadableNetlist(): string {
    return getReadableNetlist(this.getNetlist())
  }

  /** Flips the circuit horizontally (X-axis inversion). Modifies the instance in place. */
  flipX(): void {
    const pinMapsByBoxId: Record<string, Record<number, number>> = {}

    // 1. Flip Netlist Boxes and Create Pin Mappings
    for (const box of this.netlistComponents.boxes) {
      const layout = this.boxPinLayouts[box.boxId]
      if (!layout) {
        // This should not happen if recordBoxPinLayout is called correctly
        // console.warn(`No pin layout found for box ${box.boxId} during flipX`)
        // Swap counts anyway, but pin remapping will be identity
        const tempLeft = box.leftPinCount
        box.leftPinCount = box.rightPinCount
        box.rightPinCount = tempLeft
        continue
      }

      const currentPinMap: Record<number, number> = {}
      let newGlobalPinCounter = 1

      for (const targetSide of SIDES_CCW) {
        const originalSideIsNowTarget =
          targetSide === "left"
            ? "right"
            : targetSide === "right"
              ? "left"
              : targetSide

        for (const entry of layout) {
          if (entry.side === originalSideIsNowTarget) {
            for (let i = entry.count - 1; i >= 0; i--) {
              const oldPin = entry.startGlobalPin + i
              const newPin = newGlobalPinCounter
              currentPinMap[oldPin] = newPin
              newGlobalPinCounter++
            }
          }
        }
      }
      pinMapsByBoxId[box.boxId] = currentPinMap

      const tempLeft = box.leftPinCount
      box.leftPinCount = box.rightPinCount
      box.rightPinCount = tempLeft
    }

    // 2. Flip Netlist Connections
    for (const connection of this.netlistComponents.connections) {
      for (const port of connection.connectedPorts) {
        if ("boxId" in port && pinMapsByBoxId[port.boxId]) {
          const oldPinNumber = port.pinNumber
          const newPinNumber = pinMapsByBoxId[port.boxId]![oldPinNumber]
          if (newPinNumber !== undefined) {
            port.pinNumber = newPinNumber
            // TODO Update the overlay with the new pin number
          } else {
            // This might happen if a pin number in a connection is out of bounds
            // or if layout recording was incomplete.
            console.warn(
              `Could not map old pin ${oldPinNumber} for box ${port.boxId} during flipX`,
            )
          }
        }
      }
    }

    // 3. Flip Grid
    const newTraces = new Map<string, number>()
    for (const [key, mask] of this.grid.traces) {
      const [xStr, yStr] = key.split(",")
      const x = Number(xStr)
      const y = Number(yStr)
      const newX = -x
      let newMask = 0
      if (mask & EDGE_MASKS.left) newMask |= EDGE_MASKS.right
      if (mask & EDGE_MASKS.right) newMask |= EDGE_MASKS.left
      if (mask & EDGE_MASKS.up) newMask |= EDGE_MASKS.up
      if (mask & EDGE_MASKS.down) newMask |= EDGE_MASKS.down
      newTraces.set(`${newX},${y}`, newMask)
    }
    ;(this.grid as any).traces = newTraces

    const newOverlay = new Map<string, string>()
    for (const [key, char] of this.grid.overlay) {
      const [xStr, yStr] = key.split(",")
      const x = Number(xStr)
      const y = Number(yStr)
      const newX = -x
      newOverlay.set(`${newX},${y}`, char)
    }
    ;(this.grid as any).overlay = newOverlay

    // 4. Flip coordinateToNetItem
    const newCoordToNetItem = new Map<string, PortReference>()
    for (const [key, portRef] of this.coordinateToNetItem) {
      const [xStr, yStr] = key.split(",")
      const x = Number(xStr)
      const y = Number(yStr)
      const newX = -x

      newCoordToNetItem.set(`${newX},${y}`, { ...portRef })
    }

    this.coordinateToNetItem.clear()
    for (const [k, v] of newCoordToNetItem) {
      this.coordinateToNetItem.set(k, v)
    }

    // 5. Refresh numeric pin-labels in the overlay
    for (const [coordKey, portRef] of this.coordinateToNetItem) {
      if ("boxId" in portRef && pinMapsByBoxId[portRef.boxId]) {
        const [xs, ys] = coordKey.split(",")
        const x = Number(xs)
        const y = Number(ys)
        const newLabel = String(portRef.pinNumber)

        // The printed number is always one step toward the chip body
        const neighbors: Array<[number, number]> = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]

        for (const [dx, dy] of neighbors) {
          const key = `${x + dx},${y + dy}`
          const existing = this.grid.overlay.get(key)
          if (existing !== undefined && /^\d+$/.test(existing)) {
            this.grid.overlay.set(key, newLabel)
            break // only one label per pin
          }
        }
      }
    }
  }
}

// Moved Side and SIDES_CCW to module scope for broader use
const SIDES_CCW = ["left", "bottom", "right", "top"] as const
type Side = (typeof SIDES_CCW)[number]

/***** ChipBuilder ************************************************************/
export class ChipBuilder {
  /* Public counters (pin access, marks) */
  readonly pinMap: Record<`${Side}${number}`, PinBuilder> = {} as any
  readonly pinBuilders: PinBuilder[] = []

  /* Placement */
  private originX = 0
  private originY = 0

  /* Pin counts & body size */
  pinCounts: Record<Side, number> = { left: 0, right: 0, top: 0, bottom: 0 }
  bodyWidth = 0
  bodyHeight = 0
  private bodyComputed = false

  /* helpers */
  private _currentGlobalPin = 0
  private readonly marked = new Map<string, StoredMarkData>()

  constructor(
    private readonly circuit: CircuitBuilder,
    readonly chipId: string,
  ) {}

  /** Optional: place the chip's bottom‑left corner at absolute (x,y). */
  at(x: number, y: number): this {
    this.originX = x
    this.originY = y
    // biome-ignore lint/complexity/useLiteralKeys: Accessing private member of CircuitBuilder
    this.circuit["chipOrigins"].set(this.chipId, { x, y })
    return this
  }

  /* Pin declaration helpers */
  leftpins(n: number): this {
    this.pinCounts.left = n
    this.allocatePins("left", n)
    return this
  }
  rightpins(n: number): this {
    this.pinCounts.right = n
    this.allocatePins("right", n)
    return this
  }
  toppins(n: number): this {
    this.pinCounts.top = n
    this.allocatePins("top", n)
    return this
  }
  bottompins(n: number): this {
    this.pinCounts.bottom = n
    this.allocatePins("bottom", n)
    return this
  }

  private allocatePins(side: Side, count: number): void {
    // Record layout with the circuit builder before pins are actually created
    // _currentGlobalPin is the count of pins allocated *before* this call for this chip.
    // So, the first pin in this group will be _currentGlobalPin + 1.
    this.circuit.recordBoxPinLayout(
      this.chipId,
      side,
      count,
      this._currentGlobalPin + 1,
    )

    for (let i = 0; i < count; i++) {
      this._currentGlobalPin++
      const globalNum = this._currentGlobalPin // 1‑indexed
      const pin = new PinBuilder(this, globalNum)
      this.pinBuilders.push(pin)
      this.pinMap[`${side}${i + 1}`] = pin
    }
  }

  /* Build body once pins are known */
  private computeBody(): void {
    if (this.bodyComputed) return
    const maxH = Math.max(this.pinCounts.top, this.pinCounts.bottom, 0)
    const maxV = Math.max(this.pinCounts.left, this.pinCounts.right, 0)
    this.bodyWidth = Math.max(5, maxH === 0 ? 1 : maxH + 2)
    this.bodyHeight = Math.max(3, maxV === 0 ? 1 : maxV + 2)

    // Set absolute pin coordinates
    for (const side of SIDES_CCW) {
      const cnt = this.pinCounts[side]
      for (let i = 0; i < cnt; i++) {
        const pin = this.pinMap[`${side}${i + 1}`]!
        switch (side) {
          case "left":
            pin.x = this.originX
            pin.y = this.originY + this.bodyHeight - 1 - (1 + i)
            break
          case "bottom":
            pin.x = this.originX + 1 + i
            pin.y = this.originY + this.bodyHeight - 1
            break
          case "right":
            pin.x = this.originX + this.bodyWidth - 1
            pin.y = this.originY + (1 + i)
            break
          case "top":
            pin.x = this.originX + 1 + i
            pin.y = this.originY
            break
        }
      }
    }

    this.drawBody()
    this.bodyComputed = true

    // Update pin counts in netlist box entry
    const box = this.circuit.netlistComponents.boxes.find(
      (b) => b.boxId === this.chipId,
    )!
    box.leftPinCount = this.pinCounts.left
    box.rightPinCount = this.pinCounts.right
    box.topPinCount = this.pinCounts.top
    box.bottomPinCount = this.pinCounts.bottom
  }

  private drawBody(): void {
    const { originX: ox, originY: oy, bodyWidth: W, bodyHeight: H } = this
    // bodyItem is null for chip body segments
    const bodyItem: PortReference | null = null

    // Use the main circuit's grid for drawing the initial chip body
    const targetGrid = this.circuit.grid

    const seg = (x0: number, y0: number, x1: number, y1: number) =>
      // biome-ignore lint/complexity/useLiteralKeys: Accessing private member
      this.circuit["drawOrthogonalSegmentOnGrid"](
        ox + x0,
        oy + y0,
        ox + x1,
        oy + y1,
        bodyItem,
        targetGrid,
      )

    if (W === 1 && H === 1) {
      targetGrid.putOverlay(ox, oy, "+")
      return
    }
    if (W === 1) {
      seg(0, 0, 0, H - 1)
      return
    }
    if (H === 1) {
      seg(0, 0, W - 1, 0)
      return
    }

    seg(0, 0, W - 1, 0)
    seg(0, H - 1, W - 1, H - 1)
    seg(0, 0, 0, H - 1)
    seg(W - 1, 0, W - 1, H - 1)

    // Draw pin numbers inside body
    for (const side of SIDES_CCW) {
      const cnt = this.pinCounts[side]
      for (let i = 0; i < cnt; i++) {
        const pin = this.pinMap[`${side}${i + 1}`]!
        const label = String(pin.pinNumber)
        let lx = 0
        let ly = 0
        switch (side) {
          case "left":
            lx = pin.x + 1
            ly = pin.y
            break
          case "right":
            lx = pin.x - 1
            ly = pin.y
            break
          case "top":
            lx = pin.x
            ly = pin.y + 1
            break
          case "bottom":
            lx = pin.x
            ly = pin.y - 1 // Grid Y is up, H-1 is top, so label is "below" pin on grid
            break
          case "bottom":
            lx = pin.x
            ly = pin.y + 1 // Grid Y is up, 0 is bottom, so label is "above" pin on grid
            break
        }
        targetGrid.putOverlay(lx, ly, label)
      }
    }
  }

  /** Access pin by global number (1‑indexed) */
  pin(n: number): PinBuilder {
    this.computeBody()
    const p = this.pinBuilders[n - 1]!
    p.resetConnectionPoint()
    return p
  }

  /** Mark & retrieve */
  fromMark(name: string): PinBuilder {
    const storedData = this.marked.get(name)
    if (!storedData) throw new Error(`Mark "${name}" not found`)

    const { pinBuilder, state } = storedData
    pinBuilder.applyMarkableState(state)
    return pinBuilder
  }

  addMark(name: string, p: PinBuilder): void {
    this.marked.set(name, {
      pinBuilder: p,
      state: p.getMarkableState(),
    })
  }
}

/***** PinBuilder *************************************************************/
export class PinBuilder {
  /* location (absolute coords inside circuit grid) */
  x = 0
  y = 0

  private lastConnected: PortReference | null = null
  private lastDx = 0
  private lastDy = 0

  constructor(
    private readonly chip: ChipBuilder,
    public readonly pinNumber: number,
  ) {}

  private get circuit(): CircuitBuilder {
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    return this.chip["circuit"]
  }

  resetConnectionPoint(): void {
    this.lastConnected = { boxId: this.chip.chipId, pinNumber: this.pinNumber }
    this.circuit.associateCoordinateWithNetItem(
      this.x,
      this.y,
      this.lastConnected,
    )
  }

  line(dx: number, dy: number): this {
    if (dx !== 0 && dy !== 0)
      throw new Error("Only orthogonal segments allowed")
    const x0 = this.x
    const y0 = this.y
    this.x += dx
    this.y += dy
    this.circuit.drawOrthogonalSegment(
      x0,
      y0,
      this.x,
      this.y,
      this.lastConnected,
    )
    this.lastDx = dx
    this.lastDy = dy
    return this
  }

  passive(): this {
    const circuit = this.circuit
    const pid = `passive${circuit.nextPassiveId++}`
    const box: Box = {
      boxId: pid,
      leftPinCount: 0,
      rightPinCount: 0,
      topPinCount: 0,
      bottomPinCount: 0,
    }
    const orient: "v" | "h" =
      Math.abs(this.lastDx) > Math.abs(this.lastDy) ? "h" : "v"
    if (orient === "v") {
      box.topPinCount = 1
      box.bottomPinCount = 1
    } else {
      box.leftPinCount = 1
      box.rightPinCount = 1
    }
    circuit.netlistComponents.boxes.push(box)
    let p1: PortReference = { boxId: pid, pinNumber: 1 }
    let p2: PortReference = { boxId: pid, pinNumber: 2 }

    if (orient === "v" && this.lastDy < 0) {
      ;[p1, p2] = [p2, p1]
    } else if (orient === "h" && this.lastDx < 0) {
      ;[p1, p2] = [p2, p1]
    }

    circuit.associateCoordinateWithNetItem(this.x, this.y, p1)
    circuit.putOverlay(this.x, this.y, "P")
    circuit.connectItems(this.lastConnected, p1)
    this.lastConnected = p2
    circuit.associateCoordinateWithNetItem(this.x, this.y, p2)
    return this
  }

  label(text?: string): this {
    const circuit = this.circuit
    const netId = text ?? `L${circuit.nextLabelId++}`
    if (!circuit.netlistComponents.nets.find((n) => n.netId === netId))
      circuit.netlistComponents.nets.push({ netId })
    const netRef: PortReference = { netId }
    circuit.associateCoordinateWithNetItem(this.x, this.y, netRef)
    circuit.putOverlay(this.x, this.y, text ?? "L")
    circuit.connectItems(this.lastConnected, netRef)
    this.lastConnected = netRef
    return this
  }

  intersect(): this {
    const key = `${this.x},${this.y}`
    const existing = this.circuit.coordinateToNetItem.get(key)
    if (this.lastConnected && existing)
      this.circuit.connectItems(this.lastConnected, existing)
    else if (this.lastConnected)
      this.circuit.associateCoordinateWithNetItem(
        this.x,
        this.y,
        this.lastConnected,
      )
    this.circuit.putOverlay(this.x, this.y, "●")
    return this
  }

  connect(): this {
    const key = `${this.x},${this.y}`
    const existing = this.circuit.coordinateToNetItem.get(key)
    if (this.lastConnected && existing)
      this.circuit.connectItems(this.lastConnected, existing)
    else if (this.lastConnected)
      this.circuit.associateCoordinateWithNetItem(
        this.x,
        this.y,
        this.lastConnected,
      )
    // No overlay for connect
    return this
  }

  mark(name: string): this {
    this.chip.addMark(name, this)
    return this
  }

  // Methods for mark/fromMark state management
  getMarkableState(): PinConnectionState {
    return {
      x: this.x,
      y: this.y,
      lastConnected: this.lastConnected,
      lastDx: this.lastDx,
      lastDy: this.lastDy,
    }
  }

  applyMarkableState(state: PinConnectionState): void {
    this.x = state.x
    this.y = state.y
    this.lastConnected = state.lastConnected
    this.lastDx = state.lastDx
    this.lastDy = state.lastDy
  }
}

/********************  PUBLIC FACTORY *****************************************/

export function circuit(): CircuitBuilder {
  return new CircuitBuilder()
}
export default circuit
