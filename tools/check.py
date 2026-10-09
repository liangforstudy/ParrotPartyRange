"""Sanity checks run by build.sh before packaging."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "packs"
errors = []


def load(rel):
    path = P / rel
    try:
        data = json.loads(path.read_text())
        print(f"ok   {rel}")
        return data
    except Exception as e:  # noqa: BLE001
        errors.append(f"{rel}: invalid JSON ({e})")
        return None


bp = load("BP/manifest.json")
rp = load("RP/manifest.json")
ent = load("BP/entities/parrot.json")
cli = load("RP/entity/parrot.entity.json")

if bp and rp:
    bv, rv = bp["header"]["version"], rp["header"]["version"]
    if bv != rv:
        errors.append(f"BP version {bv} != RP version {rv}")
    for name, m in (("BP", bp), ("RP", rp)):
        for mod in m["modules"]:
            if mod["version"] != m["header"]["version"]:
                errors.append(f"{name} module {mod['type']} version {mod['version']} != header")
        if m.get("metadata", {}).get("product_type") != "addon":
            errors.append(f'{name} manifest missing "metadata": {{ "product_type": "addon" }}')
    dep = [d for d in bp["dependencies"] if "uuid" in d]
    if not dep or dep[0]["uuid"] != rp["header"]["uuid"] or dep[0]["version"] != rv:
        errors.append("BP dependency on RP does not match RP uuid/version")
    if "dependencies" in rp:
        errors.append("RP must NOT depend on BP (causes 'missing dependencies' in Global Resources)")

    script = (P / "BP/scripts/main.js").read_text()
    tag = "script v" + ".".join(map(str, bv[:2]))
    if tag not in script:
        errors.append(f'main.js debug text should contain "{tag}" (run tools/bump.py)')

if ent:
    props = ent["minecraft:entity"]["description"].get("properties", {})
    if "pp:dance" not in props:
        errors.append("BP parrot.json missing pp:dance property")

if cli:
    d = cli["minecraft:client_entity"]["description"]
    if cli.get("format_version") != "1.10.0" or "animation_controllers" in d:
        errors.append("RP parrot.entity.json must be format 1.10.0 with controllers inside animations + scripts.animate")
    if "query.property('pp:dance')" not in d["scripts"]["pre_animation"][0]:
        errors.append("RP parrot.entity.json pre_animation missing query.property('pp:dance')")

if errors:
    print("\nFAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("ok   all checks passed")
