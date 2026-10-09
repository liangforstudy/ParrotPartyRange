# Parrot Party Range - handoff

Minecraft Bedrock add-on (behavior pack + resource pack) that makes parrots
dance when they are inside a box around a playing jukebox, instead of the
vanilla 3-block radius. Default box: 10 blocks on X and Z, 6 up, 6 down.
Range and on/off are changeable in game. Built for Bedrock v26.52, used on a
Realm. Current version: **1.5.0** (tested working in singleplayer).

## Quick start for the next chat

1. The user uploads `ParrotPartyRange-source.zip`. Unzip it into a fresh folder.
2. Make sure the tools exist (any Linux container is fine):
   - `python3` (standard library only)
   - `zip` and `unzip`
   - `node` (optional, only used for a JavaScript syntax check)
   - No npm packages, no bundler, no TypeScript. Nothing is compiled; "building"
     just validates the files and zips them.
3. Run:
   ```
   cd ParrotPartyRange-source
   chmod +x build.sh
   ./build.sh
   ```
   Output: `dist/ParrotPartyRange_v<version>.mcaddon`. Send that file to the user.
4. To release a change: edit files under `packs/`, run
   `python3 tools/bump.py 1.6.0` (next version), then `./build.sh`.

## Layout

```
build.sh                    validate + zip into dist/*.mcaddon
tools/check.py              checks run by build.sh (see "Rules" below)
tools/bump.py               set version everywhere (manifests + debug text)
tools/regen_parrot.py       rebuild the parrot overrides from vanilla files
vanilla/                    Mojang's vanilla parrot files these were made from
packs/BP/manifest.json      behavior pack manifest
packs/BP/scripts/main.js    all the logic (Script API)
packs/BP/entities/parrot.json   vanilla parrot + "pp:dance" bool property
packs/BP/pack_icon.png
packs/RP/manifest.json      resource pack manifest
packs/RP/entity/parrot.entity.json  vanilla client parrot, dances when pp:dance is true
packs/RP/pack_icon.png
```

## How it works

- `BP/entities/parrot.json` overrides `minecraft:parrot` and adds a synced
  entity property `pp:dance` (bool, default false). Everything else is vanilla
  (from Mojang's bedrock-samples, format 1.26.0).
- `RP/entity/parrot.entity.json` is the vanilla client entity with one change:
  `variable.state` becomes 3 (dancing) when
  `query.is_dancing || query.property('pp:dance')`.
- `BP/scripts/main.js` (`@minecraft/server` 2.0.0, `@minecraft/server-ui` 2.0.0, stable APIs only):
  - Tracks jukebox positions. They're added when a player interacts with one, plus
    a background scan every 10 s of a 33x17x33 area around each player (run as a
    `system.runJob` generator so it doesn't lag). The list is saved in the world
    dynamic property `pp:jukeboxes`, and jukeboxes that are broken get dropped.
  - Every 10 ticks, for each tracked jukebox whose `minecraft:record_player`
    `isPlaying()` is true, finds parrots in the box and sets `pp:dance` true.
    Parrots near players that are not in any box get set false.
  - Settings `{enabled, xz, up, down}` are saved in world dynamic property `pp:settings`, with a max of 32 each.
  - Custom commands (operator level `GameDirectors`, cheats not required):
    - `/pp:parrotparty` opens a form with a toggle and 3 sliders (opened after a
      10-tick delay, because forms can't open inside a command callback).
    - `/pp:parrotparty <xz> [up] [down]` sets the range directly. If `down` is
      omitted it copies `up`, and `-1` turns it off.
    - `/pp:parrotdebug` prints tracked jukeboxes and states, nearby parrots and their
      `pp:dance` value, then forces nearby parrots to dance for 10 s.
  - There is no chat message on join. The user asked for it to be removed in v1.5.

## Rules (learned the hard way; check.py enforces most of these)

- **Both manifests must keep `"metadata": { "product_type": "addon" }`.** The user
  tested this and it keeps achievements enabled on their world. Don't remove it.
- **Namespace is `pp:`.** Never put the user's name or handles anywhere in the pack
  (namespaces, descriptions, authors). They objected to that once already.
- **RP must not depend on BP.** It caused a "Missing Dependencies" warning when
  the user activated the RP in Global Resources. Only BP depends on RP, and
  applying the BP to a world pulls the RP in automatically.
- **Client entity must be `format_version` 1.10.0 with animation controllers listed
  inside `animations` and referenced in `scripts.animate`.** The vanilla file's
  top-level `animation_controllers` array was rejected
  (content log: "child 'animation_controllers' not valid here"), which silently
  made parrots fall back to vanilla 3-block dancing.
- **Keep the pack UUIDs the same between releases and just raise the version**, so
  imports replace the old copy. Only generate new UUIDs if the user hits a
  "duplicate pack" import error that can't be cleared (this happened once, which is
  why the current UUIDs differ from v1.0-1.2).
- BP and RP versions and module versions must all match, and the BP's dependency
  version on the RP must match the RP version.

## Updating on the user's side (pass this on when sending a new build)

- Worlds lock onto the pack version they were created or last loaded with. The
  user's fix: remove the pack from the world, load into the world once without it,
  exit, then add the new version. Check **Technical details** on the pack shows
  the new version.
- Turn on **Settings > Creator > Enable Content Log GUI** to see errors on screen,
  and ask for a screenshot of the Content Log History if something breaks.

## If a Minecraft update breaks it

- Look at the content log first.
- If the vanilla parrot changed, follow the steps in `tools/regen_parrot.py`
  (download fresh vanilla files into `vanilla/`, run it, then build).
- If a Script API version is retired, update the `@minecraft/server` /
  `@minecraft/server-ui` versions in `packs/BP/manifest.json` and check the
  API docs (learn.microsoft.com/minecraft/creator/scriptapi) for renamed APIs.

## Known limitations

- Parrots dancing through the add-on only play the animation. Unlike vanilla
  dancing, they may keep moving or flying. A possible future tweak is to freeze them.
- Extended dancing only works in chunks loaded near players, which is fine
  for a room the player is in.
- Verified in singleplayer. The Realm setup is the user's to confirm.

## Publishing

GitHub repo: github.com/liangforstudy/ParrotPartyRange. After `./build.sh`, commit
`download/ParrotPartyRange.mcaddon` (build.sh copies it there). The README download link
points at that file on main, so it always serves the latest build.
