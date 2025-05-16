import type { InputNetlist } from "lib/input-types"

export const scoreSimilarity = (
  input: InputNetlist,
  template: InputNetlist,
): number => {
  const { normalizedNetlist: normInput } = normalizeNetlist(input)
  const { normalizedNetlist: normTemplate } = normalizeNetlist(template)
}
