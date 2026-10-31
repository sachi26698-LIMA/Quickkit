# Dependency advisory review — 31 October 2026

## Verdict — not a clean full-audit claim

Before: **16 moderate npm entries**. After scoped remediation: **15 moderate npm entries**, all development-only; production audit remains clean. No advisory exclusions, `--force`, global minimatch override, package downgrade or removal of lint rules was used.

All original entries ultimately refer to **one advisory**, GHSA-g3hv-75wg-m249 (CVE-2026-118764), not sixteen independent exploits. Actual root packages were minimatch **3.1.5** and **10.2.6**. npm metadata records all versions below 11.0.1 as affected.

Authoritative sources reviewed:
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://raw.githubusercontent.com/isaacs/minimatch/v11.0.3/changelog.md

The advisory describes `firstPhasePreProcess()` at `optimizationLevel >= 2`, generated globparts entries, and quadratic `secondPhasePreProcess()`. The changelog dates the optimization system to v7. The inspected v3.1.5 implementation has neither preprocessing method nor that optimizationLevel implementation. **Our source/reachability assessment is that this particular vulnerable code is absent in v3.1.5**. This is a project assessment, not an upstream correction of the version range or a guarantee that v3 has no other vulnerabilities. Raw npm findings are retained, not labeled zero.

## Exact installed chains

- quickkit → eslint 9.39.5 → minimatch 3.1.5.
- quickkit → eslint 9.39.5 → @eslint/config-array 0.21.2 → minimatch 3.1.5.
- quickkit → eslint 9.39.5 → @eslint/eslintrc 3.3.7 → minimatch 3.1.5.
- quickkit → eslint-config-next 16.4.3 → eslint-plugin-import 2.32.0 → minimatch 3.1.5.
- quickkit → eslint-config-next 16.4.3 → eslint-plugin-jsx-a11y 6.10.2 → minimatch 3.1.5.
- quickkit → eslint-config-next 16.4.3 → eslint-plugin-react 7.37.5 → minimatch 3.1.5.
- quickkit → eslint-config-next 16.4.3 → typescript-eslint 8.72.1 → @typescript-eslint/typescript-estree 8.72.1 → minimatch **10.2.6 before / 11.0.3 after**.

Other flagged entries propagate through these roots and ESLint peer/dependency ancestry, including duplicated eslint-utils copies. Original report and full graph: `audit-before.json`, `dependency-tree-before.json`. Post-change exact minimatch chains: `minimatch-chains-after.txt`.

## All 16 original entries accounted for

| npm entry | Installed version(s) | Immediate advisory ancestry | After remediation |
|---|---|---|---|
| `@eslint-community/eslint-utils` | 4.10.1, 4.9.1 | eslint | Residual via v3/ESLint ancestry |
| `@eslint/config-array` | 0.21.2 | minimatch | Residual via v3/ESLint ancestry |
| `@eslint/eslintrc` | 3.3.7 | minimatch | Residual via v3/ESLint ancestry |
| `@next/eslint-plugin-next` | 16.4.3 | @eslint-community/eslint-utils | Residual via v3/ESLint ancestry |
| `@typescript-eslint/eslint-plugin` | 8.72.1 | @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/utils, eslint | Residual via v3/ESLint ancestry |
| `@typescript-eslint/parser` | 8.72.1 | @typescript-eslint/typescript-estree, eslint | Residual via v3/ESLint ancestry |
| `@typescript-eslint/type-utils` | 8.72.1 | @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint | Residual via v3/ESLint ancestry |
| `@typescript-eslint/typescript-estree` | 8.72.1 | minimatch | Removed from audit |
| `@typescript-eslint/utils` | 8.72.1 | @eslint-community/eslint-utils, @typescript-eslint/typescript-estree, eslint | Residual via v3/ESLint ancestry |
| `eslint` | 9.39.5 | @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, minimatch | Residual via v3/ESLint ancestry |
| `eslint-config-next` | 16.4.3 | @next/eslint-plugin-next, eslint, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react, typescript-eslint | Residual via v3/ESLint ancestry |
| `eslint-plugin-import` | 2.32.0 | minimatch | Residual via v3/ESLint ancestry |
| `eslint-plugin-jsx-a11y` | 6.10.2 | minimatch | Residual via v3/ESLint ancestry |
| `eslint-plugin-react` | 7.37.5 | minimatch | Residual via v3/ESLint ancestry |
| `minimatch` | 3.1.5 + 10.2.6 before; 3.1.5 + 11.0.3 after | GHSA-g3hv-75wg-m249 | Residual via v3/ESLint ancestry |
| `typescript-eslint` | 8.72.1 | @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint | Residual via v3/ESLint ancestry |

The minimatch entry originally covered both v3 and v10, and now covers only v3. Other transitive entries can remain flagged through ESLint ancestry even after their v10 path is fixed.

## Safe remediation performed

Only `@typescript-eslint/typescript-estree`’s minimatch dependency is overridden to exact **11.0.3**. Its inspected consumer uses the named `minimatch(path, pattern, {dot:true})` API; it does not use removed makeRe(), AST or regexp APIs. Verified **80 matching cases captured from v10 before upgrading**, and exercised the actual parser project-service `allowDefaultProject` call. `tests/dependency-compat.test.ts` verifies both the fixed version and preservation of the legacy callable export. Clean npm ci, lint, tests and production build pass. The lockfile pins package integrity; other working versions are unchanged.

A global v11 override is **not safe**: old ESLint/plugin consumers expect the callable CommonJS v3 export and APIs removed in v11. Installed React/accessibility plugin peers do not support ESLint 10. npm’s suggested legacy downgrades were not applied. No same-major patched v3 release was available when queried (latest v3 = 3.1.5). No suppressions or “audit clean” wrappers were added.

## Remaining release decision

**Not all raw audit entries are fixed.** The v10 path is upgraded; 15 broad-version residual entries remain on a v3 path without the described optimizer. Before public release, the owner/security reviewer must explicitly accept this documented, development-only non-applicability assessment **or** wait for a compatible maintained toolchain/upstream advisory correction. This assessment does not accept risk on the owner’s behalf. A blanket upgrade would be less safe than transparently recording the residual findings.

Run a fresh full audit before release; any new advisory needs separate review. Do not replace v3 globally, conceal warnings or weaken lint just to obtain a green number. Remove the scoped override when upstream declares a compatible fixed dependency and tests pass without it.
