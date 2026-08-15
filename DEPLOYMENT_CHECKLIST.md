# Deployment checklist — Web iOS 1.3.0

## Completed locally

- [x] Synchronize canonical LabelOnZeWay 1.3.0 into repository-root `labelonzeway/`.
- [x] Add non-destructive historical address-book discovery, preview/confirmation, conservative merge, and CSV export.
- [x] Add direct address-book CSV export to root SHIPDESK.
- [x] Include Supabase shared-workspace synchronization and secure password recovery/change flows.
- [x] Bump the service-worker cache to `labelonzeway-ios-web-v130-auth4-address1`.
- [x] Refresh the hosted POS80C gateway ZIP with the v1.3.0 web assets.
- [x] Run canonical cloud-sync, password-auth, recovery/export, and web workflow regressions.
- [x] Run complete Android and iOS JavaScript regression suites.
- [x] Pass all 46 iOS native project/static bridge checks, including bounded cancellable printer discovery.
- [x] Verify canonical and Pages-source web assets match.

## Publication and real-device checks still required

- [ ] Commit and push to <https://github.com/zinx3157/FBP> from an authenticated Git environment.
- [ ] Confirm GitHub Pages deployment completes.
- [ ] Open <https://zinx3157.github.io/FBP/> in the original browser/device and confirm the historical records remain visible.
- [ ] In that same browser/device, open <https://zinx3157.github.io/FBP/labelonzeway/> and run **Recover Old Books**.
- [ ] Review the preview, confirm the merge, verify customer counts/fields, then run **Export CSV** and a full backup.
- [ ] Verify SHIPDESK's **Export Book**/address-book CSV action.
- [ ] Test authorized shared-workspace synchronization using separate staff logins.
- [ ] Validate the real password-recovery email callback and new-password flow.
- [ ] Build the iOS app from `App.xcworkspace` on a Mac with Xcode.
- [ ] On a physical iPhone, test native printer discovery, cancellation, AirPrint, and direct POS80C output.
- [ ] Verify direct labels have no avoidable gap and one cut after each label copy.

**Data safety:** Do not clear Safari/Chrome website data, remove the installed web app, or overwrite the historical address book before recovery and exports are verified. A normal page reload is safe; clearing site data is not.

Do not upload live customer data, backups, reports, credentials, Supabase secret/service-role keys, or private printer configuration to this public repository.
