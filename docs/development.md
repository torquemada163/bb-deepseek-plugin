# Development

Use Node 22 and a bb CLI compatible with the SDK pinned in `package.json`. The public `@get-bb/plugin-sdk` package is the only BB integration dependency.

## Checks

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm run check:install
npm run check:package
```

`npm test` includes credential/configuration checks, a public-SDK import scan, and the SDK's bridge conformance suite against a local ACP fixture. It needs no DeepSeek account. The fixture is not evidence of a real API response.

`check:install` reproduces BB's managed Git install using production dependencies only, optional packages omitted and lifecycle scripts disabled. `check:package` verifies required bundles and rejects private files in publication contents.

## Live smoke

Live checks use the generated host bundle, a real OpenCode executable, and a real DeepSeek key. They incur API usage and are never run in CI. Put `DEEPSEEK_API_KEY` in the local ignored `.env`, then run:

```sh
DEEPSEEK_EXECUTABLE=/absolute/path/to/opencode npm run smoke
```

Choose a model and effort through `DEEPSEEK_SMOKE_MODEL` (for example `deepseek/deepseek-v4-pro`) and `DEEPSEEK_SMOKE_REASONING` (`none`, `low`, `high`, `max`, or a supported alias). The test uses a temporary workspace and isolated agent storage. It waits for a completed turn, releases the session, restores it, and checks a second response against remembered context. Set `DEEPSEEK_SMOKE_TOOLS=1` to also verify actual file reading and writing.

The development dependency `opencode-ai` pins the tested CLI version for local smoke runs. It is not shipped to end users. With lifecycle scripts disabled, its executable may need initialization: run `node node_modules/opencode-ai/postinstall.mjs`, or use a separately installed CLI. On macOS the local executable is `node_modules/opencode-ai/bin/opencode.exe` despite the suffix.

For the complete paid verification matrix:

```sh
npm run build
DEEPSEEK_SMOKE_REPORT=/absolute/path/to/report.json npm run smoke:matrix
```

This checks both models for Off, Low, High, Max, Default, and the documented aliases (including inherited Medium). Every case must complete two turns with a release/restore between them. Canonical levels and Medium also read/write a real file. Each run uses a temporary local HTTPS observer that forwards only to the official DeepSeek API, verifies TLS on both hops, and checks the actual `thinking` and `reasoning_effort` fields. It retains only nonsecret control fields and HTTP statuses; prompts, responses, and authorization headers are not recorded. OpenCode's auxiliary title/summary requests are excluded from main-turn effort assertions. OpenSSL is required for the temporary local certificate. This is opt-in and never runs in CI.

## Local verification

On 2026-11-02, plugin 0.1.1 on macOS, bb 0.48.1, and OpenCode 1.19.5: **18/18 real API cases passed** — both models at Default, Off, Minimal, Low, Medium, High, Extra High, Max, and Ultra. Each case completed two turns with release/restore and verified the actual HTTPS effort and thinking toggle. Ten cases also verified real file read/write. See [the sanitized verification report](reasoning-verification.json).

The installed provider accepts inherited Medium and returns the native catalog (Low, High, Max, Default, None). The final offline checks passed: 8 unit tests, 18 bridge conformance scenarios, TypeScript, build, clean production install, and package contents. This is host-bridge/API verification; browser UI automation was not part of the check. GitHub CI results are separate from these local checks.

## Release

GitHub Actions checks Node 22 on Ubuntu and macOS. The release workflow runs only for pushed `v*` tags, requires checks to pass, validates the tag against `package.json` and `CHANGELOG.md`, and creates a GitHub Release. It does not publish to npm.

Before release, update the changelog, version, lockfile, README, and marketplace overview. Keep SDK and bb build-tool pins aligned. Dependabot groups minor/patch updates; SDK/bb pins are reviewed together and major updates are reviewed individually.
