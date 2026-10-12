# Step03 independent acceptance reference (preparation only)

This directory is ignored reviewer evidence. It is not production code, a new master, a changed threshold, a candidate review or approval. No candidate algorithm was inspected or used to calculate expectations. The frozen plans and Pixel Contract remain authoritative; concrete implementation names are intentionally unspecified.

## Hard Step03 scope

Source Asset, immutable Asset/Recipe revisions, Material/Surface/Style Profile, fixed Transition, generic Animation Clip and typed engine-independent Tile IR must exist with source/IR validation. Separate RAW_SOURCE, VALIDATED_SOURCE, COMPILABLE_RECIPE and BUILT_ARTIFACT by achieved semantics. A file record cannot become Validated by assertion alone; an invalid source/recipe/IR must yield a precise rejection or explicit repair state. Domain Built records do not establish native MZ compiler/pack/runtime acceptance.

The core must remain framework independent. No Nest/Prisma/DOM/provider or numeric MZ Tile ID in generic domain/pixel/IR. Actual image decoding belongs to an explicit bounded infrastructure boundary. HTTP JSON/Zod/OpenAPI still belong to contracts; production Node consumes built JS via package exports. New packages must be registered in direction checks.

## Pixel reference

RGBA8 row-major, top-left origin, straight alpha, sRGB byte encoding. Alpha=0 requires RGB=0; partial alpha is preserved. Inputs retain strict RGBA8 PNG/sRGB/ICC/animation/color limits until an explicitly versioned repair or conversion is defined. Coordinates and dimensions are safe integers, positive sizes, half-open bounds, no silent clipping/rounding/filling. Cropping/nearest copying must preserve exact transparent/partial values. Integer nearest-neighbor uses floor(x/factor), floor(y/factor), produces no new colors, rejects invalid factor/oversized output before allocation. Other scaling needs an explicit choice and revalidation; neither AI downsampling nor implicit default filtering is permitted.

Source-over arithmetic is calculated independently in literal-reference.json. Normalize sRGB component s=c/255; linearize with s/12.92 below 0.04045 and ((s+0.055)/1.055)^2.4 otherwise. Ao=As+Ad(1-As); linear straight RGB=(CsAs+CdAd(1-As))/Ao. Encode once by the inverse transfer and round/clamp once to bytes; zero Ao gives zero RGB. Example white alpha128 over black alpha255 produces RGB188, alpha255. Red alpha128 over blue alpha128 produces [213,0,156,192].

Crop and nearest cases are literal row/column selections. Overlap cases use two distinct Buffer/Uint8Array views of one backing array, including two rows: every source row must come from the original snapshot before any target write. The 2-row expected backing red values are [10,10,20,30,40]. This prevents object-identity or per-row-copy shortcuts from losing pixels.

Logical density is separate from tile size. The art baseline is 2x2 output pixels per logical pixel / logical tile24; diagnostic 1px density is explicitly different. Validate advertised density against dimensions/pixel blocks where the formal semantic requires it. Never silently make arbitrary art match a density declaration.

## Fixed shoreline, generic frames and validation

Exact grass/water/mask/style/parameter revision/hash references and provenance must bind the recipe. Boundary ownership, static/animated regions and geometry remain explicit. Fixed static mask and shoreline pixels cannot drift between frames, while interior frame content may change. The literal 2x2 selector reference intentionally defines geometry mathematically without inventing a new accepted mask encoding. Step01 occupied baked samples are opaque; general source-over supports partial alpha only under its declared operation, and does not broaden native delivery semantics.

Generic Animation Clip supports explicit frame count, sequence/durations/time semantics, loop rules and actual frame references. Frames/regions must be in bounds and typed, refer to existing exact revisions, and agree with geometry/style/density constraints. Reject missing or contradictory identity/revision references, empty/nonfinite/nonpositive durations, noninteger/out-of-range sequence indices, invalid RGBA buffers and hidden transparent RGB. Duration integrality follows the explicitly declared time unit (update counts are integers); the frozen generic clip requirement does not independently outlaw fractional wall-clock durations. Do not introduce MZ's numeric IDs or silently coerce arbitrary generic animation into its 3-source Native shape. Native sequence/profile compatibility is Step04.

Immutability includes ownership: creating a revision/snapshot must prevent later mutation through caller objects, nested arrays, pixel buffers, getters or shared views from changing recorded content/hash/dependency facts. Test retained input aliases and aliases returned from core APIs as applicable. Frozen wrappers alone do not freeze typed-array backing storage. Recorded derived hashes must correspond to actual owned pixels and declared dependency snapshots.

## Version acceptance

The five explicit history cases in literal-reference.json separate new-version availability, current dependency mismatch and historical verification failure. Publish grass4 never mutates grass3, recipe5 or BuildK. Current adoption affects only current derived products that depend on the adopted identity/version. New recipe6 binds exact new references, and BuildL owns that snapshot. BuildK remains valid and reproducible under old references unless its own bytes/references fail validation. Do not collapse these facts into one stale flag or compare historical builds against newest global versions.

## Resource budget acceptance

Existing input maxima are encoded4MiB / decoded768x576 pixels. New media paths must bound reads before allocation; constrain metadata expansion and unsupported/orientation/color paths before native decoding; bound output pixels/buffer products safely; define actual memory/CPU/time/concurrency or justified process isolation. Review the actual normal-input infrastructure and its documented limits, then test bounded deterministic rejection/success. Caller buffers cannot be described as already-bounded network ingest. Production execution must not claim a timeout/concurrency guarantee that is merely a test timeout or post-allocation size check. No hostile media or unrelated security probing is necessary.

## Explicit later-stage limits

No Step04 Compiler/Fragment/native adaptation, Step05 pack/slot allocation, Step06 durable runner/storage/CAS/backup, Step07 complete Studio/delivery preview, Step08 real provider/paid call/Prompt Composer, Step09 final AI quality threshold or Step10 original Host acceptance is authorized here. Preserve old manifests, masters, profiles, PNGs and tests. New evidence records reference immutable builds; source integrity is checked before/after the exact freeze. Necessary Step02 integration/browser/privacy and four-PNG regressions occur only after freeze. Original Native Host remains NOT_EXECUTED; Map003 remains pending user evidence.

No conflict requiring clarification was found among the approved Step03 scope, frozen pixel requirements and the security-runtime companion. Sharp0.34.5 is a historical contract runtime record; Step02 explicitly owns its patched0.35.5/libvips8.18.7 runtime revision while preserving pixel rules.
