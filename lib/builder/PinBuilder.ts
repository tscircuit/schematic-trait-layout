import type { PortReference, Side } from "../input-types"
import type { Line } from "./circuit-types"
import type { CircuitBuilder } from "./CircuitBuilder"
import { getPinSideIndex } from "./getPinSideIndex"

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
  private lastCreatedLine: Line | null = null
  private lastDx = 0
  private lastDy = 0

  constructor(
    private readonly chip: any, // TODO: Replace with proper ChipBuilder type
    public pinNumber: number,
  ) {}

  private get circuit(): CircuitBuilder {
    return this.chip["circuit"]
  }

  line(dx: number, dy: number): this {
    const start = { x: this.x, y: this.y, ref: this.ref }
    this.x += dx * this.circuit.defaultLineDistanceMultiple
    this.y += dy * this.circuit.defaultLineDistanceMultiple
    const end = { x: this.x, y: this.y, ref: this.ref }
    const line = { start, end }
    this.circuit.lines.push(line)
    this.lastDx = dx * this.circuit.defaultLineDistanceMultiple
    this.lastDy = dy * this.circuit.defaultLineDistanceMultiple
    this.lastCreatedLine = line
    return this
  }

  get side(): Side {
    const { side } = getPinSideIndex(this.pinNumber, this.chip)
    return side
  }

  get ref(): PortReference {
    return {
      boxId: this.chip.chipId,
      pinNumber: this.pinNumber,
    }
  }

  passive(): PinBuilder {
    const incomingRefOriginal = this.ref

    const entryDirection = this.lastDx === 0 ? "vertical" : "horizontal"

    const passive = this.circuit.passive() // Create new passive chip

    passive.at(this.x, this.y)

    if (entryDirection === "horizontal") {
      passive.leftpins(1).rightpins(1)
    } else {
      passive.bottompins(1).toppins(1)
    }

    const entryPin =
      entryDirection === "horizontal" ? passive.pin(1) : passive.pin(2)
    const exitPin =
      entryDirection === "horizontal" ? passive.pin(2) : passive.pin(1)

    this.lastCreatedLine!.end.ref = entryPin.ref

    // Push the end position of the lastCreatedLine back 1 unit
    this.lastCreatedLine!.end.x -= Math.sign(this.lastDx) / 2
    this.lastCreatedLine!.end.y -= Math.sign(this.lastDy) / 2

    exitPin.x += Math.sign(this.lastDx) / 2
    exitPin.y += Math.sign(this.lastDy) / 2

    return exitPin
  }

  label(text?: string): void {
    const id = text ?? `L${this.circuit.generateAutoLabel()}`
    this.circuit.netLabels.push({
      labelId: id,
      x: this.x,
      y: this.y,
      anchorSide:
        this.lastDx > 0
          ? "left"
          : this.lastDx < 0
            ? "right"
            : this.lastDy > 0
              ? "bottom"
              : "top",
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
