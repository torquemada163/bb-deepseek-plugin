# Changelog

## 0.1.1 — 2026-11-02

- Accept bb's inherited Medium setting before thread validation and map it to DeepSeek High.
- Restore Low and expose non-thinking mode for both models.
- Map Minimal to Low, Extra High to High, and Ultra to Max; keep the default at High.
- Add live reasoning-matrix checks that verify actual HTTPS control parameters, file tools, completed turns, and session restore.
- Ensure a failed live smoke check exits with a failure status.

## 0.1.0 — 2026-11-02

- Add a dedicated DeepSeek provider for bb using OpenCode over ACP.
- Offer DeepSeek Flash and V4 Pro with High and Max reasoning.
- Load API credentials on the execution host from a private dotenv file.
- Isolate OpenCode configuration, data, cache, and state.
- Add protocol conformance checks, credential tests, clean-install verification, CI, and release automation.
