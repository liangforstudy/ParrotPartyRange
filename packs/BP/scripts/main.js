import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// ---- Defaults (change in game with /pp:parrotparty) ----
const DEFAULTS = { enabled: true, xz: 10, up: 6, down: 6 };
const MAX_RANGE = 32;
const CHECK_TICKS = 10; // how often parrots are updated (20 ticks = 1 second)
const SCAN_TICKS = 200; // how often the area around each player is scanned for jukeboxes
const SCAN_XZ = 16;     // jukebox scan radius around players (horizontal)
const SCAN_Y = 8;       // jukebox scan radius around players (vertical)
// ----------------------------------------------------------

const PROP = "pp:dance";
const SETTINGS_KEY = "pp:settings";
let settings = { ...DEFAULTS };

function loadSettings() {
  try {
    const raw = world.getDynamicProperty(SETTINGS_KEY);
    if (typeof raw === "string") settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {}
}

function saveSettings() {
  try {
    world.setDynamicProperty(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

const clampRange = (n) => Math.max(0, Math.min(MAX_RANGE, Math.floor(n)));
const describe = () =>
  `Parrot Party: ${settings.enabled ? "ON" : "OFF"}, ${settings.xz} across (X/Z), ${settings.up} up, ${settings.down} down`;

function openMenu(player) {
  new ModalFormData()
    .title("Parrot Party Settings")
    .toggle("Extended parrot dancing", { defaultValue: settings.enabled })
    .slider("Range on X and Z (blocks)", 1, MAX_RANGE, { valueStep: 1, defaultValue: settings.xz })
    .slider("Range above jukebox (blocks)", 0, MAX_RANGE, { valueStep: 1, defaultValue: settings.up })
    .slider("Range below jukebox (blocks)", 0, MAX_RANGE, { valueStep: 1, defaultValue: settings.down })
    .submitButton("Save")
    .show(player)
    .then((res) => {
      if (res.canceled || !res.formValues) return;
      const [enabled, xz, up, down] = res.formValues;
      settings = { enabled: !!enabled, xz: clampRange(xz), up: clampRange(up), down: clampRange(down) };
      saveSettings();
      player.sendMessage(`§a${describe()}`);
    })
    .catch(() => {});
}

// /pp:parrotparty            -> opens the settings menu
// /pp:parrotparty 10 6 6     -> sets X/Z, up, down directly
// /pp:parrotparty -1         -> turns the extended dancing off (0 0 0 also works)
let forceUntil = 0;
const forced = new Set();

function runDebug(player) {
  const lines = [`§e[Parrot Party] script v1.5 running. ${describe()}`];
  lines.push(`Tracked jukeboxes: ${jukeboxes.size}`);
  const dim = player.dimension;
  const pl = player.location;
  for (const j of jukeboxes.values()) {
    if (j.dim !== dim.id) continue;
    const d = Math.hypot(j.x - pl.x, j.y - pl.y, j.z - pl.z);
    if (d > 48) continue;
    let state = "?";
    try {
      const b = dim.getBlock({ x: j.x, y: j.y, z: j.z });
      const rp = b?.getComponent("minecraft:record_player");
      state = !b ? "unloaded" : b.typeId !== "minecraft:jukebox" ? "not a jukebox" : !rp ? "no record_player component" : rp.isPlaying() ? "PLAYING" : "not playing";
    } catch (e) {
      state = "error: " + e;
    }
    lines.push(` jukebox ${j.x} ${j.y} ${j.z} (${Math.round(d)}m): ${state}`);
  }
  const parrots = dim.getEntities({ type: "minecraft:parrot", location: pl, maxDistance: 32 });
  lines.push(`Parrots within 32 blocks: ${parrots.length}`);
  for (const p of parrots.slice(0, 6)) {
    let v;
    try { v = p.getProperty(PROP); } catch (e) { v = "error: " + e; }
    const l = p.location;
    lines.push(` parrot ${Math.floor(l.x)} ${Math.floor(l.y)} ${Math.floor(l.z)}: dance=${v}`);
    forced.add(p.id);
  }
  lines.push("§bForcing these parrots to dance for 10s to test the animation...");
  forceUntil = system.currentTick + 200;
  player.sendMessage(lines.join("\n"));
}

system.beforeEvents.startup.subscribe((ev) => {
  ev.customCommandRegistry.registerCommand(
    {
      name: "pp:parrotdebug",
      description: "Parrot Party: show what the add-on detects and test the dance animation",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: false,
    },
    (origin) => {
      const player = origin.sourceEntity ?? origin.initiator;
      if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure, message: "Run this as a player" };
      system.run(() => runDebug(player));
      return { status: CustomCommandStatus.Success };
    }
  );
  ev.customCommandRegistry.registerCommand(
    {
      name: "pp:parrotparty",
      description: "Parrot Party settings: no values opens the menu, or give range X/Z, up, down",
      permissionLevel: CommandPermissionLevel.GameDirectors,
      cheatsRequired: false,
      optionalParameters: [
        { name: "rangeXZ", type: CustomCommandParamType.Integer },
        { name: "up", type: CustomCommandParamType.Integer },
        { name: "down", type: CustomCommandParamType.Integer },
      ],
    },
    (origin, xz, up, down) => {
      const player = origin.sourceEntity ?? origin.initiator;
      if (xz === undefined) {
        if (!player || player.typeId !== "minecraft:player") {
          return { status: CustomCommandStatus.Failure, message: describe() };
        }
        // Forms can't open inside a command callback, so wait a moment.
        system.runTimeout(() => openMenu(player), 10);
        return { status: CustomCommandStatus.Success, message: "Close chat to see the Parrot Party menu" };
      }
      if (xz < 0) {
        settings.enabled = false;
      } else {
        settings.enabled = true;
        settings.xz = clampRange(xz);
        if (up !== undefined) settings.up = clampRange(up);
        settings.down = clampRange(down ?? up ?? settings.down);
      }
      system.run(saveSettings);
      return { status: CustomCommandStatus.Success, message: describe() };
    }
  );
});
const SAVE_KEY = "pp:jukeboxes";
const jukeboxes = new Map(); // key -> { dim, x, y, z }
let loaded = false;
let dirty = false;

const keyOf = (dim, x, y, z) => `${dim}|${x}|${y}|${z}`;

function addJukebox(dim, x, y, z) {
  const k = keyOf(dim, x, y, z);
  if (!jukeboxes.has(k)) {
    jukeboxes.set(k, { dim, x, y, z });
    dirty = true;
  }
}

function load() {
  try {
    const raw = world.getDynamicProperty(SAVE_KEY);
    if (typeof raw === "string") {
      for (const j of JSON.parse(raw)) addJukebox(j.dim, j.x, j.y, j.z);
    }
  } catch (e) {}
  loaded = true;
  dirty = false;
}

function save() {
  if (!dirty) return;
  try {
    world.setDynamicProperty(SAVE_KEY, JSON.stringify([...jukeboxes.values()]));
  } catch (e) {}
  dirty = false;
}

// Pick up jukeboxes instantly when someone uses one.
world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
  const b = ev.block;
  if (b && b.typeId === "minecraft:jukebox") {
    addJukebox(b.dimension.id, b.location.x, b.location.y, b.location.z);
  }
});

// Slow background scan near players, so hopper-fed or existing jukeboxes are found too.
function* scanAroundPlayers() {
  for (const p of world.getAllPlayers()) {
    if (!p.isValid) continue;
    const dim = p.dimension;
    const cx = Math.floor(p.location.x), cy = Math.floor(p.location.y), cz = Math.floor(p.location.z);
    let n = 0;
    for (let x = cx - SCAN_XZ; x <= cx + SCAN_XZ; x++) {
      for (let z = cz - SCAN_XZ; z <= cz + SCAN_XZ; z++) {
        for (let y = cy - SCAN_Y; y <= cy + SCAN_Y; y++) {
          try {
            const b = dim.getBlock({ x, y, z });
            if (b && b.typeId === "minecraft:jukebox") addJukebox(dim.id, x, y, z);
          } catch (e) {}
          if (++n % 200 === 0) yield;
        }
      }
    }
  }
}

let scanning = false;
system.runInterval(() => {
  if (!loaded || scanning) return;
  scanning = true;
  const gen = scanAroundPlayers();
  system.runJob((function* () {
    yield* gen;
    scanning = false;
  })());
}, SCAN_TICKS);

function inRange(loc, j) {
  const dx = Math.floor(loc.x) - j.x;
  const dy = Math.floor(loc.y) - j.y;
  const dz = Math.floor(loc.z) - j.z;
  return Math.abs(dx) <= settings.xz && Math.abs(dz) <= settings.xz && dy <= settings.up && dy >= -settings.down;
}

system.runInterval(() => {
  if (!loaded) {
    load();
    loadSettings();
  }
  const reach = Math.ceil(Math.sqrt(2 * settings.xz ** 2 + Math.max(settings.up, settings.down) ** 2)) + 1;

  const shouldDance = new Set();
  const seen = new Map(); // id -> entity

  for (const [k, j] of jukeboxes) {
    let dim, block;
    try {
      dim = world.getDimension(j.dim);
      block = dim.getBlock({ x: j.x, y: j.y, z: j.z });
    } catch (e) {
      continue; // chunk not loaded, keep it for later
    }
    if (!block) continue;
    if (block.typeId !== "minecraft:jukebox") {
      jukeboxes.delete(k);
      dirty = true;
      continue;
    }
    let playing = false;
    try {
      playing = block.getComponent("minecraft:record_player")?.isPlaying() ?? false;
    } catch (e) {}
    if (!playing || !settings.enabled) continue;

    const parrots = dim.getEntities({
      type: "minecraft:parrot",
      location: { x: j.x + 0.5, y: j.y + 0.5, z: j.z + 0.5 },
      maxDistance: reach,
    });
    for (const parrot of parrots) {
      seen.set(parrot.id, parrot);
      if (inRange(parrot.location, j)) shouldDance.add(parrot.id);
    }
  }

  // Also look at parrots near players, so ones that left the area (or were
  // left dancing from a previous session) get switched off.
  for (const p of world.getAllPlayers()) {
    try {
      for (const parrot of p.dimension.getEntities({ type: "minecraft:parrot", location: p.location, maxDistance: 64 })) {
        seen.set(parrot.id, parrot);
      }
    } catch (e) {}
  }

  const forcing = system.currentTick < forceUntil;
  if (!forcing) forced.clear();
  for (const [id, parrot] of seen) {
    try {
      const want = shouldDance.has(id) || (forcing && forced.has(id));
      if (parrot.getProperty(PROP) !== want) parrot.setProperty(PROP, want);
    } catch (e) {}
  }

  save();
}, CHECK_TICKS);
