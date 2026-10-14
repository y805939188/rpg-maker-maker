# AI Tileset Studio Pack studio-pack version 2

Copy A1.png and A2.png to img/tilesets with stable names. Register both images in the MZ database; Area Type (mode=1), 48px tiles. No project data is automatically modified.

Ground: passage circle (flags=0); water: blocked in all directions (flags low bits=15); no Star/Counter/Bush on occupied slots. Empty B top-left remains Star (flags[0]=16). Unsupported/unused slots are blocked. Baked grass pixels on a water tile remain water collision.

| Logical material | Revision | State | Atlas / kind | Shape-0 Tile ID | Origin |
|---|---:|---|---|---:|---|
| first-water | 2 | ACTIVE | A1 / 4 | 2240 | 384,0 |
| first-grass | 2 | ACTIVE | A2 / 16 | 2816 | 0,0 |

Water only pairs with its recorded groundId and exact recipe/IR/source versions in pack.json. Three source frames play 0→1→2→1, advancing every 30 Tilemap updates. Retired content remains installed and must not be replaced by a different logical material. Intentional revision updates can change appearance; slot identity stays stable.

For existing maps, replace images using the existing filenames and retain database entry/flags/Tile IDs. Never regenerate maps to claim compatibility. Validate first install and old-map replacement separately using docs/step-05/mz-acceptance.md. Native editor/game/visual acceptance and independent Review remain NOT_EXECUTED for this Build; save new evidence referencing manifest/atlas hashes, never edit manifest.json.
