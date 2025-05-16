import { test, expect } from "bun:test"
import sample1 from "../samples/sample1"

test("sample1", () => {
  const C = sample1()
  expect(C.bodyWidth).toMatchInlineSnapshot(`5`)
  expect(C.bodyHeight).toMatchInlineSnapshot(`5`)
  expect(C.toString()).toMatchInlineSnapshot(`
    "        -----
    +-------+   +---L
    |       |   |
    B    +--+   +---L
    |    |  -----
    L    L"
  `)
})
