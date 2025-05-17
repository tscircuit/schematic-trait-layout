import type { PortReference } from "../input-types"

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

  private get circuit(): any {
    // TODO: Replace with proper CircuitBuilder type
    // biome-ignore lint/complexity/useLiteralKeys: Accessing private member
    return this.chip["circuit"]
  }

  resetConnectionPoint(): void {
    // TODO: Implement resetConnectionPoint
    this.lastConnected = { boxId: this.chip.chipId, pinNumber: this.pinNumber }
    this.circuit.associateCoordinateWithNetItem(
      this.x,
      this.y,
      this.lastConnected,
    )
  }

  line(dx: number, dy: number): this {
    // TODO: Implement line method
    return this
  }

  passive(): this {
    // TODO: Implement passive method
    return this
  }

  label(text?: string): this {
    // TODO: Implement label method
    return this
  }

  intersect(): this {
    // TODO: Implement intersect method
    return this
  }

  connect(): this {
    // TODO: Implement connect method
    return this
  }

  mark(name: string): this {
    // TODO: Implement mark method
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
