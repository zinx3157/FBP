# Deployment checklist — release 1.3.3

## Completed locally

- [x] Integrate Google Stitch Proposal A — Operations Deck into the canonical web workflow.
- [x] Propagate matching web assets and native bridge behavior to Android and iOS source.
- [x] Preserve SHIPDESK, Claims Vault, Deep Rescue, safe cloud synchronization, and all required operational workflows.
- [x] Pass canonical web, cloud, password, Operations Deck, Deep Rescue, and Claims Vault suites.
- [x] Pass complete Android and iOS JavaScript/project suites.
- [x] Build Android `1.3.3 (8)` and validate APK metadata, embedded assets, permissions, signer, native discovery/direct printing, bounds, and DEX.
- [x] Package clean Android and iOS source archives and the hosted gateway.
- [x] Generate a release manifest and SHA-256 checksums.

## Before push

- [x] Review `git diff --check`, staged files, release manifest, and checksums.
- [x] Commit locally with the repository's established public author identity.
- [ ] Push the authenticated `main` branch to `zinx3157/FBP`.

## After GitHub Pages deploys

- [ ] Confirm <https://zinx3157.github.io/FBP/> loads current SHIPDESK.
- [ ] Confirm <https://zinx3157.github.io/FBP/labelonzeway/> opens Operations Deck on Home and all five destinations work.
- [ ] Confirm the v1.3.3 APK and source/gateway downloads match `CHECKSUMS.sha256`.
- [ ] Install the APK over v1.3.2 without uninstalling and confirm existing local records remain.
- [ ] Test physical POS80C detection/direct printing, no avoidable gap, and one cut after every label.
- [ ] Test Android system printing and iOS AirPrint.
- [ ] Compile/sign/install iOS through Mac/Xcode and test its direct printer bridge.

## Shared cloud workspace

- [ ] Run `supabase/SUPABASE_CLAIMS_MIGRATION.sql` on the existing project, or `SUPABASE_SETUP.sql` on a new project.
- [ ] Verify separate staff logins in one company workspace on two clients.
- [ ] Confirm customer, parcel, archive, claim-copy, profile, and counter synchronization in both directions.
- [ ] Confirm printer settings and active print queues do not synchronize.

Do not clear browser/application data, reset profiles, uninstall native apps, or expose a Supabase secret/service-role key.
