# LabelOnZeWay Production Tracking Audit

Generated: 2026-09-06T14:39:42.489062+00:00

This is a production hardening audit, not UAT.

| Asset | Web SHA256 | Android SHA256 | Match |
|---|---|---|---|
| `index.html` | `5a9bcf5ddeb99267dd8c8b383e3e227bb6b330bc42703f574005c611948da731` | `5a9bcf5ddeb99267dd8c8b383e3e227bb6b330bc42703f574005c611948da731` | YES |
| `cloud-sync.js` | `8802ed2ce6eeecc23e807e4b25eb21f89eba7a8a8ff394176ca48c8c6a31e522` | `8802ed2ce6eeecc23e807e4b25eb21f89eba7a8a8ff394176ca48c8c6a31e522` | YES |
| `sync-config.json` | `f746c60cb64e9c9e8b887693ee733be2815e2d80ffc911e167c102e201cfb443` | `f746c60cb64e9c9e8b887693ee733be2815e2d80ffc911e167c102e201cfb443` | YES |
| `service-worker.js` | `a05a2ff36817825387e855ad9fceb6ea1ef49cbbaea8bea7a38bf77494dad9f4` | `a05a2ff36817825387e855ad9fceb6ea1ef49cbbaea8bea7a38bf77494dad9f4` | YES |
| `manifest.webmanifest` | `0b98017a58d4c0f1be8bf7ef5d05a62e51a8a6c10e1c8dd29da38ea2ddf5dff5` | `0b98017a58d4c0f1be8bf7ef5d05a62e51a8a6c10e1c8dd29da38ea2ddf5dff5` | YES |
| `icon.svg` | `64755ad7bcb442a453d22a7628dcfee7d704c0e32d083ecc1f7dab4ee8f0f6cf` | `64755ad7bcb442a453d22a7628dcfee7d704c0e32d083ecc1f7dab4ee8f0f6cf` | YES |
| `tracking/index.html` | `28c8f5a6910cc10d1aa17b3826105e5464c8141bdc61f6796c54b774e4ea1b83` | `28c8f5a6910cc10d1aa17b3826105e5464c8141bdc61f6796c54b774e4ea1b83` | YES |
| `tracking-dashboard/index.html` | `20261faca475579d19e83c0b8cde6d9861030421d97607a822ad7565d98ccaf0` | `20261faca475579d19e83c0b8cde6d9861030421d97607a822ad7565d98ccaf0` | YES |

## Tracking controls

- In-app Tracking View across Web/PWA, Android and Mac runtime: ENABLED.
- Internet link sharing waits for Cloud publication: ENABLED.
- False-positive tracking sync success: REMOVED.
- Public tracking CDN dependency: REMOVED.
- Production public-config fallback: ENABLED.

Web ↔ Android production runtime: **PASS**
