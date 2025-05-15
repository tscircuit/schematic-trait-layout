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
  const horiz =
    (mask & EDGE_MASKS.left) !== 0 || (mask & EDGE_MASKS.right) !== 0
  const vert = (mask & EDGE_MASKS.up) !== 0 || (mask & EDGE_MASKS.down) !== 0

  if (horiz && vert) return "+"
  if (horiz) return "-"
  if (vert) return "|"
  return " "
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
    for (let y = minY; y <= maxY; y++) {
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
  constructor(
    private chip: ChipBuilder,
    public x: number, // Made public for ChipBuilder to set initial position
    public y: number, // Made public for ChipBuilder to set initial position
  ) {}

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
  passive(_orientation: "vertical" | "horizontal" = "vertical"): this {
    // We just drop a "B" symbol to keep the example simple
    this.chip.grid.putOverlay(this.x, this.y, "B")
    return this
  }

  /** Write a text label at the current cursor location. */
  label(text = "L"): this {
    this.chip.grid.putOverlay(this.x, this.y, text)
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
  pinCounts: Record<"left" | "right" | "top" | "bottom", number>

  bodyWidth = 0
  bodyHeight = 0
  bodySizeComputed = false

  constructor() {
    this.pinCounts = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }
  }

  get totalPins(): number {
    return Object.values(this.pinCounts).reduce((a, b) => a + b, 0)
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
    n: number,
  ): void {
    for (let i = 0; i < n; i++) {
      const pin = new PinBuilder(this, 0, 0) // Initial x,y will be updated in computeBodySize
      this.pinMap[`${side}${i + 1}`] = pin
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
    this.bodyWidth = maxPinsHorizontal === 0 ? 1 : maxPinsHorizontal * 2 + 1
    this.bodyHeight = maxPinsVertical === 0 ? 1 : maxPinsVertical * 2 + 1

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
              pin.y = 1 + i * 2
              break
            case "right":
              pin.x = this.bodyWidth - 1
              pin.y = 1 + i * 2
              break
            case "top":
              pin.x = 1 + i * 2
              pin.y = 0
              break
            case "bottom":
              pin.x = 1 + i * 2
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

  getPinId(n: number): `${"left" | "right" | "top" | "bottom"}${number}` {
    // TODO find the side and the index of the pin
    let side: "left" | "right" | "top" | "bottom" = "left"
    let sideIndex = 0
    for (let i = 0; i < this.totalPins; i++) {
      if (i + 1 === n) {
        return `${side}${sideIndex + 1}` as `${"left" | "right" | "top" | "bottom"}${number}`
      }
      sideIndex++
      while (sideIndex >= this.pinCounts[side]) {
        side = SIDES_CCW[SIDES_CCW.indexOf(side) + 1]!
        sideIndex = 0
      }
    }
    throw new Error("Pin index out of bounds")
  }

  pin(n: number) {
    if (!this.bodySizeComputed) {
      this.computeBodySize()
    }
    return this.pinMap[this.getPinId(n)]!
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
    // Top border: (0,0) to (W-1,0)
    this.drawOrthogonalSegment(0, 0, W - 1, 0)
    // Bottom border: (0,H-1) to (W-1,H-1)
    this.drawOrthogonalSegment(0, H - 1, W - 1, H - 1)
    // Left border: (0,1) to (0,H-2) (Connects top and bottom corners)
    this.drawOrthogonalSegment(0, 1, 0, H - 2)
    // Right border: (W-1,1) to (W-1,H-2) (Connects top and bottom corners)
    this.drawOrthogonalSegment(W - 1, 1, W - 1, H - 2)
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
        // vertical
        if (dy > 0) {
          this.grid.addEdge(x, y, "down")
          this.grid.addEdge(nx, ny, "up")
        } else {
          this.grid.addEdge(x, y, "up")
          this.grid.addEdge(nx, ny, "down")
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
}

/********************  PUBLIC FACTORY  ****************************************/

export function chip(): ChipBuilder {
  return new ChipBuilder()
}

// For convenience – the IC‑shaped thing itself is the default export so users
// can `import C from "./circuit";` … though named import is clearer.
export default chip
