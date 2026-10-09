"""Set the add-on version everywhere it appears.

Usage: python3 tools/bump.py 1.6.0

Updates BP + RP header/module versions, the BP->RP dependency version,
and the "script vX.Y" text shown by /pp:parrotdebug. UUIDs are NOT changed,
so the new build installs as an update of the same pack.
"""
import json
import re
import sys
from pathlib import Path

if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
    sys.exit("usage: python3 tools/bump.py MAJOR.MINOR.PATCH")

v = [int(x) for x in sys.argv[1].split(".")]
P = Path(__file__).resolve().parent.parent / "packs"

for rel in ("BP/manifest.json", "RP/manifest.json"):
    path = P / rel
    m = json.loads(path.read_text())
    m["header"]["version"] = v
    for mod in m["modules"]:
        mod["version"] = v
    for dep in m.get("dependencies", []):
        if "uuid" in dep:
            dep["version"] = v
    m["metadata"] = {"product_type": "addon"}
    path.write_text(json.dumps(m, indent=2))

js = P / "BP/scripts/main.js"
src = js.read_text()
src = re.sub(r"script v\d+\.\d+", f"script v{v[0]}.{v[1]}", src)
js.write_text(src)
print("version set to", sys.argv[1])
