#!/usr/bin/env bash
# Discovers React Native SDK packages and reads their package.json metadata.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

all_packages() {
  local manifest
  for manifest in "$repo_root"/packages/*/package.json; do
    [[ -f "$manifest" ]] || continue
    basename "$(dirname "$manifest")"
  done | sort
}

is_known() {
  local wanted="$1"
  [[ -f "$repo_root/packages/$wanted/package.json" ]]
}

manifest_for() {
  local package="$1"
  local manifest="$repo_root/packages/$package/package.json"
  [[ -f "$manifest" ]] || return 1
  printf '%s\n' "$manifest"
}

version() {
  local package="$1"
  local manifest
  manifest="$(manifest_for "$package")" || {
    echo "Unknown package: $package" >&2
    return 1
  }
  bun -e 'const p=require(process.argv[1]); process.stdout.write(p.version + "\n")' "$manifest"
}

case "${1:-}" in
  all) all_packages ;;
  all-csv) all_packages | paste -sd, - ;;
  is-known) is_known "${2:-}" ;;
  version) version "${2:-}" ;;
  *)
    echo "usage: $0 {all|all-csv|is-known <package>|version <package>}" >&2
    exit 64
    ;;
esac
