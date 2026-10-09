# Parrot Party Range

A Minecraft Bedrock add-on that makes parrots dance from much further away from a playing jukebox.

**[Download ParrotPartyRange.mcaddon](https://github.com/liangforstudy/ParrotPartyRange/releases/latest/download/ParrotPartyRange.mcaddon)**

## What it does

In vanilla, parrots only dance within about 3 blocks of a playing jukebox. With this add-on they dance anywhere inside a box around the jukebox. By default the box reaches **10 blocks out in every direction on X and Z, 6 blocks up and 6 blocks down**.

The add-on finds jukeboxes when someone uses one, and also scans around players every 10 seconds. That means hopper-fed or already-placed jukeboxes work too. Parrots stop dancing when the music stops or when they leave the box. Settings are saved with the world.

## Commands

All commands need operator permission. Cheats do **not** have to be on, so achievements stay enabled.

### `/pp:parrotparty`

With no numbers, this opens a settings menu (close the chat to see it). The menu has:

| Setting | What it does |
| --- | --- |
| Extended parrot dancing | Turns the add-on on or off. When off, parrots follow vanilla rules. |
| Range on X and Z | How far out from the jukebox, in each direction (1-32). |
| Range above jukebox | How many blocks up (0-32). |
| Range below jukebox | How many blocks down (0-32). |

Tap **Save** to apply.

### `/pp:parrotparty <rangeXZ> [up] [down]`

Sets the range directly and turns the add-on on. Values above 32 are capped at 32.

| Example | Result |
| --- | --- |
| `/pp:parrotparty 10 6 6` | 10 out on X/Z, 6 up, 6 down (the default) |
| `/pp:parrotparty 16 4` | 16 out on X/Z, 4 up, and 4 down (down copies up if left out) |
| `/pp:parrotparty 20` | 20 out on X/Z, up and down stay as they were |
| `/pp:parrotparty -1` | Turns the add-on off. Give a range or use the menu to turn it back on. |

The command replies with the current settings, for example `Parrot Party: ON, 10 across (X/Z), 6 up, 6 down`.

### `/pp:parrotdebug`

For troubleshooting. It shows in chat:

- whether the script is running, plus the current settings
- the jukeboxes it is tracking within 48 blocks of you, and whether each one is playing
- the parrots within 32 blocks of you and whether each one is set to dance

It then makes those parrots (up to 6) dance for 10 seconds, so you can check the animation works. Must be run by a player.

## Install

1. Tap the download link above and open the file with Minecraft.
2. In your world or Realm settings, go to **Behavior Packs** and activate **Parrot Party Range**. Its resource pack is added automatically.

Built for Minecraft Bedrock 26.x.

## Building from source

Needs `python3` and `zip` (`node` is optional). Run `./build.sh` and the add-on is written to `dist/`. See `HANDOFF.md` for how it works.
