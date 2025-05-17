import type {
  CircuitBuilder,
  BoxPinLayoutEntry,
  Side,
} from "lib/builder/legacy-circuit"
import type { PortReference } from "lib/input-types"

export const mergeCircuits = (opts: {
  circuit1: CircuitBuilder
  circuit2: CircuitBuilder
  circuit1ChipId: string // Becomes the ID of the merged chip
  circuit2ChipId: string
}): CircuitBuilder => {
  console.log("mergeCircuits: opts", opts)
  const { circuit1, circuit2, circuit1ChipId, circuit2ChipId } = opts

  // 1. Create the mergedCircuit, starting as a shallow clone of circuit1.
  //    We cast to 'any' to access the private _clone method.
  const mergedCircuit = circuit1.clone()
  console.log(
    "mergeCircuits: initial mergedCircuit (clone of C1)",
    mergedCircuit.toString(),
    mergedCircuit.getNetlist(),
  )

  // 2. Get data for the chips to be merged
  const chip1BoxOriginal = circuit1.netlistComponents.boxes.find(
    (b) => b.boxId === circuit1ChipId,
  )!
  const chip2BoxOriginal = circuit2.netlistComponents.boxes.find(
    (b) => b.boxId === circuit2ChipId,
  )!
  const mergedChipBox = mergedCircuit.netlistComponents.boxes.find(
    (b) => b.boxId === circuit1ChipId,
  )!

  // 3. Define pin mappings and update mergedChipBox layout and pin counts
  const pinMapChip1ToMerged: Record<number, number> = {}
  const pinMapChip2ToMerged: Record<number, number> = {}
  const newBoxLayout: BoxPinLayoutEntry[] = []
  let currentMergedPinCounter = 1 // 1-based global pin index for the merged chip

  const chip1LayoutOriginal =
    (circuit1 as any).boxPinLayouts[circuit1ChipId] || []
  const chip2LayoutOriginal =
    (circuit2 as any).boxPinLayouts[circuit2ChipId] || []

  // Determine merge strategy based on which sides have pins
  const c1HasLeftPins = chip1BoxOriginal.leftPinCount > 0
  const c1HasRightPins = chip1BoxOriginal.rightPinCount > 0
  const c2HasLeftPins = chip2BoxOriginal.leftPinCount > 0
  const c2HasRightPins = chip2BoxOriginal.rightPinCount > 0

  // Strategy 1: C1 provides right, C2 provides left (e.g., mergeCircuits1.test.ts)
  // This strategy applies if C1 has only right pins (for L/R merge) and C2 has only left pins.
  if (c1HasRightPins && !c1HasLeftPins && c2HasLeftPins && !c2HasRightPins) {
    console.log("mergeCircuits: Applying Strategy 1 (C1-Right, C2-Left)")
    // Merged Left from C2's Left
    const c2LeftLayout = chip2LayoutOriginal.find((e: any) => e.side === "left")
    if (c2LeftLayout) {
      newBoxLayout.push({
        side: "left",
        count: c2LeftLayout.count,
        startGlobalPin: currentMergedPinCounter,
      })
      for (let i = 0; i < c2LeftLayout.count; i++) {
        const originalPinOnChip2 = c2LeftLayout.startGlobalPin + i
        pinMapChip2ToMerged[originalPinOnChip2] = currentMergedPinCounter + i
      }
      mergedChipBox.leftPinCount = c2LeftLayout.count
      currentMergedPinCounter += c2LeftLayout.count
    } else {
      mergedChipBox.leftPinCount = 0 // Should not happen if c2HasLeftPins is true and layout exists
    }

    // Merged Right from C1's Right
    const c1RightLayout = chip1LayoutOriginal.find(
      (e: any) => e.side === "right",
    )
    if (c1RightLayout) {
      newBoxLayout.push({
        side: "right",
        count: c1RightLayout.count,
        startGlobalPin: currentMergedPinCounter,
      })
      for (let i = 0; i < c1RightLayout.count; i++) {
        const originalPinOnChip1 = c1RightLayout.startGlobalPin + i
        pinMapChip1ToMerged[originalPinOnChip1] =
          currentMergedPinCounter + (c1RightLayout.count - 1 - i) // Reversed
      }
      mergedChipBox.rightPinCount = c1RightLayout.count
      currentMergedPinCounter += c1RightLayout.count
    } else {
      mergedChipBox.rightPinCount = 0 // Should not happen if c1HasRightPins is true and layout exists
    }
    // Strategy 2: C1 provides left, C2 provides right (e.g., mergeCircuits2.test.ts)
    // This strategy applies if C1 has only left pins (for L/R merge) and C2 has only right pins.
  } else if (
    c1HasLeftPins &&
    !c1HasRightPins &&
    c2HasRightPins &&
    !c2HasLeftPins
  ) {
    console.log("mergeCircuits: Applying Strategy 2 (C1-Left, C2-Right)")
    // Merged Left from C1's Left
    const c1LeftLayout = chip1LayoutOriginal.find((e: any) => e.side === "left")
    if (c1LeftLayout) {
      newBoxLayout.push({
        side: "left",
        count: c1LeftLayout.count,
        startGlobalPin: currentMergedPinCounter,
      })
      for (let i = 0; i < c1LeftLayout.count; i++) {
        const originalPinOnChip1 = c1LeftLayout.startGlobalPin + i
        pinMapChip1ToMerged[originalPinOnChip1] = currentMergedPinCounter + i
      }
      mergedChipBox.leftPinCount = c1LeftLayout.count
      currentMergedPinCounter += c1LeftLayout.count
    } else {
      mergedChipBox.leftPinCount = 0 // Should not happen if c1HasLeftPins is true and layout exists
    }

    // Merged Right from C2's Right
    const c2RightLayout = chip2LayoutOriginal.find(
      (e: any) => e.side === "right",
    )
    if (c2RightLayout) {
      newBoxLayout.push({
        side: "right",
        count: c2RightLayout.count,
        startGlobalPin: currentMergedPinCounter,
      })
      for (let i = 0; i < c2RightLayout.count; i++) {
        const originalPinOnChip2 = c2RightLayout.startGlobalPin + i
        pinMapChip2ToMerged[originalPinOnChip2] =
          currentMergedPinCounter + (c2RightLayout.count - 1 - i) // Reversed
      }
      mergedChipBox.rightPinCount = c2RightLayout.count
      currentMergedPinCounter += c2RightLayout.count
    } else {
      mergedChipBox.rightPinCount = 0 // Should not happen if c2HasRightPins is true and layout exists
    }
  } else {
    // Fallback: No specific L/R strategy matched or ambiguous (e.g., chips have pins on multiple sides).
    // Defaulting to 0 left/right pins for the merged chip. Top/bottom from C1 will still be processed.
    mergedChipBox.leftPinCount = 0
    mergedChipBox.rightPinCount = 0
    console.warn(
      `mergeCircuits: No specific left/right pin strategy matched or ambiguous configuration. C1 L/R pins: ${c1HasLeftPins}/${c1HasRightPins}, C2 L/R pins: ${c2HasLeftPins}/${c2HasRightPins}. Defaulting to 0 left/right pins for merged chip.`,
    )
  }

  // Top pins from chip1 (consistent for both strategies)
  const c1TopLayout = chip1LayoutOriginal.find((e: any) => e.side === "top")
  if (c1TopLayout) {
    newBoxLayout.push({
      side: "top",
      count: c1TopLayout.count,
      startGlobalPin: currentMergedPinCounter,
    })
    for (let i = 0; i < c1TopLayout.count; i++) {
      const originalPinOnChip1 = c1TopLayout.startGlobalPin + i
      pinMapChip1ToMerged[originalPinOnChip1] = currentMergedPinCounter + i
    }
    mergedChipBox.topPinCount = c1TopLayout.count
    currentMergedPinCounter += c1TopLayout.count
  } else {
    mergedChipBox.topPinCount = 0
  }

  // Bottom pins from chip1
  const c1BottomLayout = chip1LayoutOriginal.find(
    (e: any) => e.side === "bottom",
  )
  if (c1BottomLayout) {
    newBoxLayout.push({
      side: "bottom",
      count: c1BottomLayout.count,
      startGlobalPin: currentMergedPinCounter,
    })
    for (let i = 0; i < c1BottomLayout.count; i++) {
      const originalPinOnChip1 = c1BottomLayout.startGlobalPin + i
      pinMapChip1ToMerged[originalPinOnChip1] = currentMergedPinCounter + i
    }
    mergedChipBox.bottomPinCount = c1BottomLayout.count
    currentMergedPinCounter += c1BottomLayout.count
  } else {
    mergedChipBox.bottomPinCount = 0
  }
  ;(mergedCircuit as any).boxPinLayouts[circuit1ChipId] = newBoxLayout

  // Update connections in mergedCircuit (originally from C1) that refer to circuit1ChipId
  for (const conn of mergedCircuit.netlistComponents.connections) {
    for (const port of conn.connectedPorts as PortReference[]) {
      if ("boxId" in port && port.boxId === circuit1ChipId) {
        const newPinNumber = pinMapChip1ToMerged[port.pinNumber]
        if (newPinNumber !== undefined) {
          port.pinNumber = newPinNumber
        }
      }
    }
  }

  // Update coordinateToNetItem in mergedCircuit (originally from C1)
  for (const [key, portRef] of (mergedCircuit as any).coordinateToNetItem) {
    if ("boxId" in portRef && portRef.boxId === circuit1ChipId) {
      const newPinNumber = pinMapChip1ToMerged[portRef.pinNumber]
      if (newPinNumber !== undefined) {
        portRef.pinNumber = newPinNumber
      }
      // If newPinNumber is undefined, the pin might have been internalized.
      // For now, we don't delete the coordinate association, assuming it might
      // be part of an internal trace or will be overwritten by C2's items.
    }
  }
  console.log("mergeCircuits: pinMapChip1ToMerged", pinMapChip1ToMerged)
  console.log("mergeCircuits: pinMapChip2ToMerged", pinMapChip2ToMerged)
  console.log(
    "mergeCircuits: newBoxLayout for merged chip",
    circuit1ChipId,
    newBoxLayout,
  )
  console.log(
    "mergeCircuits: mergedChipBox after pin count update",
    mergedChipBox,
  )

  // 4. Determine coordinate offset for circuit2 elements
  const originC1 = (circuit1 as any).chipOrigins.get(circuit1ChipId) ?? {
    x: 0,
    y: 0,
  }
  const originC2 = (circuit2 as any).chipOrigins.get(circuit2ChipId) ?? {
    x: 0,
    y: 0,
  }
  const offsetX = originC1.x - originC2.x
  const offsetY = originC1.y - originC2.y
  console.log("mergeCircuits: originC1", originC1)
  console.log("mergeCircuits: originC2", originC2)
  console.log("mergeCircuits: offsetX, offsetY", offsetX, offsetY)

  // 5. Transfer and transform elements from circuit2 to mergedCircuit
  // 5a. Other Boxes (not circuit2ChipId)
  for (const boxC2 of circuit2.netlistComponents.boxes) {
    if (boxC2.boxId === circuit2ChipId) continue
    if (
      !mergedCircuit.netlistComponents.boxes.find(
        (b) => b.boxId === boxC2.boxId,
      )
    ) {
      mergedCircuit.netlistComponents.boxes.push(structuredClone(boxC2))
      const boxC2Origin = (circuit2 as any).chipOrigins.get(boxC2.boxId)
      if (boxC2Origin) {
        ;(mergedCircuit as any).chipOrigins.set(boxC2.boxId, {
          x: boxC2Origin.x + offsetX,
          y: boxC2Origin.y + offsetY,
        })
      }
      if ((circuit2 as any).boxPinLayouts[boxC2.boxId]) {
        ;(mergedCircuit as any).boxPinLayouts[boxC2.boxId] = structuredClone(
          (circuit2 as any).boxPinLayouts[boxC2.boxId],
        )
      }
    }
  }

  // 5b. Nets
  for (const netC2 of circuit2.netlistComponents.nets) {
    if (
      !mergedCircuit.netlistComponents.nets.find((n) => n.netId === netC2.netId)
    ) {
      mergedCircuit.netlistComponents.nets.push(structuredClone(netC2))
    }
  }

  // 5c. Grid (Traces and Overlay) from circuit2
  console.log(
    "mergeCircuits: C2 grid before transfer",
    circuit2.grid.toString(),
  )
  console.log(
    "mergeCircuits: mergedCircuit grid before C2 trace/overlay transfer",
    mergedCircuit.grid.toString(),
  )
  for (const [key, mask] of (circuit2.grid as any).traces) {
    const [xStr, yStr] = key.split(",")
    const x = Number(xStr) + offsetX
    const y = Number(yStr) + offsetY
    const newKey = `${x},${y}`
    ;(mergedCircuit.grid as any).traces.set(
      newKey,
      ((mergedCircuit.grid as any).traces.get(newKey) ?? 0) | mask,
    )
  }
  for (const [key, char] of (circuit2.grid as any).overlay) {
    const [xStr, yStr] = key.split(",")
    // Skip overlay characters that are part of chip2's body, as it will be redrawn
    // This is a heuristic: check if the coordinate is within chip2's bounding box
    // A more robust check would involve knowing exact body coordinates.
    const c2Origin = (circuit2 as any).chipOrigins.get(circuit2ChipId) ?? {
      x: 0,
      y: 0,
    }
    const c2Dims = (circuit2 as any)._calculateChipVisualDimensions({
      left: chip2BoxOriginal.leftPinCount,
      right: chip2BoxOriginal.rightPinCount,
      top: chip2BoxOriginal.topPinCount,
      bottom: chip2BoxOriginal.bottomPinCount,
    })
    const originalX = Number(xStr)
    const originalY = Number(yStr)

    if (
      originalX >= c2Origin.x &&
      originalX < c2Origin.x + c2Dims.bodyWidth &&
      originalY >= c2Origin.y &&
      originalY < c2Origin.y + c2Dims.bodyHeight &&
      char.match(/^[\d┌┐└┘─│┼]$/)
    ) {
      // Basic check for chip body/pin number chars
      continue
    }

    const x = originalX + offsetX
    const y = originalY + offsetY
    ;(mergedCircuit.grid as any).putOverlay(x, y, char)
  }
  console.log(
    "mergeCircuits: mergedCircuit grid after C2 trace/overlay transfer",
    mergedCircuit.grid.toString(),
  )

  // 5d. coordinateToNetItem from circuit2
  console.log(
    "mergeCircuits: C2 coordinateToNetItem before transfer",
    (circuit2 as any).coordinateToNetItem,
  )
  console.log(
    "mergeCircuits: mergedCircuit coordinateToNetItem before C2 transfer",
    (mergedCircuit as any).coordinateToNetItem,
  )
  for (const [key, portRefC2] of (circuit2 as any).coordinateToNetItem) {
    const [xStr, yStr] = key.split(",")
    const x = Number(xStr) + offsetX
    const y = Number(yStr) + offsetY
    const newKey = `${x},${y}`

    let newPortRef = structuredClone(portRefC2) as PortReference // Ensure it's PortReference
    if ("boxId" in newPortRef && newPortRef.boxId === circuit2ChipId) {
      const mappedPin = pinMapChip2ToMerged[newPortRef.pinNumber]
      if (mappedPin === undefined) {
        // This pin from C2 is not part of the merged chip's external interface
        // (e.g. it was on C2's right side, which is now internal)
        // We might want to remove it or handle it if it connects to something internal from C1.
        // For now, skip adding it to coordinateToNetItem if it's not mapped.
        // However, if it's an internal connection point, this might be wrong.
        // The original code continued if pinNumber was undefined after mapping.
        // Let's ensure it's correctly handled: if not mapped, it's not an external pin.
        continue // Skip if this pin of C2 isn't becoming an external pin of merged chip
      }
      newPortRef.boxId = circuit1ChipId // Switch to merged chip's ID
      newPortRef.pinNumber = mappedPin
    }

    const existingItem = (mergedCircuit as any).coordinateToNetItem.get(newKey)
    if (existingItem) {
      ;(mergedCircuit as any).connectItems(existingItem, newPortRef)
    } else {
      ;(mergedCircuit as any).coordinateToNetItem.set(newKey, newPortRef)
    }
  }
  console.log(
    "mergeCircuits: mergedCircuit coordinateToNetItem after C2 transfer",
    (mergedCircuit as any).coordinateToNetItem,
  )

  // 6. Remap and Add Connections from circuit2
  console.log(
    "mergeCircuits: C2 connections before remapping",
    circuit2.netlistComponents.connections,
  )
  console.log(
    "mergeCircuits: mergedCircuit connections before C2 remapping",
    mergedCircuit.netlistComponents.connections,
  )
  for (const connC2 of circuit2.netlistComponents.connections) {
    const remappedPorts: PortReference[] = []
    for (const portC2 of connC2.connectedPorts as PortReference[]) {
      let remappedPort: PortReference | null = null
      if ("boxId" in portC2) {
        if (portC2.boxId === circuit2ChipId) {
          const newPinNumber = pinMapChip2ToMerged[portC2.pinNumber]
          if (newPinNumber !== undefined) {
            remappedPort = { boxId: circuit1ChipId, pinNumber: newPinNumber }
          }
        } else {
          remappedPort = structuredClone(portC2)
        }
      } else if ("netId" in portC2) {
        remappedPort = structuredClone(portC2)
      }
      if (remappedPort) remappedPorts.push(remappedPort)
    }

    if (remappedPorts.length >= 2) {
      for (let i = 0; i < remappedPorts.length - 1; i++) {
        ;(mergedCircuit as any).connectItems(
          remappedPorts[i],
          remappedPorts[i + 1],
        )
      }
    }
  }
  console.log(
    "mergeCircuits: mergedCircuit connections after C2 remapping",
    mergedCircuit.netlistComponents.connections,
  )

  // 7. Redraw the merged chip body and pin numbers
  const mergedChipOrigin = (mergedCircuit as any).chipOrigins.get(
    circuit1ChipId,
  ) ?? { x: 0, y: 0 }
  const pinCounts = {
    left: mergedChipBox.leftPinCount,
    right: mergedChipBox.rightPinCount,
    top: mergedChipBox.topPinCount,
    bottom: mergedChipBox.bottomPinCount,
  }
  const { bodyWidth, bodyHeight } = (
    mergedCircuit as any
  )._calculateChipVisualDimensions(pinCounts)
  console.log("mergeCircuits: Redraw parameters for merged chip:")
  console.log("  mergedChipOrigin:", mergedChipOrigin)
  console.log("  pinCounts:", pinCounts)
  console.log("  bodyWidth:", bodyWidth, "bodyHeight:", bodyHeight)
  console.log(
    "  boxPinLayouts for merged chip:",
    (mergedCircuit as any).boxPinLayouts[circuit1ChipId],
  )
  console.log(
    "mergeCircuits: mergedGrid before chip redraw",
    mergedCircuit.grid.toString(),
  )

  // Clear existing overlay for the chip's area before redrawing.
  // This is a simple rectangular clear; a more precise clear would be better.
  for (let i = 0; i < bodyWidth; i++) {
    for (let j = 0; j < bodyHeight; j++) {
      const key = `${mergedChipOrigin.x + i},${mergedChipOrigin.y + j}`
      if ((mergedCircuit.grid as any).overlay.has(key)) {
        const char = (mergedCircuit.grid as any).overlay.get(key)
        // Only delete if it's likely part of an old chip body/pin number
        if (char.match(/^[\d┌┐└┘─│┼]$/)) {
          ;(mergedCircuit.grid as any).overlay.delete(key)
        }
      }
    }
  }
  ;(mergedCircuit as any)._drawChipOutlineAndPinNumbers(
    circuit1ChipId,
    mergedChipOrigin.x,
    mergedChipOrigin.y,
    bodyWidth,
    bodyHeight,
    pinCounts,
    (mergedCircuit as any).boxPinLayouts[circuit1ChipId] || [],
    mergedCircuit.grid,
  )
  console.log(
    "mergeCircuits: mergedGrid after chip redraw",
    mergedCircuit.grid.toString(),
  )

  return mergedCircuit
}
