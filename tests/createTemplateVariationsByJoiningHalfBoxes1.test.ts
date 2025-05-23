import { test, expect } from "bun:test"
import { circuit } from "lib/builder"
import { createTemplateVariationsByJoiningHalfBoxes } from "lib/expanding/createTemplateVariationsByJoiningHalfBoxes"

test("createTemplateVariationsByJoiningHalfBoxes1", () => {
  const T1 = circuit()

  const T1_U1 = T1.chip().leftpins(2)
  T1_U1.pin(1).line(-2, 0).label()
  T1_U1.pin(2).line(-2, 0).label()

  const T2 = circuit()

  const T2_U1 = T2.chip().rightpins(2)
  T2_U1.pin(2).line(2, 0).line(0, -2).label()

  expect(`\n${T1.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    A─┤1  │
    B─┤2  │
      └───┘
    "
  `)
  expect(`\n${T2.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  2├─┐
    │  1├ │
    └───┘ A
    "
  `)

  const T1_flipped = T1.clone().flipX()

  expect(`\n${T1_flipped.toString()}\n`).toMatchInlineSnapshot(`
    "
     U1
    ┌───┐
    │  1├─A
    │  2├─B
    └───┘
    "
  `)

  const variations = createTemplateVariationsByJoiningHalfBoxes(T1, [
    T2,
    T1_flipped,
  ])
  expect(variations.length).toBe(2)
  expect(`\n${variations[0]!.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    A─┤1 4├─┐
    B─┤2 3├ │
      └───┘ A
    "
  `)
  expect(`\n${variations[1]!.toString()}\n`).toMatchInlineSnapshot(`
    "
       U1
      ┌───┐
    A─┤1 4├─A
    B─┤2 3├─B
      └───┘
    "
  `)
})
