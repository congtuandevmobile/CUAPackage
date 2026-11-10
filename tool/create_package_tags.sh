#!/usr/bin/env bash
# Creates immutable package tags in the form <package>_tag-<package.json version>.
set -euo pipefail

packages_csv="${1:-}"
source_sha="${2:-}"
root="$(cd "$(dirname "$0")/.." && pwd)"
manifest="$root/tool/release_manifest.sh"

[[ -n "$packages_csv" && -n "$source_sha" ]] || {
  echo "usage: $0 <comma-separated-packages> <source-sha>" >&2
  exit 64
}

cd "$root"
git rev-parse --verify "$source_sha^{commit}" >/dev/null
IFS=',' read -r -a selected <<< "$packages_csv"
short_sha="$(git rev-parse --short=8 "$source_sha")"
declare -a tags=()

for package in "${selected[@]}"; do
  "$manifest" is-known "$package" || {
    echo "Unknown package: $package" >&2
    exit 1
  }
  version="$($manifest version "$package")"
  [[ "$version" != "" && "$version" != "null" ]] || {
    echo "Package $package has no usable version." >&2
    exit 1
  }
  tag="${package}_tag-${version}"
  tags+=("$tag")
  if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
    echo "Tag already exists: $tag" >&2
    echo "Increase packages/$package/package.json version before creating another tag." >&2
    echo "If the version is intentionally unchanged, use a unique version/commit suffix in package.json (current commit: $short_sha)." >&2
    exit 1
  fi
done

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

for index in "${!selected[@]}"; do
  package="${selected[$index]}"
  tag="${tags[$index]}"
  git tag -a "$tag" "$source_sha" -m "Tag $package ${tag##*-}"
  echo "Created $tag at $source_sha"
done

for tag in "${tags[@]}"; do
  git push origin "refs/tags/$tag"
done
