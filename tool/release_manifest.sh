#!/usr/bin/env bash
# Discovers React Native SDK packages and reads their package.json metadata.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

all_packages() {
  find "$repo_root/packages" -mindepth 2 -maxdepth 2 -type f -name package.json -print0 |
    while IFS= read -r -d '' manifest; do
      bun -e 'const p=require(process.argv[1]); process.stdout.write(p.name + "\n")' "$manifest"
    done | sort
}

is_known() {
  local wanted="$1"
  all_packages | grep -Fxq "$wanted"
}

manifest_for() {
  local package="$1"
  find "$repo_root/packages" -mindepth 2 -maxdepth 2 -type f -name package.json -print0 |
    while IFS= read -r -d '' manifest; do
      name="$(bun -e 'const p=require(process.argv[1]); process.stdout.write(p.name)' "$manifest")"
      if [[ "$name" == "$package" ]]; then
        printf '%s\n' "$manifest"
        return 0
      fi
    done
  return 1
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
