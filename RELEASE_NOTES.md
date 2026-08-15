# Release notes — SHIPDESK + LabelOnZeWay 1.3.3

Date: 2026-08-15

## Proposal A — Operations Deck

- Applies the saved Google Stitch Proposal A design to the canonical LabelOnZeWay workflow rather than substituting the standalone visual prototype.
- Adds clear Home, New Label, Batch, Manifest, and More destinations.
- Keeps phone layouts compact with safe areas, touch targets, persistent Back/Cancel controls, limited scrolling, and sticky editing/printing actions.
- Preserves customer creation/selection, copies 1–20, post-save New Label, exact Batch Delete Label, 80 mm and A4/PDF manifests, payments, reports, two-day exceptions, archive, backup, profiles, cloud controls, Deep Rescue, and Claims Vault.

## Native applications and printing

- Android: version `1.3.3`, code `8`, upgrade-compatible debug signing, current Operations Deck web assets, direct POS80C output, system printing, and bounded/cancellable automatic discovery.
- iOS source: marketing version `1.3.3`, build `8`, current Operations Deck web assets, AirPrint/system printing, direct POS80C output, and Android-style bounded/cancellable automatic discovery.
- Direct ESC/POS output keeps zero avoidable feed and one auto-cut after each physical label copy.
- Offline print queues and printer settings remain device-local.
- Hosted gateway v2.1 is repackaged with the v1.3.3 Operations Deck web assets for macOS/desktop network printing.

## Claims, recovery, and synchronization

- Permanent Claims Vault versions remain independent of physical copy count and survive operational deletion.
- Deep Rescue remains non-destructive and exports a recovery CSV.
- Full safe-workflow Supabase synchronization remains enabled for authorized staff in one shared company workspace; printer settings and active print queues remain local.
- The two-day report continues to include active and archived parcels and opens in a printable/Save-as-PDF preview.

## Validation

- Canonical LabelOnZeWay workflow, password authentication, cloud synchronization, Operations Deck, Deep Rescue, and Claims Vault suites pass.
- Android JavaScript, retained-workflow, native bridge, project-integrity, and Operations Deck suites pass.
- iOS JavaScript and all 49 native/project checks pass.
- Android Gradle compilation, unit tests, APK metadata, assets, signer, permissions, discovery implementation, and DEX validation are recorded in `RELEASE_MANIFEST.json`.
- iOS still requires compilation/signing in macOS/Xcode and physical-device testing.
- Live Supabase migration and authenticated two-staff verification remain operator tasks.
