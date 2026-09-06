# LabelOnZeWay Platform Alignment Audit

Generated: 2026-09-06T13:32:56.556284+00:00

Canonical runtime: `labelonzeway/` (iPhone Web/PWA).

| Asset | Web SHA256 | Android SHA256 | Match |
|---|---|---|---|
| `index.html` | `fa6f3553e7ba0e309fc16177e95227d5c479d3a919a3cca34e990a76217166cc` | `fa6f3553e7ba0e309fc16177e95227d5c479d3a919a3cca34e990a76217166cc` | YES |
| `cloud-sync.js` | `8802ed2ce6eeecc23e807e4b25eb21f89eba7a8a8ff394176ca48c8c6a31e522` | `8802ed2ce6eeecc23e807e4b25eb21f89eba7a8a8ff394176ca48c8c6a31e522` | YES |
| `sync-config.json` | `f746c60cb64e9c9e8b887693ee733be2815e2d80ffc911e167c102e201cfb443` | `f746c60cb64e9c9e8b887693ee733be2815e2d80ffc911e167c102e201cfb443` | YES |
| `service-worker.js` | `a39e1fb939f7b4f4ecef6647925f8c1ed1b30a6bbf1bf7aac46ba89e1b31ba5a` | `a39e1fb939f7b4f4ecef6647925f8c1ed1b30a6bbf1bf7aac46ba89e1b31ba5a` | YES |
| `manifest.webmanifest` | `0b98017a58d4c0f1be8bf7ef5d05a62e51a8a6c10e1c8dd29da38ea2ddf5dff5` | `0b98017a58d4c0f1be8bf7ef5d05a62e51a8a6c10e1c8dd29da38ea2ddf5dff5` | YES |
| `icon.svg` | `64755ad7bcb442a453d22a7628dcfee7d704c0e32d083ecc1f7dab4ee8f0f6cf` | `64755ad7bcb442a453d22a7628dcfee7d704c0e32d083ecc1f7dab4ee8f0f6cf` | YES |

## Cross-device controls

- Per-profile cloud pull cursor: ENABLED
- Missing local entities rehydrate from cloud: ENABLED
- More-complete remote company/profile settings recover incomplete local settings: ENABLED
- Cloud profile settings refresh the visible UI immediately: ENABLED
- iPhone notification panel default-closed patch retained: ENABLED
- Android packaged common runtime copied from canonical Web runtime: ENABLED
- Mac native Tauri runtime is local-only and requires the companion Mac sync/rebuild script.

Web ↔ Android common runtime: **PASS**
