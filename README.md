# Parrot Party Range

A Minecraft Bedrock add-on that makes parrots dance from much further away from a playing jukebox.

**[Download ParrotPartyRange.mcaddon](https://github.com/liangforstudy/ParrotPartyRange/releases/latest/download/ParrotPartyRange.mcaddon)**

## What it does

- In vanilla, parrots only dance within 3 blocks of a jukebox. With this add-on, they dance anywhere in a box around it: by default 10 blocks across and 6 blocks up and down.
- You can change the range or turn it off in game (operators only, cheats not needed):
  - `/pp:parrotparty` opens a settings menu with sliders.
  - `/pp:parrotparty <across> [up] [down]` sets the range directly. `-1` turns it off.
  - `/pp:parrotdebug` shows tracked jukeboxes and nearby parrots.
- Settings are saved with the world.

## Install

1. Tap the download link above and open the file with Minecraft.
2. In your world or Realm settings, go to **Behavior Packs** and activate **Parrot Party Range**. Its resource pack is added automatically.

Built for Minecraft Bedrock 26.x.

## Building from source

Needs `python3` and `zip` (`node` is optional). Run `./build.sh` and the add-on is written to `dist/`. See `HANDOFF.md` for how it works.
