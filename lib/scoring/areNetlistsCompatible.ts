import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "./normalizeNetlist"

/**
 * For netlists to be compatible, they must have the same number of boxes. It
 * is ok if the template too many connections to labels and nets, but it must
 * have enough on the right pins as the input.
 */
export const areNetlistsCompatible = (
  input: InputNetlist,
  template: InputNetlist,
): boolean => {
  const { normalizedNetlist: normInput } = normalizeNetlist(input)
  const { normalizedNetlist: normTemplate } = normalizeNetlist(template)

  // TODO implement
  return false
}
