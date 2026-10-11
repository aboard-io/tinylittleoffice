#!/usr/bin/env bash
# The box measures in the type the site ships (directive r17-plex; Paul, 2026-10-11: "Use IBM Plex to measure"). The
# browser tests load the site's stylesheet, so Chromium draws in the self-hosted files anyway; this is for what falls
# through to the system: the fonts in public/fonts/ copied to ~/.fonts/plex/ (always the files the site serves, never
# a copy of its own) and fontconfig told to prefer IBM Plex Sans for sans-serif and system-ui, where the languages
# round had pinned DejaVu Sans. Run it again whenever public/fonts/ changes.
#
#   scripts/fonts-box.sh        install the fonts and /etc/fonts/local.conf (sudo where the file needs it)
#
# FONTS_DIR and FONTS_CONF name other places for the two (a test, or a box without /etc access).
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
dest=${FONTS_DIR:-$HOME/.fonts/plex}
conf=${FONTS_CONF:-/etc/fonts/local.conf}

mkdir -p "$dest"
rm -f "$dest"/*.woff2
cp "$root"/public/fonts/*.woff2 "$root"/public/fonts/LICENSE.txt "$dest"/

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
cat >"$tmp" <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<!-- Tiny Little Office's measuring tests (r17-plex, 2026-10-11): the type is IBM Plex, the site's own, copied to
     ~/.fonts/plex/ from public/fonts/ by scripts/fonts-box.sh, which writes this file. Plex Sans is the box's sans-serif
     and system-ui, so what falls through the site's stack is measured in Plex too. The Noto fonts (fonts-noto-core,
     fonts-noto-cjk, fonts-noto-extra) draw the scripts Plex is not shipped for: Bengali, Urdu, Korean, Chinese, Japanese. -->
<fontconfig>
  <alias binding="strong"><family>sans-serif</family><prefer><family>IBM Plex Sans</family></prefer></alias>
  <alias binding="strong"><family>system-ui</family><prefer><family>IBM Plex Sans</family></prefer></alias>
</fontconfig>
EOF
if ! cmp -s "$tmp" "$conf" 2>/dev/null; then
  if [ -w "$conf" ] || { [ ! -e "$conf" ] && [ -w "$(dirname "$conf")" ]; }; then
    install -m 644 "$tmp" "$conf"
  else
    sudo install -m 644 "$tmp" "$conf"
  fi
fi

fc-cache -f "$dest" >/dev/null
families=$(fc-scan --format '%{family[0]}\n' "$dest" | sort -u)
for family in 'IBM Plex Sans' 'IBM Plex Serif' 'IBM Plex Mono' 'IBM Plex Sans Arabic' 'IBM Plex Sans Devanagari'; do
  grep -qx "$family" <<<"$families" || {
    echo "fontconfig reads no $family in $dest" >&2
    exit 1
  }
done
if [ "$conf" = /etc/fonts/local.conf ]; then
  echo "sans-serif is $(fc-match -f '%{family[0]}' sans-serif), system-ui is $(fc-match -f '%{family[0]}' system-ui)"
fi
