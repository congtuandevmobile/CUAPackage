# RNPackage

Generic React Native SDKs for sport apps, built as Nitro modules.

| Package | What it is |
|---|---|
| [`react-native-gps-tracking`](packages/react-native-gps-tracking) | GPS recording with a shared Kotlin distance core |
| [`react-native-apple-health-sync`](packages/react-native-apple-health-sync) | Apple HealthKit sync (iOS only); every workout sport mapped by name and id |
| [`react-native-live-activity-tracking`](packages/react-native-live-activity-tracking) | Workout Live Activity (lock screen, Dynamic Island) and Android ongoing notification |

```sh
bun install
bun run codegen      # nitrogen
bun run typecheck
bun run test
```

See [CLAUDE.md](CLAUDE.md) for the rules of the repository.

## Creating package tags

The workflow in `.github/workflows/release-tags.yml` creates immutable Git tags from commit subjects:

```text
[tag] Release all SDKs
[tag:react-native-apple-health-sync] Release HealthKit SDK
```

`[tag]` selects every package under `packages/*`; the package-specific form selects one SDK. The generated tag is
`<package>_tag-<version>`, where `<version>` comes from that package's `package.json`, for example
`react-native-apple-health-sync_tag-0.0.1-beta.1`.

The workflow runs the selected package's typecheck and tests first. It refuses to create an existing tag; bump the
package version (or deliberately use a unique version containing a commit/build suffix) before tagging again.
