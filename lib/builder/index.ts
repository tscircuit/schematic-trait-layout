// ascii-schematic.ts – a minimal, self‑contained library for describing
// simple ASCII schematic fragments with a fluent builder API.
//
// USAGE EXAMPLE (matches the snippet you provided):
//
// import { chip } from "./ascii-schematic";
//
// const C = chip().leftpins(2).rightpins(2);
// C.pin1.line(-3, 0).line(0, -1).passive("vertical").line(0, -1).label();
// C.pin2.line(-1, 0).line(0, -1).label("B");
// C.pin3.line(1, 0).label();
// C.pin4.line(1, 0).label();
//
// console.log(C.toString());
// console.log(C.getNetlist()); // Example for new method
//
// ---------------------------------------------------------------------------

import type { InputNetlist, Box, Connection, Net } from "../input-types"

/* eslint-disable @typescript-eslint/no-explicit-any */

/********************  INTERNAL PRIMITIVES ***********************************/
//
// import { chip } from "./ascii-schematic";
//
// const C = chip().leftpins(2).rightpins(2);
// C.pin1.line(-3, 0).line(0, -1).passive("vertical").line(0, -1).label();
// C.pin2.line(-1, 0).line(0, -1).label("B");
// C.pin3.line(1, 0).label();
// C.pin4.line(1, 0).label();
//
// console.log(C.toString());
//
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

/********************  INTERNAL PRIMITIVES ***********************************/

// Compact bit‑mask we use to record which "edges" of a cell are occupied by
// a trace so we can later decide whether the glyph is "-", "|", or "+".
type Edge = "left" | "right" | "up" | "down"

const EDGE_MASKS: Record<Edge, number> = {
  left: 1,
  right: 2,
  up: 4,
  down: 8,
}

// Convert a set of edges into the correct ASCII glyph.
function glyph(mask: number): string {
  switch (mask) {
    case 0:
      return " " // No edges

    // Single edges (parts of a line)
    case EDGE_MASKS.left:
      return "─"
    case EDGE_MASKS.right:
      return "─"
    case EDGE_MASKS.up:
      return "│"
    case EDGE_MASKS.down:
      return "│"

    // Two edges
    case EDGE_MASKS.left | EDGE_MASKS.right:
      return "─" // Horizontal line
    case EDGE_MASKS.up | EDGE_MASKS.down:
      return "│" // Vertical line
    case EDGE_MASKS.left | EDGE_MASKS.up:
      return "┘" // Corner: bottom-left in screen space (left, up in Cartesian)
    case EDGE_MASKS.left | EDGE_MASKS.down:
      return "┐" // Corner: top-left in screen space (left, down in Cartesian)
    case EDGE_MASKS.right | EDGE_MASKS.up:
      return "└" // Corner: bottom-right in screen space (right, up in Cartesian)
    case EDGE_MASKS.right | EDGE_MASKS.down:
      return "┌" // Corner: top-right in screen space (right, down in Cartesian)

    // Three edges
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up:
      return "┴" // T-junction pointing down on screen
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.down:
      return "┬" // T-junction pointing up on screen
    case EDGE_MASKS.left | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┤" // T-junction pointing right on screen
    case EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "├" // T-junction pointing left on screen

    // Four edges
    case EDGE_MASKS.left | EDGE_MASKS.right | EDGE_MASKS.up | EDGE_MASKS.down:
      return "┼" // Crossroads

    default:
      return " " // Should ideally not be reached if mask is a combination of EDGE_MASKS
  }
}

/** 2‑D sparse grid – we keep it sparse so diagrams can grow in any direction */
class Grid {
  private traces = new Map<string, number>() // key "x,y" → Edge mask
  private overlay = new Map<string, string>() // key "x,y" → literal char

  addEdge(x: number, y: number, edge: Edge): void {
    const key = `${x},${y}`
    const maskValue = EDGE_MASKS[edge]
    this.traces.set(key, (this.traces.get(key) ?? 0) | maskValue)
  }

  putOverlay(x: number, y: number, ch: string): void {
    this.overlay.set(`${x},${y}`, ch)
  }

  /** Iterate over all coordinates that contain *anything* */
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

    // Determine bounding box of *visible* area.
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
    // Iterate from maxY down to minY to render with Y increasing upwards.
    for (let y = maxY; y >= minY; y--) {
      let row = ""
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${y}`
        const over = this.overlay.get(key)
        const trace = this.traces.get(key) ?? 0
        row += over ?? glyph(trace)
      }
      rows.push(row.replace(/ +$/g, "")) // trim right‑side spaces
    }
    return rows.join("\n")
  }
}

/********************  PUBLIC BUILDER API *************************************/

class PinBuilder {
  private lastConnectedItem:
    | { boxId: string; pinNumber: number }
    | { netId: string }
    | null = null

  constructor(
    private chip: ChipBuilder,
    public x: number, // Made public for ChipBuilder to set initial position
    public y: number, // Made public for ChipBuilder to set initial position
    private associatedChipPinNumber: number,
  ) {
    this.resetConnectionPoint()
  }

  /** Resets the starting point for netlist connections to this pin on the main chip. */
  resetConnectionPoint(): void {
    this.lastConnectedItem = {
      boxId: this.chip.mainChipId,
      pinNumber: this.associatedChipPinNumber,
    }
  }

  /** Draw an orthogonal segment, absolute step counts (may be negative). */
  line(dx: number, dy: number): this {
    if (dx !== 0 && dy !== 0)
      throw new Error("Only orthogonal line segments are supported.")

    const x0 = this.x
    const y0 = this.y
    const x1 = (this.x += dx)
    const y1 = (this.y += dy)

    this.chip.drawOrthogonalSegment(x0, y0, x1, y1)
    return this
  }

  /** Place a generic passive component symbol (very coarse – one glyph). */
  passive(orientation: "vertical" | "horizontal" = "vertical"): this {
    // We just drop a "B" symbol to keep the example simple
    this.chip.grid.putOverlay(this.x, this.y, "B")

    const passiveBoxId = `passive${this.chip.nextPassiveId++}`
    // Convention: passive components are 2-pin devices. Pin 1 is considered the input, Pin 2 the output.
    // The pin counts on each side are set based on the orientation.
    const passiveBox: Box = {
      boxId: passiveBoxId,
      leftPinCount: 0,
      rightPinCount: 0,
      topPinCount: 0,
      bottomPinCount: 0,
    }

    if (orientation === "vertical") {
      passiveBox.topPinCount = 1 // Pin 1 (input)
      passiveBox.bottomPinCount = 1 // Pin 2 (output)
    } else {
      // Default to horizontal
      passiveBox.leftPinCount = 1 // Pin 1 (input)
      passiveBox.rightPinCount = 1 // Pin 2 (output)
    }
    this.chip.netlistComponents.boxes.push(passiveBox)

    if (this.lastConnectedItem) {
      this.chip.netlistComponents.connections.push({
        connectedPorts: [
          this.lastConnectedItem,
          { boxId: passiveBoxId, pinNumber: 1 }, // Connect to "first" pin of passive
        ],
      })
    }
    this.lastConnectedItem = { boxId: passiveBoxId, pinNumber: 2 } // Next connection starts from "second" pin
    return this
  }

  /** Write a text label at the current cursor location. */
  label(text = "L"): this {
    this.chip.grid.putOverlay(this.x, this.y, text)

    const netId = text
    if (!this.chip.netlistComponents.nets.find((n) => n.netId === netId)) {
      this.chip.netlistComponents.nets.push({ netId })
    }

    if (this.lastConnectedItem) {
      this.chip.netlistComponents.connections.push({
        connectedPorts: [this.lastConnectedItem, { netId }],
      })
    }
    this.lastConnectedItem = { netId }
    return this
  }

  /** Marks the current point as a junction, drawing a '●' symbol. */
  intersect(): this {
    this.chip.grid.putOverlay(this.x, this.y, "●")

    // TODO Find the net that connects to this point

    const junctionNetId = `_junction_${this.chip.nextJunctionId++}`
    if (
      !this.chip.netlistComponents.nets.find((n) => n.netId === junctionNetId)
    ) {
      this.chip.netlistComponents.nets.push({ netId: junctionNetId })
    }

    if (this.lastConnectedItem) {
      this.chip.netlistComponents.connections.push({
        connectedPorts: [this.lastConnectedItem, { netId: junctionNetId }],
      })
    }
    this.lastConnectedItem = { netId: junctionNetId }
    return this
  }
}

const SIDES_CCW = ["left", "bottom", "right", "top"] as const

class ChipBuilder {
  readonly grid = new Grid()
  pinMap: Record<
    `${"left" | "right" | "top" | "bottom"}${number}`,
    PinBuilder
  > = {}
  pinBuilders: PinBuilder[] = []
  private _currentGlobalPinIndex = 0

  pinCounts: Record<"left" | "right" | "top" | "bottom", number>

  bodyWidth = 0
  bodyHeight = 0
  bodySizeComputed = false

  readonly mainChipId = "chip0"
  nextPassiveId = 1
  nextJunctionId = 1 // Added for unique junction IDs
  netlistComponents: { boxes: Box[]; nets: Net[]; connections: Connection[] }

  constructor() {
    this.nextJunctionId = 1
    this.pinCounts = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }
    this.netlistComponents = {
      boxes: [
        {
          boxId: this.mainChipId,
          leftPinCount: 0,
          rightPinCount: 0,
          topPinCount: 0,
          bottomPinCount: 0,
        },
      ],
      nets: [],
      connections: [],
    }
  }

  get totalPins(): number {
    return this.pinBuilders.length
  }

  /** Declare *n* left‑hand pins (top‑to‑bottom). */
  leftpins(n: number): this {
    this.pinCounts.left = n
    this.allocatePins("left", n)
    return this
  }

  /** Declare *n* right‑hand pins (top‑to‑bottom). */
  rightpins(n: number): this {
    this.pinCounts.right = n
    this.allocatePins("right", n)
    return this
  }

  /** Declare *n* top‑hand pins (left‑to‑right). */
  toppins(n: number): this {
    this.pinCounts.top = n
    this.allocatePins("top", n)
    return this
  }

  /** Declare *n* bottom‑hand pins (left‑to‑right). */
  bottompins(n: number): this {
    this.pinCounts.bottom = n
    this.allocatePins("bottom", n)
    return this
  }

  private allocatePins(
    side: "left" | "right" | "top" | "bottom",
    countOnSide: number,
  ): void {
    for (let i = 0; i < countOnSide; i++) {
      // i is local 0-indexed for this side
      this._currentGlobalPinIndex++
      const globalPinNum = this._currentGlobalPinIndex // 1-indexed global pin number
      const pinBuilder = new PinBuilder(this, 0, 0, globalPinNum) // Initial x,y will be updated later
      this.pinBuilders[globalPinNum - 1] = pinBuilder // Store in 0-indexed array
      this.pinMap[`${side}${i + 1}`] = pinBuilder // Key is 1-indexed for side name
    }
    // Body is drawn once in computeBodySize after all dimensions are final.
  }

  computeBodySize(): void {
    if (this.bodySizeComputed) {
      return // Already computed
    }

    // Width is determined by the max number of pins on top/bottom sides
    const maxPinsHorizontal = Math.max(
      this.pinCounts.top,
      this.pinCounts.bottom,
      0,
    )
    // Height is determined by the max number of pins on left/right sides
    const maxPinsVertical = Math.max(
      this.pinCounts.left,
      this.pinCounts.right,
      0,
    )

    // Calculate body dimensions.
    // N pins require N*2+1 units of space (e.g., N=1 pin -> 3 units; N=2 pins -> 5 units).
    // If N=0 pins on an axis, dimension is 1 (a single line/point for that axis).
    this.bodyWidth = Math.max(
      5,
      maxPinsHorizontal === 0 ? 1 : maxPinsHorizontal + 2,
    )
    this.bodyHeight = Math.max(
      3,
      maxPinsVertical === 0 ? 1 : maxPinsVertical + 2,
    )

    // Set the position of each pin now that we know the body size
    for (const side of SIDES_CCW) {
      const count = this.pinCounts[side as keyof typeof this.pinCounts]
      for (let i = 0; i < count; i++) {
        // i is 0-indexed
        const pinKey = `${side}${i + 1}` as keyof typeof this.pinMap
        const pin = this.pinMap[pinKey]
        if (pin) {
          switch (side) {
            case "left":
              pin.x = 0
              // Assign Y coordinates from top to bottom (higher Y is top)
              pin.y = this.bodyHeight - 1 - (1 + i)
              break
            case "right":
              pin.x = this.bodyWidth - 1
              // Assign Y coordinates from top to bottom (higher Y is top)
              pin.y = this.bodyHeight - 1 - (1 + i)
              break
            case "top":
              pin.x = 1 + i
              pin.y = 0
              break
            case "bottom":
              pin.x = 1 + i
              pin.y = this.bodyHeight - 1
              break
          }
        }
      }
    }

    // Draw the chip body outline now that dimensions and pin locations are final
    this.drawBody()

    this.bodySizeComputed = true
  }

  pin(n: number) {
    // n is 1-indexed global pin number
    if (!this.bodySizeComputed) {
      this.computeBodySize()
    }
    const pinBuilder = this.pinBuilders[n - 1]
    if (!pinBuilder) {
      throw new Error(
        `Pin ${n} not found. Total pins: ${this.pinBuilders.length}`,
      )
    }
    pinBuilder.resetConnectionPoint() // Initialize for netlist generation
    return pinBuilder
  }

  /** Draw the IC body onto the grid. Called once by computeBodySize. */
  private drawBody(): void {
    // bodyWidth and bodyHeight are the full dimensions (W, H) of the chip.
    // Grid coordinates are 0-indexed, so max x is bodyWidth-1, max y is bodyHeight-1.
    const W = this.bodyWidth
    const H = this.bodyHeight

    // W and H are guaranteed to be >= 1 by computeBodySize logic.

    if (W === 1 && H === 1) {
      // 1x1 chip (e.g. no pins)
      this.grid.putOverlay(0, 0, "+") // Represent as a single point
      return
    }

    if (W === 1) {
      // Vertical line body (1xH, H > 1)
      this.drawOrthogonalSegment(0, 0, 0, H - 1) // Draw as a single vertical line
      return
    }

    if (H === 1) {
      // Horizontal line body (Wx1, W > 1)
      this.drawOrthogonalSegment(0, 0, W - 1, 0) // Draw as a single horizontal line
      return
    }

    // Standard case: W > 1 and H > 1 (a box)
    // Standard case: W > 1 and H > 1 (a box)
    // Assumes chip's bottom-left is at (0,0) in grid coordinates.
    // (W-1, H-1) is the top-right corner.

    // Bottom border: (0,0) to (W-1,0)
    this.drawOrthogonalSegment(0, 0, W - 1, 0)
    // Top border: (0,H-1) to (W-1,H-1)
    this.drawOrthogonalSegment(0, H - 1, W - 1, H - 1)
    // Left border: (0,0) to (0,H-1)
    this.drawOrthogonalSegment(0, 0, 0, H - 1)
    // Right border: (W-1,0) to (W-1,H-1)
    this.drawOrthogonalSegment(W - 1, 0, W - 1, H - 1)
  }

  /** Low‑level util shared by pins and body – draws straight H/V segment. */
  drawOrthogonalSegment(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)

    let x = x0
    let y = y0
    while (x !== x1 || y !== y1) {
      const nx = x + dx
      const ny = y + dy

      // mark edges for cell (x,y) → (nx,ny)
      if (dx !== 0) {
        // horizontal
        if (dx > 0) {
          this.grid.addEdge(x, y, "right")
          this.grid.addEdge(nx, ny, "left")
        } else {
          this.grid.addEdge(x, y, "left")
          this.grid.addEdge(nx, ny, "right")
        }
      } else if (dy !== 0) {
        // vertical: dy is Math.sign(y1 - y0) from user coordinates
        if (dy > 0) {
          // Moving UP in Cartesian (y1 > y0)
          this.grid.addEdge(x, y, "up") // Current cell (x,y) gets an "up" edge
          this.grid.addEdge(nx, ny, "down") // Next cell (nx,ny) gets a "down" edge
        } else {
          // Moving DOWN in Cartesian (y1 < y0)
          this.grid.addEdge(x, y, "down") // Current cell (x,y) gets a "down" edge
          this.grid.addEdge(nx, ny, "up") // Next cell (nx,ny) gets an "up" edge
        }
      }
      x = nx
      y = ny
    }
  }

  /** Convert whole design to ASCII. */
  toString(): string {
    if (!this.bodySizeComputed) {
      this.computeBodySize()
    }
    return this.grid.toString()
  }

  /** Generate a netlist representation of the chip. */
  getNetlist(): InputNetlist {
    if (!this.bodySizeComputed) {
      this.computeBodySize()
    }

    // Update the main chip's box definition with final pin counts
    const mainChipBox = this.netlistComponents.boxes.find(
      (b) => b.boxId === this.mainChipId,
    )
    if (mainChipBox) {
      mainChipBox.leftPinCount = this.pinCounts.left
      mainChipBox.rightPinCount = this.pinCounts.right
      mainChipBox.topPinCount = this.pinCounts.top
      mainChipBox.bottomPinCount = this.pinCounts.bottom
    }

    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(this.netlistComponents))
  }
}

/********************  PUBLIC FACTORY  ****************************************/

export function chip(): ChipBuilder {
  return new ChipBuilder()
}

// For convenience – the IC‑shaped thing itself is the default export so users
// can `import C from "./circuit";` … though named import is clearer.
export default chip
