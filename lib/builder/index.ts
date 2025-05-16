import type {
  InputNetlist,
  Box,
  Connection,
  Net,
  PortReference,
} from "../input-types"

type Edge = "left" | "right" | "up" | "down"

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

  private nextChipIndex = 0
  nextPassiveId = 1
  nextLabelId = 1

  readonly netlistComponents: {
    boxes: Box[]
    nets: Net[]
    connections: Connection[]
  } = { boxes: [], nets: [], connections: [] }

  /** Create a new chip inside the circuit. You can later move it with `.at()` */
  chip(): ChipBuilder {
    const chipId = `chip${this.nextChipIndex++}`
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
  ): void {
    const dx = Math.sign(x1 - x0)
    const dy = Math.sign(y1 - y0)
    let x = x0,
      y = y0
    this.associateCoordinateWithNetItem(x, y, item)
    while (x !== x1 || y !== y1) {
      const nx = x + dx,
        ny = y + dy
      if (dx !== 0) {
        if (dx > 0) {
          this.addEdge(x, y, "right")
          this.addEdge(nx, ny, "left")
        } else {
          this.addEdge(x, y, "left")
          this.addEdge(nx, ny, "right")
        }
      } else if (dy !== 0) {
        if (dy > 0) {
          this.addEdge(x, y, "up")
          this.addEdge(nx, ny, "down")
        } else {
          this.addEdge(x, y, "down")
          this.addEdge(nx, ny, "up")
        }
      }
      x = nx
      y = ny
      this.associateCoordinateWithNetItem(x, y, item)
    }
  }

  /** String representation of the whole circuit */
  toString(): string {
    return this.grid.toString()
  }

  /** Final netlist (deep‑copied) */
  getNetlist(): InputNetlist {
    return JSON.parse(JSON.stringify(this.netlistComponents))
  }
}

/***** ChipBuilder ************************************************************/
const SIDES_CCW = ["left", "bottom", "right", "top"] as const

type Side = (typeof SIDES_CCW)[number]

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
  private readonly marked = new Map<string, PinBuilder>()

  constructor(
    private readonly circuit: CircuitBuilder,
    readonly chipId: string,
  ) {}

  /** Optional: place the chip's bottom‑left corner at absolute (x,y). */
  at(x: number, y: number): this {
    this.originX = x
    this.originY = y
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
          case "right":
            pin.x = this.originX + this.bodyWidth - 1
            pin.y = this.originY + this.bodyHeight - 1 - (1 + i)
            break
          case "top":
            pin.x = this.originX + 1 + i
            pin.y = this.originY
            break
          case "bottom":
            pin.x = this.originX + 1 + i
            pin.y = this.originY + this.bodyHeight - 1
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
    const bodyItem: PortReference | null = null

    const seg = (x0: number, y0: number, x1: number, y1: number) =>
      this.circuit.drawOrthogonalSegment(
        ox + x0,
        oy + y0,
        ox + x1,
        oy + y1,
        bodyItem,
      )

    if (W === 1 && H === 1) {
      this.circuit.putOverlay(ox, oy, "+")
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
            ly = pin.y - 1
            break
        }
        this.circuit.putOverlay(lx, ly, label)
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
    const p = this.marked.get(name)
    if (!p) throw new Error(`Mark "${name}" not found`)
    return p
  }

  addMark(name: string, p: PinBuilder): void {
    this.marked.set(name, p)
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
    const p1: PortReference = { boxId: pid, pinNumber: 1 }
    const p2: PortReference = { boxId: pid, pinNumber: 2 }
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

  mark(name: string): this {
    this.chip.addMark(name, this)
    return this
  }
}

/********************  PUBLIC FACTORY *****************************************/

export function circuit(): CircuitBuilder {
  return new CircuitBuilder()
}
export default circuit
