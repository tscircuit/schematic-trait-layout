import type { InputNetlist } from "lib/input-types"
import { normalizeNetlist } from "./normalizeNetlist"

export const scoreSimilarity = (
  input: InputNetlist,
  template: InputNetlist,
): number => {
  const { normalizedNetlist: normInput } = normalizeNetlist(input)
  const { normalizedNetlist: normTemplate } = normalizeNetlist(template)

  // TODO: Implement similarity scoring
  return 0
}
