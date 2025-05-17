import type {
  CircuitBuilder,
  BoxPinLayoutEntry,
  Side,
} from "lib/builder"
import type { PortReference } from "lib/input-types"

export const mergeCircuits = (opts: {
  circuit1: CircuitBuilder
  circuit2: CircuitBuilder
  circuit1ChipId: string // Becomes the ID of the merged chip
  circuit2ChipId: string
}): CircuitBuilder => {
  const { circuit1, circuit2, circuit1ChipId, circuit2ChipId } = opts

  // 1. Create the mergedCircuit, starting as a shallow clone of circuit1.
  //    We cast to 'any' to access the private _clone method.
  const mergedCircuit = (circuit1 as any)._clone()

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
  let currentMergedPinCounter = 1

  // Process chip2's "left" pins to become the merged chip's "left" pins
  const chip2Layout = (circuit2 as any).boxPinLayouts[circuit2ChipId] || []
  const chip2LeftPinsLayout = chip2Layout.find((e: any) => e.side === "left")
  if (chip2LeftPinsLayout) {
    newBoxLayout.push({
      side: "left",
      count: chip2LeftPinsLayout.count,
      startGlobalPin: currentMergedPinCounter,
    })
    for (let i = 0; i < chip2LeftPinsLayout.count; i++) {
      const originalPinOnChip2 = chip2LeftPinsLayout.startGlobalPin + i
      pinMapChip2ToMerged[originalPinOnChip2] = currentMergedPinCounter + i
    }
    currentMergedPinCounter += chip2LeftPinsLayout.count
    mergedChipBox.leftPinCount = chip2LeftPinsLayout.count
  } else {
    mergedChipBox.leftPinCount = 0
  }

  // Process chip1's "right" pins to become the merged chip's "right" pins
  // Note: chip1Layout is from the original circuit1, not the clone, to get original pin numbers.
  const chip1Layout = (circuit1 as any).boxPinLayouts[circuit1ChipId] || []
  const chip1RightPinsLayout = chip1Layout.find((e: any) => e.side === "right")
  if (chip1RightPinsLayout) {
    newBoxLayout.push({
      side: "right",
      count: chip1RightPinsLayout.count,
      startGlobalPin: currentMergedPinCounter,
    })
    for (let i = 0; i < chip1RightPinsLayout.count; i++) {
      const originalPinOnChip1 = chip1RightPinsLayout.startGlobalPin + i
      pinMapChip1ToMerged[originalPinOnChip1] = currentMergedPinCounter + i
    }
    currentMergedPinCounter += chip1RightPinsLayout.count
    mergedChipBox.rightPinCount = chip1RightPinsLayout.count
  } else {
    mergedChipBox.rightPinCount = 0
  }

  // Top/bottom pins are taken from chip1 (already in cloned mergedChipBox) or set to 0 if not specified.
  // For this specific merge type, we ensure they are from chip1 or default.
  mergedChipBox.topPinCount = chip1BoxOriginal.topPinCount
  mergedChipBox.bottomPinCount = chip1BoxOriginal.bottomPinCount
  // Add top/bottom layouts from chip1 if they exist
  const chip1TopPinsLayout = chip1Layout.find((e: any) => e.side === "top")
  if (chip1TopPinsLayout) {
    newBoxLayout.push({ ...chip1TopPinsLayout, startGlobalPin: currentMergedPinCounter })
    currentMergedPinCounter += chip1TopPinsLayout.count
  }
  const chip1BottomPinsLayout = chip1Layout.find((e: any) => e.side === "bottom")
  if (chip1BottomPinsLayout) {
    newBoxLayout.push({ ...chip1BottomPinsLayout, startGlobalPin: currentMergedPinCounter })
    currentMergedPinCounter += chip1BottomPinsLayout.count
  }


  ;(mergedCircuit as any).boxPinLayouts[circuit1ChipId] = newBoxLayout

  // 4. Determine coordinate offset for circuit2 elements
  const originC1 = (circuit1 as any).chipOrigins.get(circuit1ChipId) ?? { x: 0, y: 0 }
  const originC2 = (circuit2 as any).chipOrigins.get(circuit2ChipId) ?? { x: 0, y: 0 }
  const offsetX = originC1.x - originC2.x
  const offsetY = originC1.y - originC2.y

  // 5. Transfer and transform elements from circuit2 to mergedCircuit
  // 5a. Other Boxes (not circuit2ChipId)
  for (const boxC2 of circuit2.netlistComponents.boxes) {
    if (boxC2.boxId === circuit2ChipId) continue
    if (!mergedCircuit.netlistComponents.boxes.find((b) => b.boxId === boxC2.boxId)) {
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
    if (!mergedCircuit.netlistComponents.nets.find((n) => n.netId === netC2.netId)) {
      mergedCircuit.netlistComponents.nets.push(structuredClone(netC2))
    }
  }

  // 5c. Grid (Traces and Overlay) from circuit2
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
    const c2Origin = (circuit2 as any).chipOrigins.get(circuit2ChipId) ?? { x:0, y:0 }
    const c2Dims = (circuit2 as any)._calculateChipVisualDimensions({
        left: chip2BoxOriginal.leftPinCount, right: chip2BoxOriginal.rightPinCount,
        top: chip2BoxOriginal.topPinCount, bottom: chip2BoxOriginal.bottomPinCount
    });
    const originalX = Number(xStr);
    const originalY = Number(yStr);

    if (originalX >= c2Origin.x && originalX < c2Origin.x + c2Dims.bodyWidth &&
        originalY >= c2Origin.y && originalY < c2Origin.y + c2Dims.bodyHeight &&
        char.match(/^[\d┌┐└┘─│┼]$/)) { // Basic check for chip body/pin number chars
        continue;
    }

    const x = originalX + offsetX
    const y = originalY + offsetY
    ;(mergedCircuit.grid as any).putOverlay(x, y, char)
  }

  // 5d. coordinateToNetItem from circuit2
  for (const [key, portRefC2] of (circuit2 as any).coordinateToNetItem) {
    const [xStr, yStr] = key.split(",")
    const x = Number(xStr) + offsetX
    const y = Number(yStr) + offsetY
    const newKey = `${x},${y}`

    let newPortRef = structuredClone(portRefC2) as PortReference
    if ("boxId" in newPortRef && newPortRef.boxId === circuit2ChipId) {
      newPortRef.boxId = circuit1ChipId
      newPortRef.pinNumber = pinMapChip2ToMerged[portRefC2.pinNumber]!
      if (newPortRef.pinNumber === undefined) continue
    }

    const existingItem = (mergedCircuit as any).coordinateToNetItem.get(newKey)
    if (existingItem) {
      (mergedCircuit as any).connectItems(existingItem, newPortRef)
    } else {
      (mergedCircuit as any).coordinateToNetItem.set(newKey, newPortRef)
    }
  }

  // 6. Remap and Add Connections from circuit2
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
        (mergedCircuit as any).connectItems(remappedPorts[i], remappedPorts[i + 1])
      }
    }
  }

  // 7. Redraw the merged chip body and pin numbers
  const mergedChipOrigin = (mergedCircuit as any).chipOrigins.get(circuit1ChipId) ?? { x: 0, y: 0 }
  const pinCounts = {
    left: mergedChipBox.leftPinCount,
    right: mergedChipBox.rightPinCount,
    top: mergedChipBox.topPinCount,
    bottom: mergedChipBox.bottomPinCount,
  }
  const { bodyWidth, bodyHeight } = (mergedCircuit as any)._calculateChipVisualDimensions(pinCounts)

  // Clear existing overlay for the chip's area before redrawing.
  // This is a simple rectangular clear; a more precise clear would be better.
  for (let i = 0; i < bodyWidth; i++) {
    for (let j = 0; j < bodyHeight; j++) {
        const key = `${mergedChipOrigin.x + i},${mergedChipOrigin.y + j}`;
        if ((mergedCircuit.grid as any).overlay.has(key)) {
            const char = (mergedCircuit.grid as any).overlay.get(key);
            // Only delete if it's likely part of an old chip body/pin number
             if (char.match(/^[\d┌┐└┘─│┼]$/)) {
                (mergedCircuit.grid as any).overlay.delete(key);
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

  return mergedCircuit
}
