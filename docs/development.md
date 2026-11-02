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

Choose a model and effort through `DEEPSEEK_SMOKE_MODEL` (for example `deepseek/deepseek-v4-pro`) and `DEEPSEEK_SMOKE_REASONING` (`high` or `max`). The test uses a temporary workspace and isolated agent storage. It waits for a completed turn, releases the session, restores it, and checks a second response against remembered context. Set `DEEPSEEK_SMOKE_TOOLS=1` to also verify actual file reading and writing.

The development dependency `opencode-ai` pins the tested CLI version for local smoke runs. It is not shipped to end users. With lifecycle scripts disabled, its executable may need initialization: run `node node_modules/opencode-ai/postinstall.mjs`, or use a separately installed CLI. On macOS the local executable is `node_modules/opencode-ai/bin/opencode.exe` despite the suffix.

## Local verification

On 2026-11-02, macOS with OpenCode 1.19.5: Flash/High passed real file read/write, completed turns, and release/resume with preserved context. V4 Pro/Max passed completed turns and release/resume. The installed bb provider returned both models with High/Max. Unit tests, 18 bridge conformance scenarios, the build, clean production install, and package checks passed locally. GitHub CI results are separate from these local checks.

## Release

GitHub Actions checks Node 22 on Ubuntu and macOS. The release workflow runs only for pushed `v*` tags, requires checks to pass, validates the tag against `package.json` and `CHANGELOG.md`, and creates a GitHub Release. It does not publish to npm.

Before release, update the changelog, version, lockfile, README, and marketplace overview. Keep SDK and bb build-tool pins aligned. Dependabot groups minor/patch updates; SDK/bb pins are reviewed together and major updates are reviewed individually.
