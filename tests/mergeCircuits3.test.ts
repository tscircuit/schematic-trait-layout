import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { mergeCircuits } from "lib/expanding/mergeCircuits"

test("mergeCircuits3 – merge after flipX reproduces mis-merge bug", () => {
  /* ── Build a left-half box ─────────────────────────────────────── */
  const left = circuit()
  const U1 = left.chip().leftpins(2)
  U1.pin(1).line(-2, 0).label()
  U1.pin(2).line(-2, 0).label()

  /* ── Clone + flip to make a right-half box ─────────────────────── */
  const right = left.clone().flipX()

  /* ── Merge right-half (circuit1) with left-half (circuit2) ─────── */
  const merged = mergeCircuits({
    circuit1: right,               // provides RIGHT pins, will be base
    circuit2: left,                // provides LEFT  pins
    circuit1ChipId: right.chips[0]!.chipId,
    circuit2ChipId: left.chips[0]!.chipId,
  })

  /* Expected (correct) rendering – currently NOT produced → test fails. */
  expect(`\n${merged.toString()}\n`).toMatchInlineSnapshot(`
    "
      ┌───┐
    L─┤1 4├─L
    L─┤2 3├─L
      └───┘
    "
  `)
})
