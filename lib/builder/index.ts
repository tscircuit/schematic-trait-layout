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
const enum Edge {
  Left = 1,
  Right = 2,
  Up = 4,
  Down = 8,
}

// Convert a set of edges into the correct ASCII glyph.
function glyph(mask: number): string {
  const horiz = (mask & Edge.Left) !== 0 || (mask & Edge.Right) !== 0
  const vert = (mask & Edge.Up) !== 0 || (mask & Edge.Down) !== 0

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
    this.traces.set(key, (this.traces.get(key) ?? 0) | edge)
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
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
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
    private x: number,
    private y: number,
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

class ChipBuilder {
  readonly grid = new Grid()
  private pinCounter = 1
  private pinMap: Record<number, PinBuilder> = {}

  constructor(
    private bodyWidth = 4,
    private leftPins = 0,
    private rightPins = 0,
  ) {
    // will be re‑sized once pins are known via leftpins()/rightpins()
  }

  /** Declare *n* left‑hand pins (top‑to‑bottom). */
  leftpins(n: number): this {
    this.leftPins = n
    this.allocatePins("left", n)
    return this
  }

  /** Declare *n* right‑hand pins (top‑to‑bottom). */
  rightpins(n: number): this {
    this.rightPins = n
    this.allocatePins("right", n)
    return this
  }

  private allocatePins(side: "left" | "right", n: number): void {
    const ySpan = (Math.max(this.leftPins, this.rightPins) - 1) * 2 + 3 // total height incl. borders
    const topY = 0
    const bottomY = ySpan - 1
    const step = n === 1 ? 0 : (ySpan - 2) / (n - 1) // vertical spacing between pins

    const xLeft = 0
    const xRight = this.bodyWidth + 1

    for (let i = 0; i < n; i++) {
      const y = 1 + Math.round(i * step)
      const x = side === "left" ? xLeft : xRight
      const pin = new PinBuilder(this, x, y)
      this.pinMap[this.pinCounter] = pin
    }

    // draw/refresh the chip outline after we know final dimensions
    this.drawBody()
  }

  pin(n: number) {
    return this.pinMap[n]!
  }

  /** Draw the IC body onto the grid. */
  private drawBody(): void {
    const w = this.bodyWidth + 1 // x‑coord of right border
    const h = (Math.max(this.leftPins, this.rightPins) - 1) * 2 + 3 // bottom y

    // horizontal borders
    this.drawOrthogonalSegment(0, 0, w, 0) // top
    this.drawOrthogonalSegment(0, h - 1, w, h - 1) // bottom

    // vertical borders (skip corners so we don't double‑count)
    this.drawOrthogonalSegment(0, 1, 0, h - 2)
    this.drawOrthogonalSegment(w, 1, w, h - 2)
  }

  /** Low‑level util shared by pins and body – draws straight H/V segment. */
  drawOrthogonalSegment(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)

    let x = x0,
      y = y0
    while (x !== x1 || y !== y1) {
      const nx = x + dx
      const ny = y + dy

      // mark edges for cell (x,y) → (nx,ny)
      if (dx !== 0) {
        // horizontal
        if (dx > 0) {
          this.grid.addEdge(x, y, Edge.Right)
          this.grid.addEdge(nx, ny, Edge.Left)
        } else {
          this.grid.addEdge(x, y, Edge.Left)
          this.grid.addEdge(nx, ny, Edge.Right)
        }
      } else if (dy !== 0) {
        // vertical
        if (dy > 0) {
          this.grid.addEdge(x, y, Edge.Down)
          this.grid.addEdge(nx, ny, Edge.Up)
        } else {
          this.grid.addEdge(x, y, Edge.Up)
          this.grid.addEdge(nx, ny, Edge.Down)
        }
      }
      x = nx
      y = ny
    }
  }

  /** Convert whole design to ASCII. */
  toString(): string {
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
