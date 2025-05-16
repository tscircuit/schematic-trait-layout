import type { InputNetlist } from "../input-types"
import type { CircuitBuilder } from "../builder"
import * as templates from "../../templates"
import { areNetlistsCompatible } from "./areNetlistsCompatible"

/**
 * Finds the best template that is compatible with the given input netlist.
 *
 * @param inputNetlist The netlist to find a compatible template for.
 * @returns The CircuitBuilder instance of the first compatible template, or null if no match is found.
 */
export const findBestMatch = (
  inputNetlist: InputNetlist,
): CircuitBuilder | null => {
  // Iterate over all exported templates
  for (const templateName in templates) {
    if (Object.prototype.hasOwnProperty.call(templates, templateName)) {
      const templateBuilderFunction = (templates as any)[
        templateName
      ] as () => CircuitBuilder
      if (typeof templateBuilderFunction === "function") {
        const templateCircuit = templateBuilderFunction()
        const templateNetlist = templateCircuit.getNetlist()

        if (areNetlistsCompatible(inputNetlist, templateNetlist)) {
          return templateCircuit // Return the first compatible template's CircuitBuilder
        }
      }
    }
  }

  return null // No compatible template found
}
