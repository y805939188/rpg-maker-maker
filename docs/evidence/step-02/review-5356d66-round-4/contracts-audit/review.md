# Focused static subreview — Step 02 formal round 4/5

Candidate `5356d66e693613f9ce52c4b0ceaddfe2821fffb5`, prior `c3914ec1929e8b5a9571d9ed18fa8feb3c6f17dc`, independent detached worktree `/Users/dingshinn/.codex/worktrees/step-02-review/rpg-maker-maker`.

**No new concrete P0/P1/blocking P2 or test/architecture defect found in this focused scope.** Recommend closing `STEP02-R3-001` once the parent completes its latest candidate runtime, approved four-PNG byte/pixel, and external native-oracle gates. Source/lock upgrade addresses the known affected EXIF decoder; no overall PASS is granted by this helper. No tests/services/builds/requests/MZ/paid calls were executed by this helper.

## Instance and scope

Own resumed actual role/model/effort/client request tier: `step_reviewer / gpt-6.1-sol / ultra / default`. Thread `01a12e00-9302-7dd2-b852-87869d19b515`, turn `01a12e23-36eb-74e0-9099-f9fd55295d81`, actual request `feedback_tags` log `2918999`; own rollout confirms role/model/effort. Server-final remains `UNVERIFIED_NOT_EXPOSED`. No settings or source modifications. Git was clean at preflight and report creation.

Full formal plans/AGENTS/MZ environment were read in the preceding review and are unchanged. Inspected the complete implementation/test/lock and technical-documentation diff, all new 109 test lines, existing PNG sample helper, public exports and build commands, unchanged PNG/preflight ingress, installed Sharp types/defaults/native source, and parent's independent native-runtime inventory. All 41 changed paths are hashed/inventoried; 34 are preserved author evidence for **c391**, not fresh proof for 5356. The large historical evidence bundle is background; parent owns its integrity/publication verification. Existing API/contracts/Gateway, prototype algorithms, Profile, Pixel Contract, old tests and masters have no diff; no repeat full package audit was necessary.

## Repair sufficiency and meaningful tests

The root dependency is exactly `sharp: 0.35.5`; frozen lock selects that version with Node types and native `@img` package/bundle 1.3.4. No retained production lock resolution to Sharp 0.34.5 was found. Installed package Node requirement is >=20.9.0 and libvips requirement >=8.18.7; pinned Node 22.21.1 meets it. Explicit ESM default/type export maps support the existing `import sharp from 'sharp'` under NodeNext. Metadata/raw/png methods and options used by existing code remain present in installed declarations.

Initial read before parent install found expected native package paths absent; no install or repeated native access was attempted by the helper. After parent reported completed installation, helper read installed package/defaults and `.local/review/round4-5356/native-codec-runtime.json`. That independently produced record identifies actual loaded Sharp 0.35.5 native .node and libvips 8.18.7 dylib under this worktree's node_modules; it records libexif 0.6.26, libheif 1.23.5, librsvg 2.63.2, libpng 1.6.58 and zlib-ng 2.3.3. It is parent execution evidence, not author metadata or helper execution.

The new regression checks actual `sharp.versions`, not just package.json; exercises independently assembled valid PNG + ordinary 26-byte Orientation=1 EXIF; asserts exact [1,2,3,255] pixels; starts production Node through public `@tileset/prototype` export; and supplies a self-consistent four-atlas build to preflight. A fabricated manifest intentionally proves accepted-input reachability without implying authorship trust. No hostile offsets/crash/RCE payload is needed to verify patched runtime selection. The test cannot establish general malicious-image safety; its claim is appropriately narrower.

`pnpm test` now builds prototype JS before Vitest, so a clean checkout's Node export test can resolve the built declared JS. Existing root tsconfig includes root tests, so these cases participate in Strict compilation. New tests generate atlases only as inputs for metadata-preservation/preflight coverage; they are not an independent compiler oracle and must not replace the parent's approved PNG comparison or raw-core oracle. Existing cases/goldens/thresholds were not removed or relaxed.

The accepting ingress remains intentional: hashes establish consistency, not author trust, while a patched decoder now handles that metadata. Container limits and rejects remain unchanged. Installed `dist/input.mjs:55` sets autoOrient=false and unlimited=false; constructor documents the same. Native pipeline orientation handling requires the autoOrient flag. No new default silent rotation/normalization was established, and application code calls no rotation/autoOrient. Orientation=1 testing alone is not a universal orientation proof; the direct default/source inspection supports the unchanged behavior conclusion.

## Advisory disposition

These are scoped known advisories rechecked against already-read primary documents; helper ran no fresh audit. Parent owns current audit output and current runtime gates.

| Advisory / native scope | Prior affected condition | Frozen/runtime repair | Recommendation |
| --- | --- | --- | --- |
| GHSA-f88m-g3jw-g9cj, including CVE-2026-35590 / GHSA-jmwm-wc68-mhwm | Sharp <0.35.0; EXIF libvips <=8.18.1, patched >=8.18.2. Current public decoder/supplied-build ingress is real. | Sharp 0.35.5 / loaded libvips 8.18.7 / libexif 0.6.26 exceed fixed range. | Close STEP02-R3-001 after latest independent runtime/PNG/oracle gates. [Sharp](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj), [EXIF](https://github.com/libvips/libvips/security/advisories/GHSA-jmwm-wc68-mhwm). |
| GHSA-rgj7-g3m4-5g8c / libheif | Sharp <0.35.4; fixed prebuilt libheif 1.23.2; AVIF/HEIF conditions, runtime-specific Linux RCE discussion. | Sharp 0.35.5 / loaded libheif 1.23.5 exceed fixed range; current input still PNG only. | Historical version finding repaired; reassess future format/exposure. [Vendor](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c). |
| GHSA-wq5f-xc86-pv6w / librsvg CVE-2026-96889 | Sharp <0.35.5; fixed librsvg 2.63.2; SVG and runtime-specific Linux conditions. | Sharp 0.35.5 / loaded librsvg 2.63.2 meet fixed range; current input still PNG only. | Historical version finding repaired; reassess future format/exposure. [Vendor](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w). |
| GHSA-g7r4-m6w7-qqqr / esbuild | >=0.27.3 <0.28.1, Windows standalone serve+servedir traversal. | Vite's esbuild stays 0.27.7, tsx 0.25.12 is outside range. No standalone esbuild serve was introduced; Mac review host and Linux CI. | Retain one scoped nonblocking low record, not globally clean audit; reassess before affected server/Windows exposure. [Primary GitHub range](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr). |

## Contract provenance and Step 03 handoff

Codec companion documentation explicitly distinguishes historical Sharp 0.34.5 record from current 0.35.5 security revision. The old approved Pixel Contract/Profile IDs and manifests are preserved; new manifests continue to record actual codec/native versions, source commit and lock. Changing dependency/encoder requires new build identity and explicit four-PNG/oracle verification even if source algorithms are identical. The source evidence mapping still describes c391's historical checkpoint; it does not falsely label 5356 independently approved. No Step 03 implementation was introduced.

Current decoder bounds encoded bytes to 4 MiB, pixels to 768x576, and output RGBA length; PNG signature/CRC/RGBA8/ICC/color/animation checks remain. **These are not a complete general media/decode budget.** Supplied-build `readFile` and caller-created buffers already exist before the decoder's byte check, and pixel count alone does not establish bounded metadata expansion, CPU time, concurrency or total memory. This is a required Step 03 handoff boundary, not a newly proven current CLI exploit or new blocking defect introduced by this codec upgrade.

Before broader source normalization/import: formal processing owner must define allowed formats/metadata and explicit orientation/color conversion policy; bound reads before allocation; enforce compressed/decompressed metadata, dimensions and pixel limits; measure decode/time/concurrency budgets and choose worker/process isolation as needed. Renew negative container/resource and deterministic pixel tests against the actual patched runtime, without borrowing the four golden PNGs as proof for arbitrary files. Gateway/HTTP upload/remote result exposure remains future work and needs its own budget/format gate. The core must stay independent of Nest/Prisma/provider.

## Limits

The helper's conclusion is static plus read-only inspection of parent-produced native inventory. Latest full check, metadata cases, browser/API/DB, publication integrity/refusal, four-PNG comparison, audit and native oracle are NOT_EXECUTED_BY_HELPER and remain parent's responsibilities. No approval/merge/push or candidate edits; only this new ignored report directory was written. All prior reports are preserved.
