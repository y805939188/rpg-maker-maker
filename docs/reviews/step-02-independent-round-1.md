CHANGES_REQUESTED — Step 02 independent Review round 1/5.

Tested frozen implementation: `8a7d4b9bfa62bc259d6a9485fb58e0277c8a0def` (detached independent worktree `/Users/dingshinn/.codex/worktrees/step-02-review/rpg-maker-maker`). Supplemental author documentation: `3f2a82ffef91b9ed926e5a11acb2c64dc001d2f9`. The supplemental diff is documentation only, including the requirements evidence mapping; no production source was changed. This report does not grant Orchestrator/user approval or authorize the next step.

One runtime-reproduced P1 blocks the basic-security gate. P0=0, P1=1, blocking P2=0, nonblocking P2=1 scoped dependency-risk record, P3=0. All other independently executed engineering, DB, browser, package-export, artifact-binding and inherited-prototype gates passed. No production code, tracked tests/config, fixture or golden was edited.

Reviewer identity: `step_reviewer`, `gpt-6.1-sol`, `ultra`, client request `service_tier=default`, verified from actual child rollout and targeted `logs_2.sqlite` feedback_tags (latest log2847504, thread01a12c0b-2a73-7222-8fee-a4d13e6bcaa1). The separate API/security subreview used the same role/model/effort/default request tier, likewise verified from actual rollout/logs. Server-final tier is not exposed and is NOT_VERIFIED. Capability flags are not treated as actual Fast/Ultrafast selection.

Independent environment: explicit Node22.21.1 and pnpm10.20.0, login:false; project-owned PostgreSQL14.20, database tileset_review,127.0.0.1:55433, SCRAM local/host authentication, private random0600 credentials. API4311/Web5174. No other cluster, original user MZ project, global MZ/NW.js or paid provider was touched. The review API/Web processes were stopped; the isolated DB was restarted and remains ready. Hashes of all233 tracked files match the before-review baseline and frozen commit; staged/unstaged/untracked source status is clean.

## Blocking finding STEP02-R1-001 — P1

Location: `apps/web/vite.config.ts:15` (server configuration15–20); related credential creation `scripts/local-postgres.mjs:76` (ownership.json76–85). Blocks gate: **true**.

The Vite server retains the dependency's workspace-root file allow list and supplies no deny rule for `.local`. The documented database initializer writes the bootstrap password into `.local/postgres/ownership.json`. Vite's `/@fs/` handler therefore serves the same private directory to browser clients, bypassing the Express/Nest boundary. Its default CORS also allows unrelated localhost ports.

Verified reproduction used only the fake marker `REVIEW_CANARY_NOT_A_SECRET`, in `.local/review/public-canary.json` with filesystem permission0600. No real credentials were read or requested. With `pnpm dev` using API4311/Web5174:

```sh
curl -i -H 'Origin: http://127.0.0.1:51999' 'http://127.0.0.1:5174/@fs/Users/dingshinn/.codex/worktrees/step-02-review/rpg-maker-maker/.local/review/public-canary.json'
```

Repeat with suffixes `?raw`, `?import`, `?raw&import` and with same-origin5174. Actual: all8 responses200 and contain the fake marker; plain/raw responses match the private file byte-for-byte. Other-localhost-origin responses carry `Access-Control-Allow-Origin: http://127.0.0.1:51999`, permitting browser read. Expected: private local state and database credentials are unavailable through the development Web server regardless of raw/import transformations. Filesystem0600 does not protect against the process serving its own readable files.

Affected scope: the standard local DB + development workflow and other `.local` state, including any private runtime/project data later kept there. API Host/Origin/custom-header tests cannot establish this separate Vite surface. Existing browser and API tests do not exercise private-file serving.

Recommended repair: prohibit the complete `.local` tree in development file serving, preserve default `.env`/key/.git protections, constrain allowed files to required frontend/shared code and narrow dev CORS. Add a running-Vite regression using benign private canaries for plain/raw/import and alternate localhost-origin requests, while proving normal frontend/shared package loading still works. Do not remove failed probes or relax their expectation. Runtime proof and source/dependency locations: `api-audit/runtime-probes.json`, `api-audit/static-report.json`.

## Independent verification

All commands used the frozen SHA and own database. Full stdout/stderr and command records are preserved in this directory; credential values are not in the public evidence index.

| Gate                                    | Independent result                                                                                      | Evidence                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Frozen install/generation               | pnpm install --frozen-lockfile; pnpm db:generate, exit0                                                 | install.log, db-generate.log                                          |
| Dependency directions/exact direct pins | pnpm check includes boundary check, passed                                                              | check.log                                                             |
| Strict source and new test typing       | passed all workspaces                                                                                   | check.log                                                             |
| ESLint/Prettier                         | passed                                                                                                  | check.log                                                             |
| Vitest                                  | 63/63, including52 preserved prototype tests                                                            | check.log                                                             |
| Clean full production build             | all5 workspaces passed                                                                                  | check.log                                                             |
| Production ESM runtime exports          | all3 export maps imported in actual Node                                                                | check.log                                                             |
| Own PostgreSQL migration                | migration202610120001_step02_project applied                                                            | db-migrate.log                                                        |
| Real HTTP→Prisma write/read             | 3/3 integration tests                                                                                   | integration.log                                                       |
| Production browser loop/Pixi            | project creation, HTTP201, refresh persistence, Pixi ready, no pageerror; screenshot visually inspected | production-e2e.log, e2e/production.json, e2e/production.png           |
| Development browser loop/Pixi           | same actual DB/API/browser loop,1/1                                                                     | dev-e2e.log, e2e/dev.json, e2e/dev.png                                |
| Independent boundary edge probes        | 13/13 expected statuses and safe DTO errors                                                             | api-audit/runtime-probes.json                                         |
| Direct production Node startup/listener | node apps/api/dist/main.js, actual127.0.0.1:4311 listener                                               | runtime-faults.json                                                   |
| Production DB stop/restart              | health200→503SERVICE_UNAVAILABLE→200; own55433 only                                                     | runtime-faults.json, database-lifecycle.log                           |
| Occupied port/invalid bind              | direct built Node exits1, generic message, no URL/password/local-path disclosure                        | runtime-faults.json                                                   |
| Engineering independent publication     | same68-file identity/manifest as author                                                                 | artifact-integrity.json                                               |
| Prototype independent publication       | same4-PNG identity/manifest as author                                                                   | artifact-integrity.json                                               |
| No overwrite                            | both repeated publications reject with expected exit1; all hashes unchanged                             | *overwrite-refusal.log, post-refusal-artifact-integrity.json          |
| External native-core oracle             | 960 selected tiles,2,211,840 pixels,241updates, passed                                                  | native-oracle.log, native-evidence/*.json                             |
| Author evidence binding                 | all28 archived file hashes and12 command commit/exit/log bindings verified; supplemental docs only      | supplemental-evidence-verification.json, author-command-bindings.json |
| No source mutation                      | 233tracked hashes unchanged, exact frozenHEAD, clean Git                                                | round1-source-before.json, round1-source-after.json                   |

The actual source and architecture satisfy the scoped Step02 separation: root diagnostic prototype depends on Sharp/Node; HTTP contracts own Zod/OpenAPI3.0.3; API maps separate Prisma entities to safe JSON DTOs; React/Pixi consumes contracts only; Gateway contains Provider/Executor/recovery/state/default-model/template-snapshot contracts and deep-copy/deep-freeze logic. Completed TaskRecord requires durable artifacts and distinguishes unknown submission, known-ID query and archive retry. No full provider runner, paid call, domain recipe/IR, production slot planner or later-step feature was introduced. CI contains pinned actions/tools and equivalent checks; remote CI itself is NOT_EXECUTED.

## Artifact and Step01 binding

Engineering: `step02-8a7d4b9bfa62-c52e6a5508a18928`, manifestSHA256 `23d5f59a8bd749a93e37c23c1de422a8235b3dff05cc8214ca0deebbca6ed73c`,68files. Prototype: `step01-3b32cba0a6db7fad1fac`, manifestSHA256 `ae263ab357c66d0442a49bb6960b480f24920c3f99249ff0a60386770bfa640a`,4PNGs. Both were independently built here and exactly match author artifacts, including every listed file, exact file set, commit, lock hash, Profile/contract versions and manifest bytes.

Profile remains `mz-native-ground-water/1.0.0-candidate.1`; Pixel Contract remains `rgba8-srgb-integer-v1`; HTTP `http-v1`, Task `task-snapshot-v1`. Approved archived step01 manifest was independently compared: all4PNG hashes, Profile and Pixel Contract are identical. The old core/pixel/compiler algorithms, prototype TS scripts, fixtures, provenance and two plans are unchanged against phase-exit baselinef004d6c; src/index.ts only adds package exports. Original MZ core SHA256 `4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f` is the external oracle.

| PNG               | SHA-256                                                          |
| ----------------- | ---------------------------------------------------------------- |
| diagnostic_A1.png | de08f8bc36b87017afbb62aba946d612e8f4536939c0db707bbbbcbfd93b337f |
| diagnostic_A2.png | b493ecc86e938dc9aa4f389ba6b1b052222baeade6bb1d58dea7b003126330cd |
| art_A1.png        | d896c5c8b62816e844865b2abe12a0d5c1694aceb6cd3c75f93eccbd6c55d9d2 |
| art_A2.png        | 7d60ac8c6072d38736e4027cc25fa23979de6e400b9c66d4f586a108506b2b2b |

This oracle is NodeVM raw core selection/pixel/update verification, not GPU, normal editor painting or game Host acceptance. New MZ drawing/game animation/visual confirmation are NOT_EXECUTED. User-authorized Native Core+upgradedHost phase exit remains valid; Original Native MZ Host remains NOT_EXECUTED until final acceptance no later than Step10; Map003(4,10) remains PENDING_USER_EVIDENCE. None of these statuses were promoted to PASS.

## Scoped nonblocking dependency record STEP02-R1-NB-001 — P2

Location `package.json:44`; frozen pnpm-lock resolves the reported Sharp and esbuild versions. Blocks gate: **false for this Step02 exposure**. `pnpm audit --json` returns exit1 with3high Sharp advisories and1low esbuild advisory, preserved in audit.log; the audit is not globally clean.

The inherited Sharp0.34.5 is reached only by prototype CLI/golden PNG paths, with original container/signature/CRC/RGBA8 checks before Sharp decoding and no API upload/remote image path. The vendor-listed risky GIF/TIFF/VIPS/AVIF/SVG loader inputs are not accepted by this path. esbuild's low advisory requires its Windows standalone development server; this project invokes transforms/builds instead, and current host/CI are Mac/Linux. These scope conclusions are source/exposure inferences, not claims that the dependencies are universally safe. Primary advisories: [Sharp/libvips](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj), [Sharp/libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), [Sharp/librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [esbuild Windows serve](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr).

Track an upgrade with compatible byte/encoding impact review,4PNG comparison and external native oracle; re-evaluate before exposing untrusted media/upload or affected Windows serve use. Preserve source masters/goldens/thresholds during any upgrade. The536KiB initial frontend chunk warning is observed but no current functionality failure was found; UI/performance work remains later-step scope.

Repair of STEP02-R1-001 changes source and requires a new frozen commit/artifacts plus independent round2 review and affected checks. No approval, merge or push was performed by Reviewer.
