# Independent review — Step 01 initial candidate

Reviewer: /root/step01_independent_review (did not implement candidate).
Commit: 85e6e713debad39c7107123524082d89615c1fcd.
Branch: codex/step-01-mz-prototype.
Build: step01-191881021dec96b504ba.
Manifest SHA-256: 4ea0762445c3d4469c6bd2fac048af53922eff92084277e7aa50d95e3534dc8a.
Profile: 1.0.0-candidate.1; Pixel Contract: rgba8-srgb-integer-v1.
Result: CHANGES_REQUESTED. MZ editor/game/visual/user evidence remains NOT_EXECUTED.

Read the full approved 822-line product specification, 137-line ten-step plan, and AGENTS.md. Candidate stays within step 01: no web/database/Gateway/production allocator/paid-model implementation. Approved plan files are preserved.

## Executed checks

- node --version: v22.21.1; pnpm --version: 10.20.0.
- pnpm typecheck && pnpm test && pnpm build: exit 0. Vitest counted 20 passing tests across tests/prototype.test.ts and dist/tests/prototype.test.js; only 10 authored tests, each run twice.
- pnpm verify:mz '<licensed newdata>/js/rmmz_core.js' artifacts/step01-191881021dec96b504ba: exit 0. Original pinned core hash matches 4ad828ae6cdd8b526e25591eaffd1ccf5ac4eb753f865f7ff48a0b3c821ff67f; 960 native tile selections, 2,211,840 exact pixels, 241 update states passed. Scope is original Tilemap in VM with stub layer, not GPU/editor/game.
- node .local/reviewer/explore-png.mjs: exit 0; independently constructed container counterexamples, details in png-results.json.
- node .local/reviewer/identity-explore.mjs: exit 0; 30 asynchronous reads yielded 28 unique property insertion orders; details in identity-results.json. Also independently checked every art/mask 2x2 block.
- node .local/reviewer/project-protection.mjs: exit 0; invoked prepare-mz against already-existing exact build project. Child exits 1 with EEXIST; all 623 project-file hashes and file count unchanged. Existing project protection PASS.
- node .local/reviewer/render-oracle.mjs: exit 0; independently called original core and rendered all 48 art source-frame-0 shapes into shape-montage.png. Reviewer saw consistent water-owned straight/convex/concave geometry. This is a prescribed CPU render/visual inspection, not human art approval or normal MZ editor drawing.

## Findings requiring correction

1. [P1] PNG container contract is not enforced by decoded Sharp metadata (src/pixels.ts original lines 32–45). Indexed color with alpha is accepted despite explicitly excluded palette input; valid two-frame APNG is accepted and second frame silently discarded; linear gAMA=100000 is accepted as srgb. Minimal counterexamples are .local/reviewer/palette.png, animated.png, gammaConflict.png. Check original PNG color type/depth, APNG chunks and explicit source-color policy before decoding. Add counterexample regression coverage.
2. [P2] Concurrent side effects give nondeterministic build IDs (scripts/build-prototype.ts original lines 17–20/31–37). sourceHashes insertion order is completion order rather than input order. Same commit/sources/encoder/files can hash to different identity. Preserve stable input order or canonicalize identity serialization; independently verify identical rebuild identity and immutable refusal.
3. [P2] Declared 2x2 logical-pixel density does not hold at radial corners (scripts/make-fixtures.ts lines 50–65). art-ground has 4 nonuniform 2x2 blocks, each water frame 16, mask 8. Geometry should use logical coordinates consistently, or contract/provenance should accurately declare intentional 1px boundary detail. Fixture changes need explicit new version/hashes and renewed art/native checks.
4. [P2] pnpm test includes generated dist/tests (package.json test/build plus tsconfig include); stale compiled tests can execute alongside edited source tests and inflate reported counts. Restrict Vitest to authored tests or exclude dist; do not claim 20 independent cases.

No evidence of overwriting previous user projects or changing approved documents. Immutable output directory protection is implemented via exclusive lock/stage creation and same-filesystem rename; actual identical-build refusal still needs verification after identity correction. Test-project creation deliberately refuses existing build destination.

Native rules match pinned MZ 1.10.0: kind 4/6 ordinary A1 water, kind 16/17 A2 ground, source coordinates, 48 prescribed render indices, source sequence 0/1/2/1, 30 Tilemap.update calls per state. Fixed baked opaque bank is a reasonable candidate, but normal editor selection, preserved handdrawn maps, real game animation and passability are mandatory missing gates. Do not freeze Profile or enter step 02 until those gates and explicit user approval bind a corrected commit/build.

This initial report does not apply automatically to modified source or replacement fixtures. Independent re-review is required for the new candidate.
