import { test, expect } from "bun:test"
import { getPinSideIndex } from "lib/builder/getPinSideIndex"
import type { Side } from "lib/input-types"

test("getPinSideIndex", () => {
  const chipDimensions = {
    leftSideCount: 2,
    rightSideCount: 2,
  }

  const results: Record<string, { side: Side; indexOnSide: number }> = {}
  for (let i = 1; i <= 4; i++) {
    results[`getPinSideIndex(${i}, ${JSON.stringify(chipDimensions)})`] =
      getPinSideIndex(i, chipDimensions)
  }

  expect(results).toMatchInlineSnapshot(`
    {
      "getPinSideIndex(1, {\\"leftSideCount\\":2,\\"rightSideCount\\":2})": {
        "indexOnSide": 0,
        "side": "left",
      },
      "getPinSideIndex(2, {\\"leftSideCount\\":2,\\"rightSideCount\\":2})": {
        "indexOnSide": 1,
        "side": "left",
      },
      "getPinSideIndex(3, {\\"leftSideCount\\":2,\\"rightSideCount\\":2})": {
        "indexOnSide": 0,
        "side": "right",
      },
      "getPinSideIndex(4, {\\"leftSideCount\\":2,\\"rightSideCount\\":2})": {
        "indexOnSide": 1,
        "side": "right",
      },
    }
  `)
})
