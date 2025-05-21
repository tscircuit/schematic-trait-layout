import type { InputNetlist } from "lib/input-types"
import type { NormalizedNetlist } from "./types"

interface NormalizationTransform {
  boxIdToBoxIndex: Record<string, number>
  netIdToNetIndex: Record<string, number>
}

/**
 * Depth‑first traversal starting from the box with the most pins.
 * Returns {boxId → searchIter} where the root is 0.
 *
 * The algorithm strictly visits **each box once** to avoid the runaway
 * growth / infinite‑loop behaviour that can happen if we keep pushing
 * pins for boxes we've already explored.
 */
const computeSearchIters = (netlist: InputNetlist): Record<string, number> => {
  /* ---------- helpers ---------- */
  const pinsOfBox = (boxId: string): number[] => {
    const pins = new Set<number>()
    for (const c of netlist.connections) {
      for (const p of c.connectedPorts) {
        if ("boxId" in p && p.boxId === boxId) pins.add(p.pinNumber)
      }
    }
    return Array.from(pins).sort((a, b) => a - b) // CCW ⇒ ascending
  }

  // Pre‑index every pin → the connection(s) it appears in for O(1) access
  const connsByPin = new Map<string, typeof netlist.connections>()
  for (const conn of netlist.connections) {
    for (const p of conn.connectedPorts) {
      if ("boxId" in p) {
        const key = `${p.boxId}|${p.pinNumber}`
        if (!connsByPin.has(key)) connsByPin.set(key, [])
        connsByPin.get(key)!.push(conn)
      }
    }
  }

  /* ---------- pick the root ---------- */
  let rootBoxId = ""
  let maxPinCount = -1
  for (const b of netlist.boxes) {
    const count =
      (b.leftPinCount ?? 0) +
      (b.rightPinCount ?? 0) +
      (b.topPinCount ?? 0) +
      (b.bottomPinCount ?? 0)
    if (count > maxPinCount || (count === maxPinCount && b.boxId < rootBoxId)) {
      rootBoxId = b.boxId
      maxPinCount = count
    }
  }

  /* ---------- DFS ---------- */
  const searchIter: Record<string, number> = { [rootBoxId]: 0 }
  const visitedBoxes = new Set<string>([rootBoxId])
  const processedPinKeys = new Set<string>() // avoid re‑processing a pin
  let iter = 1

  // Stack of candidate pins (LIFO). Push pins for a box **once** when we first visit it.
  const stack: { boxId: string; pinNumber: number }[] = []
  const pushPinsOf = (boxId: string) => {
    const pins = pinsOfBox(boxId)
      .slice() // clone
      .reverse() // so smallest pin pops first

    for (const pin of pins) {
      stack.push({ boxId, pinNumber: pin })
    }
  }

  pushPinsOf(rootBoxId)

  while (stack.length) {
    const { boxId, pinNumber } = stack.pop()!
    const pinKey = `${boxId}|${pinNumber}`
    if (processedPinKeys.has(pinKey)) continue // already expanded this pin
    processedPinKeys.add(pinKey)

    const neighbouringBoxes: [string, number][] = [] // [boxId, theirPin]
    const pinConns = connsByPin.get(pinKey) ?? []
    for (const conn of pinConns) {
      for (const p of conn.connectedPorts) {
        if ("boxId" in p && p.boxId !== boxId) {
          neighbouringBoxes.push([p.boxId, p.pinNumber])
        }
      }
    }

    // Keep smallest pin per neighbour, then order by that pin
    const smallestPin: Record<string, number> = {}
    for (const [nbrId, nbrPin] of neighbouringBoxes) {
      smallestPin[nbrId] =
        smallestPin[nbrId] === undefined
          ? nbrPin
          : Math.min(smallestPin[nbrId], nbrPin)
    }

    for (const [nbrId] of Object.entries(smallestPin).sort(
      (a, b) => a[1] - b[1],
    )) {
      if (!visitedBoxes.has(nbrId)) {
        searchIter[nbrId] = iter++
        visitedBoxes.add(nbrId)
        pushPinsOf(nbrId) // **only once per new box**
      }
    }
  }

  return searchIter
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
  const transform: NormalizationTransform = {
    boxIdToBoxIndex: {},
    netIdToNetIndex: {},
  }

  /* ---------- box ordering via DFS ---------- */
  const iterMap = computeSearchIters(netlist)

  console.log(iterMap)

  const finalSortedBoxIds = netlist.boxes
    .map((b) => b.boxId)
    .sort((a, b) => {
      const ai = iterMap[a] ?? Number.MAX_SAFE_INTEGER
      const bi = iterMap[b] ?? Number.MAX_SAFE_INTEGER
      return ai !== bi ? ai - bi : a.localeCompare(b)
    })
  // ───────── populate transforms ─────────
  finalSortedBoxIds.forEach((id, idx) => {
    transform.boxIdToBoxIndex[id] = idx
  })

  const normalizedBoxes: NormalizedNetlist["boxes"] = finalSortedBoxIds.map(
    (id) => {
      const box = netlist.boxes.find((b) => b.boxId === id)!
      return {
        boxIndex: transform.boxIdToBoxIndex[id]!,
        leftPinCount: box.leftPinCount,
        rightPinCount: box.rightPinCount,
        topPinCount: box.topPinCount,
        bottomPinCount: box.bottomPinCount,
      }
    },
  )

  /* ---------- nets (unchanged) ---------- */
  const finalSortedNetIds = netlist.nets
    .map((n) => n.netId)
    .sort((a, b) => a.localeCompare(b))
  finalSortedNetIds.forEach(
    (nid, idx) => (transform.netIdToNetIndex[nid] = idx),
  )

  const normalizedNets: NormalizedNetlist["nets"] = finalSortedNetIds.map(
    (nid) => ({
      netIndex: transform.netIdToNetIndex[nid]!,
    }),
  )

  /* ---------- connections (unchanged) ---------- */
  const normalizedConnections: NormalizedNetlist["connections"] =
    netlist.connections.map((c) => {
      const connectedPorts = c.connectedPorts
        .map((p) => {
          if ("boxId" in p) {
            return {
              boxIndex: transform.boxIdToBoxIndex[p.boxId]!,
              pinNumber: p.pinNumber,
            }
          }
          return { netIndex: transform.netIdToNetIndex[p.netId]! }
        })
        .sort((a, b) => {
          const aIsBox = "boxIndex" in a
          const bIsBox = "boxIndex" in b
          if (aIsBox && !bIsBox) return -1
          if (!aIsBox && bIsBox) return 1
          if (aIsBox && bIsBox) {
            if (a.boxIndex !== b.boxIndex) return a.boxIndex! - b.boxIndex!
            return a.pinNumber! - b.pinNumber!
          }
          return (
            (a as { netIndex: number }).netIndex -
            (b as { netIndex: number }).netIndex
          )
        })
      return { connectedPorts }
    })

  // Ensure deterministic ordering of connections
  normalizedConnections.sort((a, b) => {
    const sig = (x: typeof a) =>
      x.connectedPorts
        .map((p) =>
          "boxIndex" in p ? `b${p.boxIndex}p${p.pinNumber}` : `n${p.netIndex}`,
        )
        .join(",")
    return sig(a).localeCompare(sig(b))
  })

  return {
    normalizedNetlist: {
      boxes: normalizedBoxes,
      nets: normalizedNets,
      connections: normalizedConnections,
    },
    transform,
  }
}
