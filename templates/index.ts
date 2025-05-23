import type { CircuitBuilder } from "lib/builder"
import { default as template1 } from "./template1"
import { default as template2 } from "./template2"
import { default as template3 } from "./template3"
import { default as template4 } from "./template4"
import { default as template5 } from "./template5"

export const TEMPLATE_FN_MAP = {
  template1,
  template2,
  template3,
  template4,
  template5,
} satisfies Record<string, () => CircuitBuilder>

export const TEMPLATE_FNS: Array<() => CircuitBuilder> =
  Object.values(TEMPLATE_MAP)
