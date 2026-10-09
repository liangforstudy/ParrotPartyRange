"""Rebuild the two parrot override files from Mojang's vanilla files.

Only needed if a Minecraft update changes the vanilla parrot and the
add-on starts misbehaving (parrots lose new vanilla behaviour, content
log errors, etc).

1. Download fresh copies from https://github.com/Mojang/bedrock-samples (main branch):
     behavior_pack/entities/parrot.json                -> vanilla/parrot.json
     resource_pack/entity/parrot.entity.json           -> vanilla/parrot.entity.json
   e.g.
     curl -sfL https://raw.githubusercontent.com/Mojang/bedrock-samples/main/behavior_pack/entities/parrot.json -o vanilla/parrot.json
     curl -sfL https://raw.githubusercontent.com/Mojang/bedrock-samples/main/resource_pack/entity/parrot.entity.json -o vanilla/parrot.entity.json
2. python3 tools/regen_parrot.py
3. ./build.sh
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = ROOT / "vanilla"
P = ROOT / "packs"

# Behavior side: vanilla parrot + a synced bool property the script toggles.
ent = json.loads((V / "parrot.json").read_text())
ent["minecraft:entity"]["description"]["properties"] = {
    "pp:dance": {"type": "bool", "default": False, "client_sync": True}
}
(P / "BP/entities/parrot.json").write_text(json.dumps(ent, indent=2))

# Resource side: vanilla client entity, converted to format 1.10.0
# (controllers moved into "animations" and listed in scripts.animate),
# with the dance state also triggered by the property.
cli = json.loads((V / "parrot.entity.json").read_text())
cli["format_version"] = "1.10.0"
d = cli["minecraft:client_entity"]["description"]
ctrls = d.pop("animation_controllers", [])
names = []
for entry in ctrls:
    for key, val in entry.items():
        d["animations"][key] = val
        names.append(key)
if names:
    d["scripts"]["animate"] = names
pre = d["scripts"]["pre_animation"]
needle = "query.is_dancing ?"
if needle not in pre[0]:
    raise SystemExit("vanilla pre_animation changed shape; edit RP/entity/parrot.entity.json by hand "
                     "so the dance state also triggers on query.property('pp:dance')")
pre[0] = pre[0].replace(needle, "(query.is_dancing || query.property('pp:dance')) ?")
(P / "RP/entity/parrot.entity.json").write_text(json.dumps(cli, indent=2))
print("regenerated BP/entities/parrot.json and RP/entity/parrot.entity.json")
