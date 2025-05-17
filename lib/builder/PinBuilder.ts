import type { PortReference } from "../input-types"
import type { CircuitBuilder } from "./CircuitBuilder"

export interface PinConnectionState {
  x: number
  y: number
  lastConnected: PortReference | null
  lastDx: number
  lastDy: number
}

export class PinBuilder {
  /* location (absolute coords inside circuit grid) */
  x = 0
  y = 0

  private lastConnected: PortReference | null = null
  private lastDx = 0
  private lastDy = 0

  constructor(
    private readonly chip: any, // TODO: Replace with proper ChipBuilder type
    public readonly pinNumber: number,
  ) {}

  private get circuit(): CircuitBuilder {
    // TODO: Replace with proper CircuitBuilder type
    // biome-ignore lint/complexity/useLiteralKeys: Accessing private member
    return this.chip["circuit"]
  }

  line(dx: number, dy: number): this {
    const start = { x: this.x, y: this.y, ref: this.ref }
    this.x += dx
    this.y += dy
    const end = { x: this.x, y: this.y, ref: this.ref }
    this.circuit.lines.push({ start, end })
    this.lastDx = dx
    this.lastDy = dy
    return this
  }

  get ref(): PortReference {
    return {
      boxId: this.chip.chipId,
      pinNumber: this.pinNumber,
    }
  }

  passive(): PinBuilder {
    const orientation: "horizontal" | "vertical" =
      this.lastDx === 0 ? "vertical" : "horizontal"
    const passiveChip = this.circuit.chip().at(this.x, this.y)
    if (orientation === "horizontal") {
      passiveChip.leftside(1).rightside(1)
    } else {
      passiveChip.topside(1).bottomside(1)
    }
    const firstPinToConnect = orientation === "horizontal" ? 1 : 2
    const secondPinToConnect = orientation === "horizontal" ? 2 : 1

    const normDx = Math.sign(this.lastDx)
    const normDy = Math.sign(this.lastDy)

    passiveChip.pin(firstPinToConnect).line(-normDx, -normDy).connect()
    return passiveChip.pin(secondPinToConnect).line(normDx, normDy).connect()
  }

  label(text?: string): void {
    const id = text ?? `L${this.circuit.generateAutoLabel()}`
    this.circuit.netLabels.push({
      labelId: id,
      x: this.x,
      y: this.y,
      fromRef: this.ref,
    })
    // Optionally, overlay label on grid if available
    // this.circuit.getGrid().putOverlay(this.x, this.y, id)
  }

  connect(): this {
    this.circuit.connectionPoints.push({
      ref: this.ref,
      x: this.x,
      y: this.y,
    })
    return this
  }

  intersect(): this {
    this.circuit.connectionPoints.push({
      ref: this.ref,
      x: this.x,
      y: this.y,
      showAsIntersection: true,
    })
    return this
  }

  mark(name: string): this {
    this.chip.addMark(name, this)
    return this
  }

  // Methods for mark/fromMark state management
  getMarkableState(): PinConnectionState {
    // TODO: Implement getMarkableState
    return {
      x: this.x,
      y: this.y,
      lastConnected: this.lastConnected,
      lastDx: this.lastDx,
      lastDy: this.lastDy,
    }
  }

  applyMarkableState(state: PinConnectionState): void {
    // TODO: Implement applyMarkableState
    this.x = state.x
    this.y = state.y
    this.lastConnected = state.lastConnected
    this.lastDx = state.lastDx
    this.lastDy = state.lastDy
  }
}
