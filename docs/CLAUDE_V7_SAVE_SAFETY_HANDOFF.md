# Claude ↔ ChatGPT Engineering Handoff — V7 Save Safety (2026-11-01)

## Review supplied by Claude
Claude delivered a **read-only Save Protection & Migration Specification** based on main-branch `index.html`, `sw.js`, `README.txt`, and handoff. No actual V7 branch code or real career export was inspected by Claude. No tests run by Claude.

Critical risks identified: unsupported primary save falls back to fresh then overwrites on later save; snapshot is one deep and can be replaced; import isn't atomic; load-time normalization can throw. The full proposal includes copy-only migration, versioned `whl7:` namespace, integrity-checked dual slots, backup before destructive actions, and extensive failure-injection testing.

## Work completed by ChatGPT in draft PR #18
https://github.com/DiamondIQ2026/warriors-hit-lab/pull/18
Branch: `chatgpt/v7-save-envelope-foundation-20261101` based on `main`.

- `v7/save-envelope.cjs`: pure and isolated codec; app format, schema version 5, UTF-8 exact byte length, FNV-1a accidental-corruption checksum, safe decode statuses, read-only dual-slot inspection.
- `tests/v7-save-envelope.test.cjs`: nine tests for roundtrip, truncation, changed payload, future schema, invalid input, highest-sequence selection, corrupted newer slot fallback, both corrupt, and empty state.
- `.github/workflows/hitlab-v7-save-safety.yml`: automated Node 22 checks.
- At commit `84a76cf4ee5b9ab8acebe4b7f0ba20ed764e9936`, code checks **passed**, save-safety workflow **passed**.

## Deliberate limitations
This PR does **not** implement double-slot writes, actual save migration, backup retention, recovery-mode UI, V6.3 hotfix, or any deployment.
It never touches localStorage itself; the caller injects a storage adapter into a read-only selector. No production saves are accessed.
FNV-1a is a noncryptographic corruption checksum; it does not authenticate files.
V7 multiplayer prototype currently uses `warriors-hit-lab-v7-multiplayer-prototype` on its draft branch, not the proposed `whl7:` namespace. Migration/adoption must be separately tested.
No existing V6.3 data may ever be altered by this work.

## Next non-overlapping work for Claude
Review the actual code in PR #18, specifically the save envelope contracts and unit tests. Identify bugs, acceptance-criteria gaps, and concerns about versioned save handling. Begin READ-ONLY. Do not modify PR #18.

Next implementation slices for ChatGPT:
1. Injectable double-buffered write protocol with sequence conflict detection and write failure injection.
2. A copy-only migration validator with generated V6.3 fixtures and real-device export (owner may provide later, redact child names as needed).
3. Verified pre-import/pre-reset backups and visible recovery UI.
4. WebKit tests and physical iPhone smoke checks.

## Release rules
- Repo ONLY `DiamondIQ2026/warriors-hit-lab`; never modify separate Diamond IQ.
- All drafts remain unmerged until explicit owner approval.
- V6.3.1 hotfix is a separate proposed track; **no deployment approved**.
- Product owner may decide release destination and privacy defaults later. Neither blocks isolated tests.
