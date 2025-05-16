import type { InputNetlist } from "lib/input-types"
import type { NormalizedNetlist } from "./types"

interface NormalizationTransform {
  boxIdToBoxIndex: Record<string, number>
  netIdToNetIndex: Record<string, number>
}

/**
 * A normalized netlist allows netlists to be compared for similarity,
 * superficial differences from ids are removed and items are sorted so that
 * two functionally identical netlists will have the same normalized representation
 */
export const normalizeNetlist = (
  netlist: InputNetlist,
): {
  normalizedNetlist: NormalizedNetlist
  transform: NormalizationTransform
} => {
  // TODO
}
