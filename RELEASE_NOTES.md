# Release notes — LabelOnZeWay Web iOS 1.2.1

Date: 2026-08-13

## LabelOnZeWay update

- Replaced the older `/labelonzeway/` interface with the compact Android APK v1.2.1 workflow adapted for iPhone/iPad browsers.
- Preserved coordinated customer creation/selection and label details.
- Preserved compact New Label, Batch, centered Manifest, and More views.
- Preserved mobile Back and Cancel controls.
- Kept item quantity separate from physical label-copy count throughout New Label, Batch, Manifest, system print, direct print, and CSV output.
- Preserved selected-label printing, payment modes, parcel/customer records, archive, reports/reconciliation, CSV exports, backups/restores, and deferred print queues.
- Preserved in-app company-profile creation.
- Added a light 80 mm thermal-roll Manifest and retained the complete A4 Manifest/PDF path.

## iPhone/iPad web behavior

- Added iOS web-app metadata and standalone Add to Home Screen support.
- Updated the PWA manifest and bumped the service-worker cache to `labelonzeway-ios-web-v121`.
- Made iPhone/iPad system print and AirPrint the fresh-install default.
- Kept direct ESC/POS as an optional local-gateway mode without claiming Safari can open raw TCP port `9100`.
- Public HTTPS no longer auto-selects or calls an insecure HTTP LAN gateway.
- Local gateway pages on private HTTP addresses auto-select their same-origin `/api` route.
- Local requests include Private Network Access address-space metadata when supported.
- Unavailable gateway retries keep deferred label queues stored instead of falling through to native-only discovery.
- The hosted gateway ZIP download action points to `../downloads/POS80C_Hosted_Print_Gateway.zip`.

## POS80C gateway package

- Rebuilt the hosted gateway ZIP with the current LabelOnZeWay Web iOS 1.2.1 files.
- Corrected the downloaded package's static `web_root` to its bundled `web` directory.
- Preconfigured the gateway for `https://zinx3157.github.io/FBP/`.
- Retained private/local printer destination enforcement and cut-after-each-label output.
- Direct labels default to zero added feed so consecutive labels have no avoidable blank spacing.

## Validation completed

- Extracted JavaScript and service-worker syntax checks passed.
- HTML parse found one inline script, no external native bridge, 148 unique element IDs, and no duplicate IDs.
- Compact mobile customer/label coordination regression passed.
- Batch, quantity/copies, cutter, profile, Back/Cancel, Manifest centering, and system-print regression passed.
- All-button/action retained-workflow smoke test passed with no missing actions or fatal UI errors.
- Browser-specific public HTTPS, AirPrint, 80 mm/A4 preview, queue, hosted ZIP, local-gateway, Private Network Access, ESC/POS raster, cut, spacing, and PWA checks passed.
- Canonical and `docs/labelonzeway/` distribution hashes match.

## Publication status

The validated Pages source is ready locally. Publication to GitHub still requires an authenticated Git remote or GitHub token in the working environment.
