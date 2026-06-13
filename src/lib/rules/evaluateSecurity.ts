/**
 * Pure, side-effect-free security severity evaluator.
 *
 * Given a logical check, its enabled state, and the device's inventory context,
 * returns the severity to render. Defaults reproduce ReportMate's historical
 * coloring; org rules override it (e.g. "shared devices with encryption off
 * shouldn't be red"). Kept pure so the identical logic ports to Swift/C#.
 */

import {
  RuleCondition,
  SecurityConfig,
  SecurityRule,
  Severity,
} from "@/src/lib/settings/types"

/** Canonical-key -> value map for a single device (e.g. { usage: "Shared" }). */
export type InventoryContext = Record<string, string | undefined>

function stateMatches(state: SecurityRule["state"], enabled: boolean): boolean {
  if (!state || state === "any") return true
  return state === "enabled" ? enabled : !enabled
}

/** Returns the number of inventory conditions matched, or -1 if the rule's
 * `when` does not match the context at all. More matched conditions = more
 * specific rule. A rule with no `when` matches everything at specificity 0. */
function whenSpecificity(when: RuleCondition | undefined, ctx: InventoryContext): number {
  if (!when || !when.inventory) return 0
  let matched = 0
  for (const [key, op] of Object.entries(when.inventory)) {
    if (!op) continue
    const value = ctx[key]
    if (op.in && (value === undefined || !op.in.includes(value))) return -1
    if (op.eq !== undefined && value !== op.eq) return -1
    if (op.ne !== undefined && value === op.ne) return -1
    matched += 1
  }
  return matched
}

function baselineSeverity(
  check: string,
  enabled: boolean,
  config: SecurityConfig
): Severity {
  const def = config.defaults?.[check]
  if (def) return enabled ? def.enabledSeverity : def.disabledSeverity
  // Generic fallback for unknown checks: on is fine, off is a soft warning.
  return enabled ? "ok" : "warning"
}

export function evaluateSecurity(
  check: string,
  enabled: boolean | undefined,
  ctx: InventoryContext,
  config: SecurityConfig
): Severity {
  if (enabled === undefined) return "unknown"

  let severity = baselineSeverity(check, enabled, config)
  let bestSpecificity = -1

  const rules = config.rules ?? []
  for (const rule of rules) {
    if (rule.enabled === false) continue
    if (rule.check !== check) continue
    if (!stateMatches(rule.state, enabled)) continue
    const spec = whenSpecificity(rule.when, ctx)
    if (spec < 0) continue
    // Most-specific wins; ties broken by later-in-array (>= so later overrides).
    if (spec >= bestSpecificity) {
      bestSpecificity = spec
      severity = rule.severity
    }
  }

  return severity
}
