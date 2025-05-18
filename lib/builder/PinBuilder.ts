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
    const incomingX = this.x;
    const incomingY = this.y;
    const incomingRef = this.ref;

    const pc = this.circuit.chip(); // Create new passive chip

    let pc_target_x: number;
    let pc_target_y: number;
    let pin1_passive_ref: PortReference; // Pin of passive chip that connects to incoming line
    let pin2_passive_builder: PinBuilder; // PinBuilder for the other pin of passive chip (outgoing)

    const incomingDirectionHorizontal = this.lastDx !== 0;

    if (incomingDirectionHorizontal) {
      // Incoming line is horizontal. Passive component will be horizontal.
      // Pin order for horizontal passive (left/right pins): Pin 1 is Left, Pin 2 is Right.
      const lineCameFromLeft = this.lastDx > 0; // e.g. ----> current_pos (ends at incomingX,Y)

      if (lineCameFromLeft) { // Connect to left pin of passive (Pin 1), output is right pin (Pin 2)
        // Left pin of pc is at (pc_target_x + 0, pc_target_y + 1)
        // We want this to be (incomingX, incomingY).
        pc_target_x = incomingX;
        pc_target_y = incomingY - 1;
        pc.at(pc_target_x, pc_target_y);
        pc.leftside(1).rightside(1); // Defines pc.leftPins, pc.rightPins with correct coords
        pin1_passive_ref = pc.leftPins[0].ref; // pc.leftPins[0] is Pin 1
        pin2_passive_builder = pc.rightPins[0]; // pc.rightPins[0] is Pin 2
      } else { // Line came from right. Connect to right pin of passive (Pin 2), output is left pin (Pin 1)
        // Right pin of pc is at (pc_target_x + 4, pc_target_y + 1)
        // We want this to be (incomingX, incomingY).
        pc_target_x = incomingX - 4;
        pc_target_y = incomingY - 1;
        pc.at(pc_target_x, pc_target_y);
        pc.leftside(1).rightside(1);
        pin1_passive_ref = pc.rightPins[0].ref; // pc.rightPins[0] is Pin 2
        pin2_passive_builder = pc.leftPins[0]; // pc.leftPins[0] is Pin 1
      }
      pin2_passive_builder.lastDx = this.lastDx; // Continue in same horizontal direction
      pin2_passive_builder.lastDy = 0;
    } else { // Incoming line is vertical. Passive component will be vertical.
      // Pin order for vertical passive (bottom/top pins): Pin 1 is Bottom, Pin 2 is Top.
      const lineCameFromBelow = this.lastDy > 0; // e.g. current_pos is visually above previous point

      if (lineCameFromBelow) { // Connect to bottom pin of passive (Pin 1), output is top pin (Pin 2)
        // Bottom pin of pc is at (pc_target_x + 1, pc_target_y + 2) [height is 3]
        // We want this to be (incomingX, incomingY).
        pc_target_x = incomingX - 1;
        pc_target_y = incomingY - 2;
        pc.at(pc_target_x, pc_target_y);
        pc.topside(1).bottomside(1); // Defines pc.topPins, pc.bottomPins with correct coords
        pin1_passive_ref = pc.bottomPins[0].ref; // pc.bottomPins[0] is Pin 1
        pin2_passive_builder = pc.topPins[0];    // pc.topPins[0] is Pin 2
      } else { // Line came from above. Connect to top pin of passive (Pin 2), output is bottom pin (Pin 1)
        // Top pin of pc is at (pc_target_x + 1, pc_target_y + 0)
        // We want this to be (incomingX, incomingY).
        pc_target_x = incomingX - 1;
        pc_target_y = incomingY;
        pc.at(pc_target_x, pc_target_y);
        pc.topside(1).bottomside(1);
        pin1_passive_ref = pc.topPins[0].ref;    // pc.topPins[0] is Pin 2
        pin2_passive_builder = pc.bottomPins[0]; // pc.bottomPins[0] is Pin 1
      }
      pin2_passive_builder.lastDx = 0;
      pin2_passive_builder.lastDy = this.lastDy; // Continue in same vertical direction
    }

    // Connect incoming line to pin1_passive_ref of passive chip
    this.circuit.connectionPoints.push({
      ref: incomingRef,
      x: incomingX,
      y: incomingY,
    });
    // Ensure pin1_passive_ref's associated PinBuilder has its x,y at incomingX, incomingY
    // This should be true due to how pc.at() was calculated.
    this.circuit.connectionPoints.push({
      ref: pin1_passive_ref,
      x: incomingX,
      y: incomingY,
    });

    // The returned PinBuilder (pin2_passive_builder) is now the active one.
    // Its x,y are its grid coords. lastDx, lastDy are set.
    return pin2_passive_builder;
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
