# SHIPDESK + LabelOnZeWay v1.3.3 — Operations Deck

GitHub Pages release package for:

- SHIPDESK: <https://zinx3157.github.io/FBP/>
- LabelOnZeWay: <https://zinx3157.github.io/FBP/labelonzeway/>
- Repository: <https://github.com/zinx3157/FBP>

## Operations Deck redesign

Version 1.3.3 applies the saved Google Stitch **Proposal A — Operations Deck** design to the canonical LabelOnZeWay workflow on web/iPhone-web, Android, and iOS source. It adds explicit Home, New Label, Batch, Manifest, and More destinations while retaining the tested operational DOM and data flows.

The phone interface keeps safe-area handling, compact forms, accessible controls, Back/Cancel behavior, sticky editing/printing actions, customer coordination, 1–20 label copies, New Label after save, batch deletion, 80 mm and A4/PDF manifests, payments, reports, archive, backup, profiles, Claims Vault, Deep Rescue, and cloud controls.

## Download and installation

- Android APK: [`downloads/LabelOnZeWay_Android_v1.3.3_Operations_Deck.apk`](downloads/LabelOnZeWay_Android_v1.3.3_Operations_Deck.apk)
- Android source: [`downloads/LabelOnZeWay_Android_v1.3.3_Operations_Deck_Source.zip`](downloads/LabelOnZeWay_Android_v1.3.3_Operations_Deck_Source.zip)
- iOS/Xcode source: [`downloads/LabelOnZeWay_iOS_v1.3.3_Operations_Deck_Source.zip`](downloads/LabelOnZeWay_iOS_v1.3.3_Operations_Deck_Source.zip)
- Hosted POS80C gateway: [`downloads/POS80C_Hosted_Print_Gateway.zip`](downloads/POS80C_Hosted_Print_Gateway.zip)
- Browser/PWA instructions: [`install.html`](install.html)

Install the Android APK **over the existing app** so its device-local data remains available. Do not uninstall or clear application/site storage before Deep Rescue, CSV export, and backup verification. The iOS native source still requires macOS, Xcode signing, installation, and physical-device testing.

## Printing

Direct ESC/POS output retains zero avoidable feed and one auto-cut after every selected physical label. The Android and iOS bridges include bounded, cancellable private-LAN POS80C discovery. Android system printing and iOS AirPrint remain available, as do offline print queues and device-local printer settings. The hosted gateway provides direct browser-to-POS80C printing from macOS and other desktop systems.

## Claims and shared workspace

Every generated label receives a permanent electronic Claims Vault version independent of its physical copy count. Claim versions survive manifest/archive deletion and preserve the historical company identity. Authorized staff can synchronize the safe workflow through one Supabase company workspace; printer settings and active queues stay local.

The implementation passes mock two-client synchronization tests. An authorized operator must still run the Supabase migration and verify separate staff logins against the deployed project:

- Existing project: `supabase/SUPABASE_CLAIMS_MIGRATION.sql`
- New project: `supabase/SUPABASE_SETUP.sql`
- Guide: `supabase/SUPABASE_SETUP.md`

Never commit customer exports, backups, reports, staff credentials, private printer configuration, or Supabase secret/service-role keys.

## Publication

This directory is a fresh clone of `zinx3157/FBP` with the v1.3.3 release committed locally. Review `RELEASE_MANIFEST.json`, `CHECKSUMS.sha256`, and `DEPLOYMENT_CHECKLIST.md`, then push `main` through an authenticated GitHub session.
