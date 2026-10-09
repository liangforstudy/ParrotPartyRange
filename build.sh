#!/usr/bin/env bash
# Builds dist/ParrotPartyRange_v<version>.mcaddon from packs/BP and packs/RP.
# Checks: JSON is valid, main.js parses, versions match, RP uuid dependency
# matches, and both manifests carry "metadata": { "product_type": "addon" }.
set -euo pipefail
cd "$(dirname "$0")"

python3 tools/check.py

if command -v node >/dev/null 2>&1; then
  node --input-type=module --check < packs/BP/scripts/main.js
  echo "ok   BP/scripts/main.js syntax"
else
  echo "warn node not installed, skipped main.js syntax check"
fi

VERSION=$(python3 -c 'import json;print(".".join(map(str,json.load(open("packs/BP/manifest.json"))["header"]["version"])))')
mkdir -p dist
OUT="dist/ParrotPartyRange_v${VERSION}.mcaddon"
rm -f "$OUT"
# The .mcaddon is a plain zip with the BP and RP folders at its root.
(cd packs && zip -qrX "../$OUT" BP RP -x '*.DS_Store')
echo "built $OUT"
unzip -l "$OUT"
# Fixed-name copy that the README download link points to (commit it).
mkdir -p download
cp "$OUT" "download/ParrotPartyRange.mcaddon"
echo "copied to download/ParrotPartyRange.mcaddon"
