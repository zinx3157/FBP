# Release notes — LabelOnZeWay Web iOS 1.3.0

Date: 2026-08-15

## Historical address-book recovery

- Added **Recover Old Books** to the customer toolbar and Address Book.
- Scans discoverable SHIPDESK/LabelOnZeWay company profiles and address-book storage keys on the same GitHub Pages origin.
- Shows a recovery preview and requires confirmation before merging.
- Retains all current customers, conservatively deduplicates, and enriches missing name, phone, area/city, address, and note values.
- Handles malformed or empty legacy storage without deleting or rewriting source records.
- Added direct semicolon-delimited UTF-8 CSV export with complete quoting/escaping.
- Added address-book CSV export to root SHIPDESK as well.

Recovery must be run in the same Safari/Chrome browser profile and on the same device where the historical records remain visible. Do not clear website data before recovery, CSV export, and backup are verified.

## Shared workspace and authentication

- Added Supabase-backed synchronization for authorized business workflow data across separate staff logins in one company workspace.
- Printer settings and active/deferred print queues remain device-local.
- Includes Forgot Password, Set New Password, and signed-in Change Password flows with immediate reauthentication for sensitive changes.
- Uses a public publishable client key with row-level security; no secret/service-role key is shipped.

## Printing and mobile workflow

- Retains system print/AirPrint and direct POS80C ESC/POS output.
- Retains automatic native printer discovery, New Label, Batch Delete Label, copies 1–20, compact mobile screens, Back/Cancel, 80 mm/A4 Manifest formats, archives, and reports.
- Refreshed the downloadable hosted gateway with the v1.3.0 web assets.
- Bumped the PWA cache to `labelonzeway-ios-web-v130-auth4-address1`.

## Validation completed locally

- Canonical cloud sync, password authentication, historical recovery/export, and iOS/web workflow suites pass.
- Android's complete five-suite JavaScript regression run passes.
- iOS JavaScript workflow suites pass.
- iOS static native-project validation passes all 46 checks, including raw TCP printing, AirPrint, and bounded cancellable private-LAN discovery.
- Staged Pages assets match their canonical SHIPDESK and LabelOnZeWay sources.

## Validation still required

- Real password-recovery email callback.
- Mac/Xcode compilation from `App.xcworkspace`.
- Physical iPhone printer-discovery, AirPrint, and POS80C tests.
- Production recovery/export on the original browser/device after publication.

## Publication status

This is a local release candidate. It has not been published. Commit/push and GitHub Pages deployment require approval and an authenticated Git environment.
