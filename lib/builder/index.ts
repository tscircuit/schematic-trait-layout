// ascii-schematic.ts – a minimal, self‑contained library for describing
// simple ASCII schematic fragments with a fluent builder API.
//
// USAGE EXAMPLE:
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
// console.log(C.getNetlist());
//
// ---------------------------------------------------------------------------

import type { InputNetlist, Box, Connection, Net } from "../input-types"

/* eslint-disable @typescript-eslint/no-explicit-any */ // TODO: Remove any later

/********************  TYPES *************************************************/

/** Represents a reference to a connectable point (a pin on a box or a named net). */
type PortReference = { boxId: string; pinNumber: number } | { netId: string }

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
  private lastConnectedItem: PortReference | null = null
  private lastLineDx = 0
  private lastLineDy = 0

  constructor(
    private readonly chip: ChipBuilder,
    public x: number, // Made public for ChipBuilder to set initial position
    public y: number, // Made public for ChipBuilder to set initial position
    public associatedChipPinNumber: number,
  ) {
    this.resetConnectionPoint()
  }

  /** Resets the starting point for netlist connections to this pin on the main chip. */
  resetConnectionPoint(): void {
    this.lastConnectedItem = {
      boxId: this.chip.mainChipId,
      pinNumber: this.associatedChipPinNumber,
    }
    // Associate this initial chip pin coordinate with its electrical identity
    // This is called by C.pin(N), which happens after computeBodySize ensures x,y are set.
    if (this.lastConnectedItem) {
      this.chip.associateCoordinateWithNetItem(
        this.x,
        this.y,
        this.lastConnectedItem,
      )
    }
  }

  /** Draw an orthogonal segment, absolute step counts (may be negative). */
  line(dx: number, dy: number): this {
    if (dx !== 0 && dy !== 0) {
      throw new Error("Only orthogonal line segments are supported.")
    }

    const x0 = this.x
    const y0 = this.y
    this.x += dx
    this.y += dy
    const x1 = this.x
    const y1 = this.y

    this.lastLineDx = dx
    this.lastLineDy = dy

    // The electrical identity of the line is the current lastConnectedItem
    this.chip.drawOrthogonalSegment(x0, y0, x1, y1, this.lastConnectedItem)
    return this
  }

  /** Place a generic passive component symbol (very coarse – one glyph). */
  passive(): this {
    const passiveBoxId = `passive${this.chip.nextPassiveId++}`
    const passiveBox: Box = {
      boxId: passiveBoxId,
      leftPinCount: 0,
      rightPinCount: 0,
      topPinCount: 0,
      bottomPinCount: 0,
    }

    let orientation: "vertical" | "horizontal" | undefined

    // Infer orientation from the last line dx/dy
    if (this.lastLineDx === 0) {
      orientation = "vertical"
    } else if (this.lastLineDy === 0) {
      orientation = "horizontal"
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

    const pin1Identity: PortReference = { boxId: passiveBoxId, pinNumber: 1 }
    const pin2Identity: PortReference = { boxId: passiveBoxId, pinNumber: 2 }

    // Associate the component's location (pin1 entry point) with its pin1 identity
    this.chip.associateCoordinateWithNetItem(this.x, this.y, pin1Identity)
    this.chip.grid.putOverlay(this.x, this.y, "P") // Draw 'P' at pin1 location

    // Connect the incoming wire (lastConnectedItem) to pin1 of the passive
    this.chip.connectItems(this.lastConnectedItem, pin1Identity)

    this.lastConnectedItem = pin2Identity // Next connection starts from "second" pin (pin2)
    // Associate current coordinate (still this.x, this.y) with pin2 for outgoing connections.
    // This means pin1 and pin2 are at the same coordinate for connection purposes.
    this.chip.associateCoordinateWithNetItem(this.x, this.y, pin2Identity)
    return this
  }

  /** Write a text label at the current cursor location. */
  label(text?: string): this {
    let actualNetId: string
    let displayCharacter: string

    if (text === undefined) {
      actualNetId = `L${this.chip.nextLabelId++}`
      displayCharacter = "L"
    } else {
      actualNetId = text
      displayCharacter = text
    }

    const netIdentity: PortReference = { netId: actualNetId }
    if (
      !this.chip.netlistComponents.nets.find((n) => n.netId === actualNetId)
    ) {
      this.chip.netlistComponents.nets.push({ netId: actualNetId })
    }

    // Associate the label's coordinate with the net identity
    this.chip.associateCoordinateWithNetItem(this.x, this.y, netIdentity)
    this.chip.grid.putOverlay(this.x, this.y, displayCharacter)

    // Connect the incoming wire (lastConnectedItem) to this net
    this.chip.connectItems(this.lastConnectedItem, netIdentity)

    this.lastConnectedItem = netIdentity
    return this
  }

  /** Marks the current point as a junction, drawing a '●' symbol and connecting nets. */
  intersect(): this {
    const currentPointKey = `${this.x},${this.y}`
    const itemAtIntersection =
      this.chip.coordinateToNetItem.get(currentPointKey)

    if (this.lastConnectedItem && itemAtIntersection) {
      this.chip.connectItems(this.lastConnectedItem, itemAtIntersection)
      // The new electrical context for future segments is the item we just connected to.
      this.lastConnectedItem = itemAtIntersection
    } else if (this.lastConnectedItem) {
      // If there's nothing at the intersection point yet,
      // associate the current path's item with this coordinate.
      this.chip.associateCoordinateWithNetItem(
        this.x,
        this.y,
        this.lastConnectedItem,
      )
    }
    // If itemAtIntersection exists, it's already associated with the coordinate.
    // If this.lastConnectedItem is new to this point, it's now also associated via connectItems logic (merged net).

    this.chip.grid.putOverlay(this.x, this.y, "●") // Visual marker
    return this
  }

  /** Marks the current pin builder's state for later reference. */
  mark(name: string): this {
    this.chip.addMark(name, this)
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
  private _currentGlobalPinIndex = 0 // 0-indexed internally, exposed as 1-indexed

  pinCounts: Record<"left" | "right" | "top" | "bottom", number>

  bodyWidth = 0
  bodyHeight = 0
  bodySizeComputed = false

  readonly mainChipId = "chip0"
  nextPassiveId = 1 // Starts from 1 for passive component IDs
  nextLabelId = 1 // Starts from 1 for default labels
  netlistComponents: { boxes: Box[]; nets: Net[]; connections: Connection[] }
  coordinateToNetItem = new Map<string, PortReference>()
  private markedPinBuilders = new Map<string, PinBuilder>()

  constructor() {
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

  /**
   * Retrieves a PinBuilder instance that was previously marked.
   * Allows continuing drawing operations from the marked point.
   * @param name The name of the mark.
   * @returns The PinBuilder instance associated with the mark.
   * @throws Error if the mark is not found.
   */
  fromMark(name: string): PinBuilder {
    const pinBuilder = this.markedPinBuilders.get(name)
    if (!pinBuilder) {
      throw new Error(`Mark "${name}" not found.`)
    }
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
      this.drawOrthogonalSegment(0, 0, 0, H - 1, null) // Draw as a single vertical line
      return
    }

    if (H === 1) {
      // Horizontal line body (Wx1, W > 1)
      this.drawOrthogonalSegment(0, 0, W - 1, 0, null) // Draw as a single horizontal line
      return
    }

    // Standard case: W > 1 and H > 1 (a box)
    // Standard case: W > 1 and H > 1 (a box)
    // Assumes chip's bottom-left is at (0,0) in grid coordinates.
    // (W-1, H-1) is the top-right corner.
    // Body segments are not associated with any specific netlist item initially.
    const bodySegmentItem = null // Or a special marker if needed later

    // Bottom border: (0,0) to (W-1,0)
    this.drawOrthogonalSegment(0, 0, W - 1, 0, bodySegmentItem)
    // Top border: (0,H-1) to (W-1,H-1)
    this.drawOrthogonalSegment(0, H - 1, W - 1, H - 1, bodySegmentItem)
    // Left border: (0,0) to (0,H-1)
    this.drawOrthogonalSegment(0, 0, 0, H - 1, bodySegmentItem)
    // Right border: (W-1,0) to (W-1,H-1)
    this.drawOrthogonalSegment(W - 1, 0, W - 1, H - 1, bodySegmentItem)

    // Add pin numbers inside the chip body
    for (const side of SIDES_CCW) {
      const countOnThisSide =
        this.pinCounts[side as keyof typeof this.pinCounts]
      for (let i = 0; i < countOnThisSide; i++) {
        // i is 0-indexed for this side
        const pinKey = `${side}${i + 1}` as keyof typeof this.pinMap
        const pinBuilderInstance = this.pinMap[pinKey]

        if (!pinBuilderInstance) continue // Should not happen

        const pinNumberString = String(
          pinBuilderInstance.associatedChipPinNumber,
        )
        let numX: number
        let numY: number

        switch (side) {
          case "left": // Pin at (0, pinBuilderInstance.y)
            if (W <= 1) continue // Not enough space for number inside
            numX = 1
            numY = pinBuilderInstance.y
            break
          case "right": // Pin at (W-1, pinBuilderInstance.y)
            if (W <= 2) continue // Not enough space or would overwrite left border/number
            numX = W - 2
            numY = pinBuilderInstance.y
            break
          case "top": // Pin at (pinBuilderInstance.x, 0) - bottom edge on grid
            if (H <= 1) continue // Not enough space
            numX = pinBuilderInstance.x
            numY = 1
            break
          case "bottom": // Pin at (pinBuilderInstance.x, H-1) - top edge on grid
            if (H <= 2) continue // Not enough space or would overwrite
            numX = pinBuilderInstance.x
            numY = H - 2
            break
          default:
            continue // Should not reach here
        }
        this.grid.putOverlay(numX, numY, pinNumberString)
      }
    }
  }

  /** Associates a coordinate with a netlist item. */
  associateCoordinateWithNetItem(
    x: number,
    y: number,
    item: PortReference | null,
  ): void {
    // Don't overwrite existing item
    if (this.coordinateToNetItem.get(`${x},${y}`)) return

    if (item) {
      this.coordinateToNetItem.set(`${x},${y}`, item)
    }
  }

  /** Low‑level util shared by pins and body – draws straight H/V segment. */
  drawOrthogonalSegment(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    connectedItem: PortReference | null,
  ): void {
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)

    let x = x0
    let y = y0

    // Associate starting point
    this.associateCoordinateWithNetItem(x, y, connectedItem)

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
        // vertical
        if (dy > 0) {
          this.grid.addEdge(x, y, "up")
          this.grid.addEdge(nx, ny, "down")
        } else {
          this.grid.addEdge(x, y, "down")
          this.grid.addEdge(nx, ny, "up")
        }
      }
      x = nx
      y = ny
      // Associate current point in path
      this.associateCoordinateWithNetItem(x, y, connectedItem)
    }
  }

  // --- Netlist Helper Methods ---

  private areSamePortRef(a: PortReference, b: PortReference): boolean {
    if ("boxId" in a && "boxId" in b) {
      return a.boxId === b.boxId && a.pinNumber === b.pinNumber
    }
    if ("netId" in a && "netId" in b) {
      return a.netId === b.netId
    }
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
    return this.netlistComponents.connections.find((conn) =>
      this.isPortInConnection(item, conn),
    )
  }

  /** Connects two PortReferences, merging existing connections if necessary. */
  public connectItems(
    itemA: PortReference | null,
    itemB: PortReference | null,
  ): void {
    if (!itemA || !itemB || this.areSamePortRef(itemA, itemB)) {
      return // Nothing to do or self-connection
    }

    const connA = this.findConnectionContaining(itemA)
    const connB = this.findConnectionContaining(itemB)

    if (connA && connB) {
      if (connA === connB) return // Already connected in the same net

      // Merge connB into connA
      for (const port of connB.connectedPorts) {
        if (!this.isPortInConnection(port as PortReference, connA)) {
          connA.connectedPorts.push(port as PortReference)
        }
      }
      // Remove connB
      this.netlistComponents.connections =
        this.netlistComponents.connections.filter((c) => c !== connB)
    } else if (connA) {
      // Add itemB to connA
      if (!this.isPortInConnection(itemB, connA)) {
        connA.connectedPorts.push(itemB)
      }
    } else if (connB) {
      // Add itemA to connB
      if (!this.isPortInConnection(itemA, connB)) {
        connB.connectedPorts.push(itemA)
      }
    } else {
      // Create new connection
      this.netlistComponents.connections.push({
        connectedPorts: [itemA, itemB],
      })
    }
  }

  /**
   * Registers a PinBuilder instance with a given name.
   * This method is called by `PinBuilder.mark()`.
   * If a mark with the same name already exists, it will be overwritten.
   * @param name The name of the mark.
   * @param pinBuilder The PinBuilder instance to associate with the mark.
   */
  public addMark(name: string, pinBuilder: PinBuilder): void {
    this.markedPinBuilders.set(name, pinBuilder)
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
