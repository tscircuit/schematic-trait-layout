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

  lastConnected: PortReference | null = null
  lastCreatedLine: Line | null = null
  lastDx = 0
  lastDy = 0

  constructor(
    private readonly chip: any, // TODO: Replace with proper ChipBuilder type
    public pinNumber: number,
  ) {}

  private get circuit(): CircuitBuilder {
    return this.chip["circuit"]
  }

  line(dx: number, dy: number): this {
    const start = { x: this.x, y: this.y, ref: this.ref }
    this.x += dx
    this.y += dy
    const end = { x: this.x, y: this.y, ref: this.ref }
    const line = { start, end }
    this.circuit.lines.push(line)
    this.lastDx = dx
    this.lastDy = dy
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
    const entryDirection = this.lastDx === 0 ? "vertical" : "horizontal"

    const passive = this.circuit.passive() // Create new passive chip

    if (entryDirection === "horizontal") {
      passive.leftpins(1).rightpins(1)
    } else {
      passive.bottompins(1).toppins(1)
    }

    // Position passive center by projecting half the passive dimension in the line direction
    const halfWidth = passive.getWidth() / 2
    const halfHeight = passive.getHeight() / 2
    // Project by the dimension aligned with the movement direction
    const centerX =
      this.x +
      Math.sign(this.lastDx) * (Math.abs(this.lastDx) > 0 ? halfWidth : 0)
    const centerY =
      this.y +
      Math.sign(this.lastDy) * (Math.abs(this.lastDy) > 0 ? halfHeight : 0)
    passive.at(centerX, centerY)

    const entrySide =
      this.lastDx > 0
        ? "left"
        : this.lastDx < 0
          ? "right"
          : this.lastDy > 0
            ? "bottom"
            : "top"

    const entryPin =
      entrySide === "left" || entrySide === "bottom"
        ? passive.pin(1)
        : passive.pin(2)
    const exitPin =
      entrySide === "left" || entrySide === "bottom"
        ? passive.pin(2)
        : passive.pin(1)

    this.lastCreatedLine!.end.ref = exitPin.ref

    return exitPin
  }

  label(text?: string): void {
    const id = text ?? this.circuit.generateAutoLabel()
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
