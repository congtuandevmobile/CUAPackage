#!/usr/bin/env bash
# Parses [tag] or [tag:<package>] from the HEAD commit subject.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
manifest="$root/tool/release_manifest.sh"
message="${COMMIT_MESSAGE:-}"
subject="${message%%$'\n'*}"

marker="$(printf '%s\n' "$subject" | grep -Eo '^\[tag(:[^][]+)?\]' || true)"
if [[ -z "$marker" ]]; then
  if [[ "$message" == *"[tag"* ]]; then
    echo "The commit subject must start with [tag] or [tag:<package>]." >&2
    exit 1
  fi
  echo "mode=none"
  echo "packages="
  echo "marker="
  exit 0
fi

if [[ "$subject" =~ \[tag[^][]*\].*\[tag ]]; then
  echo "Only one tag marker is allowed in the commit subject." >&2
  exit 1
fi

payload="${marker#[}"
payload="${payload%]}"
if [[ "$payload" == "tag" ]]; then
  packages="$($manifest all-csv)"
else
  package="${payload#tag:}"
  "$manifest" is-known "$package" || {
    echo "Unknown package in $marker: $package" >&2
    echo "Known packages:" >&2
    "$manifest" all >&2
    exit 1
  }
  packages="$package"
fi

echo "mode=tag"
echo "packages=$packages"
echo "marker=$marker"
