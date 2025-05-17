import type { Side } from "./legacy-circuit"
import { PinBuilder } from "./PinBuilder"
import type { CircuitBuilder } from "./CircuitBuilder"

// Moved Side and SIDES_CCW to module scope for broader use
const SIDES_CCW = ["left", "bottom", "right", "top"] as const

export class ChipBuilder {
  private pinMap: Record<string, PinBuilder> = {}
  private marks: Record<string, { pinBuilder: PinBuilder; state: any }> = {}

  constructor(
    private readonly circuit: CircuitBuilder,
    public readonly chipId: string,
  ) {}

  /**
   * Place the chip at the given coordinates in the circuit grid.
   * This is the top-left corner of the chip's body.
   */
  at(x: number, y: number): this {
    // TODO: Implement placing the chip at the specified coordinates
    return this
  }

  /**
   * Add pins to the left side of the chip.
   */
  leftside(count: number): this {
    // TODO: Implement adding pins to the left side
    return this
  }

  /**
   * Add pins to the right side of the chip.
   */
  rightside(count: number): this {
    // TODO: Implement adding pins to the right side
    return this
  }

  /**
   * Add pins to the top side of the chip.
   */
  topside(count: number): this {
    // TODO: Implement adding pins to the top side
    return this
  }

  /**
   * Add pins to the bottom side of the chip.
   */
  bottomside(count: number): this {
    // TODO: Implement adding pins to the bottom side
    return this
  }

  /**
   * Get a pin by its side and index.
   */
  pin(pinNumber: number): PinBuilder {
    // TODO: Implement getting a pin by side and index
  }

  /**
   * Add a mark at the current position of the pin builder.
   */
  addMark(name: string, pinBuilder: PinBuilder): void {
    // TODO: Implement adding a mark
  }

  /**
   * Continue routing from a previously marked position.
   */
  fromMark(name: string): PinBuilder {
    // TODO: Implement continuing from a mark
    return this.marks[name].pinBuilder
  }
}
