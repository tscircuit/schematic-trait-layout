import type { CircuitBuilder } from "lib/builder"

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
  // TODO
}
