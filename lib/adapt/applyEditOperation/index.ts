import type { CircuitBuilder } from "lib/builder"
import type { EditOperation } from "../EditOperation"
import { applyAddPinsToSide } from "./applyAddPinsToSide"
import { applyAddLabelToPin } from "./applyAddLabelToPin"
import { applyRemovePinsFromSide } from "./applyRemovePinsFromSide"
import { applyClearPin } from "./applyClearPin"
import { applyAddPassiveToPin } from "./applyAddPassiveToPin"
import { applyRemoveChip } from "./applyRemoveChip"
import { applyRemovePinFromSide } from "./applyRemovePinFromSide"
import { applyAddPinToSide } from "./applyAddPinToSide"

/**
 * Mutates the circuit builder, applying the edit operation
 */
export function applyEditOperation(C: CircuitBuilder, op: EditOperation): void {
  switch (op.type) {
    case "add_label_to_pin":
      applyAddLabelToPin(C, op)
      break
    case "add_pins_to_side":
      applyAddPinsToSide(C, op)
      break
    case "remove_pins_from_side":
      applyRemovePinsFromSide(C, op)
      break
    case "add_passive_to_pin":
      applyAddPassiveToPin(C, op)
      break
    case "clear_pin":
      applyClearPin(C, op)
      break
    case "add_pin_to_side":
      applyAddPinToSide(C, op)
      break
    case "remove_pin_from_side":
      applyRemovePinFromSide(C, op)
      break
    case "remove_chip":
      applyRemoveChip(C, op)
      break
  }
}
