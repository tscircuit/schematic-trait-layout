import type { CircuitBuilder } from "./CircuitBuilder"

/**
 * Split a circuit into two parts, one on the left and one on the right, along
 * the center of a chip.
 */
export const bifurcateXCircuit = (
  circuit: CircuitBuilder,
  chipId: string,
): [CircuitBuilder, CircuitBuilder] => {
  // 1. Find chip and its center X
  const chip = circuit.chips.find(c => c.chipId === chipId)
  if (!chip) throw new Error(`Chip ${chipId} not found`)
  const centerX = chip.x + 2.5 // width=5, so center is x+2.5

  // 2. Clone circuit twice
  const left = circuit.clone()
  const right = circuit.clone()

  // 3. Remove chips/lines/labels/points strictly to right/left
  function filterSide(circ: CircuitBuilder, keepLeft: boolean) {
    // Remove chips
    circ.chips = circ.chips.filter(c => {
      const chipLeft = c.x
      const chipRight = c.x + 4
      if (keepLeft) return chipRight <= centerX
      else return chipLeft >= centerX
    })
    const keptChipIds = new Set(circ.chips.map(c => c.chipId))
    // Remove lines
    circ.lines = circ.lines.filter(line => {
      const chips = [line.start.ref, line.end.ref]
        .map(ref => (ref as any).boxId)
        .filter(Boolean)
      return chips.every(id => keptChipIds.has(id))
    })
    // Remove netLabels
    circ.netLabels = circ.netLabels.filter(label => {
      const ref = (label.fromRef as any).boxId
      return !ref || keptChipIds.has(ref)
    })
    // Remove connectionPoints
    circ.connectionPoints = circ.connectionPoints.filter(cp => {
      const ref = (cp.ref as any).boxId
      return !ref || keptChipIds.has(ref)
    })
  }
  filterSide(left, true)
  filterSide(right, false)
  return [left, right]
}
