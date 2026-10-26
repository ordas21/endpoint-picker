#!/bin/sh
# Build the Chrome Web Store zip. Tests, the demo, and the listing site stay out.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
version=$(node -p "require('$root/manifest.json').version")
stage="$root/dist/endpoint-picker"
rm -rf "$stage"
mkdir -p "$stage/icons"
cp "$root/manifest.json" "$root/background.js" "$root/content.js" "$root/inject.js" \
  "$root/match.js" "$root/popup.html" "$root/popup.css" "$root/popup.js" \
  "$root/privacy.html" "$stage/"
cp "$root/icons/"*.png "$stage/icons/"
(
  cd "$root/dist"
  rm -f "endpoint-picker-$version.zip"
  zip -r -X "endpoint-picker-$version.zip" endpoint-picker -x '*.DS_Store'
)
echo "$root/dist/endpoint-picker-$version.zip"
