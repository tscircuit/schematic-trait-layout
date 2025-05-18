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
    const incomingRefOriginal = this.ref;

    const normDx = Math.sign(this.lastDx);
    const normDy = Math.sign(this.lastDy);

    // 1. Draw entry segment (1 unit) from current position, if lastDx/lastDy are non-zero
    // This updates this.x, this.y to the end of this 1-unit segment.
    if (normDx !== 0 || normDy !== 0) {
      this.line(normDx, normDy);
    }
    
    const entryConnectX = this.x; // Coords where passive's input pin will connect
    const entryConnectY = this.y;

    const pc = this.circuit.chip(); // Create new passive chip

    let pc_target_x: number;
    let pc_target_y: number;
    let pin1_passive_ref: PortReference; // Pin of passive chip that connects to entryConnectX,Y
    let pin2_passive_builder: PinBuilder; // PinBuilder for the other pin of passive chip (outgoing)

    const incomingDirectionHorizontal = normDx !== 0;

    if (incomingDirectionHorizontal) {
      const lineCameFromLeft = normDx > 0;
      if (lineCameFromLeft) {
        pc_target_x = entryConnectX;
        pc_target_y = entryConnectY - 1;
        pc.at(pc_target_x, pc_target_y);
        pc.leftside(1).rightside(1);
        pin1_passive_ref = pc.leftPins[0].ref;
        pin2_passive_builder = pc.rightPins[0];
      } else { // normDx < 0, came from right
        pc_target_x = entryConnectX - 4;
        pc_target_y = entryConnectY - 1;
        pc.at(pc_target_x, pc_target_y);
        pc.leftside(1).rightside(1);
        pin1_passive_ref = pc.rightPins[0].ref;
        pin2_passive_builder = pc.leftPins[0];
      }
      pin2_passive_builder.lastDx = normDx;
      pin2_passive_builder.lastDy = 0;
    } else { // Incoming direction vertical (normDy !== 0)
      const lineCameFromBelow = normDy > 0;
      if (lineCameFromBelow) {
        pc_target_x = entryConnectX - 1;
        pc_target_y = entryConnectY - 2;
        pc.at(pc_target_x, pc_target_y);
        pc.topside(1).bottomside(1);
        pin1_passive_ref = pc.bottomPins[0].ref;
        pin2_passive_builder = pc.topPins[0];
      } else { // normDy < 0, came from above
        pc_target_x = entryConnectX - 1;
        pc_target_y = entryConnectY; // Top pin of pc is at pc.y
        pc.at(pc_target_x, pc_target_y);
        pc.topside(1).bottomside(1);
        pin1_passive_ref = pc.topPins[0].ref;
        pin2_passive_builder = pc.bottomPins[0];
      }
      pin2_passive_builder.lastDx = 0;
      pin2_passive_builder.lastDy = normDy;
    }

    // 2. Add connection points between end of entry segment and passive's input pin
    this.circuit.connectionPoints.push({
      ref: incomingRefOriginal, // Refers to the entity this PinBuilder chain started from/last explicit line ended with.
      x: entryConnectX,
      y: entryConnectY,
    });
    this.circuit.connectionPoints.push({
      ref: pin1_passive_ref,    // Refers to the passive component's entry pin.
      x: entryConnectX,
      y: entryConnectY,
    });

    // 3. Draw exit segment (1 unit) using pin2_passive_builder's line method.
    // This updates pin2_passive_builder.x, .y to the end of its 1-unit exit segment.
    if (normDx !== 0 || normDy !== 0) {
      pin2_passive_builder.line(normDx, normDy);
    }

    return pin2_passive_builder; // Ready for further chaining from end of exit segment.
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
