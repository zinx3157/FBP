# Deployment checklist — Web iOS 1.2.1

- [x] Synchronize canonical LabelOnZeWay 1.2.1 into `docs/labelonzeway/`.
- [x] Update the standalone manifest and bump the service-worker cache.
- [x] Rebuild the hosted gateway ZIP with the current local LabelOnZeWay app.
- [x] Run syntax, DOM/action, compact-mobile, AirPrint, Manifest, queue, and gateway regressions.
- [x] Verify canonical and Pages-source app hashes match.
- [ ] Commit and push the update to <https://github.com/zinx3157/FBP> using an authenticated Git environment.
- [ ] Confirm GitHub Pages deployment completes.
- [ ] Open <https://zinx3157.github.io/FBP/labelonzeway/> in Safari and confirm the 1.2.1 interface appears.
- [ ] Remove/re-add the Home Screen app or refresh Safari website data only if an older cached interface persists; back up records first.
- [ ] On a physical iPhone/iPad, test customer creation, label copies, Batch, Back/Cancel, Manifest, company profiles, backups, and AirPrint/PDF.
- [ ] Extract and start the rebuilt POS80C gateway on the Mac/PC.
- [ ] Open the gateway's local `/labelonzeway/` route on the iPhone/iPad.
- [ ] Test direct output to the POS80C on port `9100`, verifying no avoidable gap and one cut after every label copy.
- [ ] Confirm a failed direct print stays in the deferred queue and can be retried.

Do not upload live customer data, backups, reports, credentials, or private printer configuration to this public repository.
