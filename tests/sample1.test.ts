import { test, expect } from "bun:test"
import sample1 from "../samples/sample1"

test("sample1", () => {
  expect(sample1().toString()).toMatchInlineSnapshot()
})
