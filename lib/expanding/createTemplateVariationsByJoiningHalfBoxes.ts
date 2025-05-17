import type { CircuitBuilder } from "lib/builder/legacy-circuit"
import { mergeCircuits } from "./mergeCircuits"

/**
 * Create a new template by joining half-boxes from the template and other templates.
 *
 * A half-box is a box with only one side with a pin count (the other side has 0 pins)
 * > We're only considering left/right half-boxes here.
 *
 * First we find all the half-boxes in the template.
 * Then we find all the half-boxes in the other templates.
 * If half-boxes are compatible (same pin count) then we run mergeCircuit on
 * them to get a new template variation.
 */
export const createTemplateVariationsByJoiningHalfBoxes = (
  template: CircuitBuilder,
  otherTemplates: CircuitBuilder[],
): CircuitBuilder[] => {
  const variations: CircuitBuilder[] = []
  const templateHalfBoxes = findHalfBoxes(template)

  for (const otherCircuit of otherTemplates) {
    const otherHalfBoxes = findHalfBoxes(otherCircuit)

    for (const tBox of templateHalfBoxes) {
      for (const oBox of otherHalfBoxes) {
        // Case 1: Template box is Left-Half, Other box is Right-Half.
        // The merged chip needs Left pins from Template box, Right pins from Other box.
        // In mergeCircuits: circuit2 provides Left pins, circuit1 provides Right pins.
        // The resulting merged circuit is based on circuit1.
        if (
          tBox.sideWithPins === "left" &&
          oBox.sideWithPins === "right" &&
          tBox.pinCount === oBox.pinCount
        ) {
          const mergedCircuit = mergeCircuits({
            circuit1: oBox.circuit, // Provides RIGHT pins, base for the new circuit
            circuit2: tBox.circuit, // Provides LEFT pins
            circuit1ChipId: oBox.boxId, // Chip in circuit1 to be merged, ID for the new merged chip
            circuit2ChipId: tBox.boxId, // Chip in circuit2 to be merged
          })
          variations.push(mergedCircuit)
        }
        // Case 2: Template box is Right-Half, Other box is Left-Half.
        // The merged chip needs Right pins from Template box, Left pins from Other box.
        // In mergeCircuits: circuit1 provides Right pins, circuit2 provides Left pins.
        // The resulting merged circuit is based on circuit1.
        else if (
          tBox.sideWithPins === "right" &&
          oBox.sideWithPins === "left" &&
          tBox.pinCount === oBox.pinCount
        ) {
          const mergedCircuit = mergeCircuits({
            circuit1: tBox.circuit, // Provides RIGHT pins, base for the new circuit
            circuit2: oBox.circuit, // Provides LEFT pins
            circuit1ChipId: tBox.boxId, // Chip in circuit1 to be merged, ID for the new merged chip
            circuit2ChipId: oBox.boxId, // Chip in circuit2 to be merged
          })
          variations.push(mergedCircuit)
        }
      }
    }
  }
  return variations
}

// Helper interface for describing a half-box
interface HalfBoxInfo {
  boxId: string
  pinCount: number // Number of pins on the side that has pins (left or right)
  sideWithPins: "left" | "right" // Indicates which side (left/right) has pins
  circuit: CircuitBuilder // Reference to the circuit this box belongs to
}

// Helper function to find left/right half-boxes in a given circuit
function findHalfBoxes(circuit: CircuitBuilder): HalfBoxInfo[] {
  const halfBoxes: HalfBoxInfo[] = []
  if (!circuit.netlistComponents || !circuit.netlistComponents.boxes) {
    return halfBoxes
  }

  for (const box of circuit.netlistComponents.boxes) {
    const isLeftHalf = box.leftPinCount > 0 && box.rightPinCount === 0
    const isRightHalf = box.rightPinCount > 0 && box.leftPinCount === 0

    if (isLeftHalf) {
      halfBoxes.push({
        boxId: box.boxId,
        pinCount: box.leftPinCount,
        sideWithPins: "left",
        circuit,
      })
    } else if (isRightHalf) {
      halfBoxes.push({
        boxId: box.boxId,
        pinCount: box.rightPinCount,
        sideWithPins: "right",
        circuit,
      })
    }
  }
  return halfBoxes
}
