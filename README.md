# SHIPDESK + LabelOnZeWay — Web v1.3.0 ready package

Direct repository-root release package for:

- SHIPDESK: <https://zinx3157.github.io/FBP/>
- LabelOnZeWay: <https://zinx3157.github.io/FBP/labelonzeway/>
- Repository: <https://github.com/zinx3157/FBP>

This package matches the existing repository's root deployment layout. The public site contains application code only. Never commit customer exports, operational backups, reports, credentials, Supabase secret/service-role keys, or private printer configuration.

## Release highlights

LabelOnZeWay 1.3.0 adds:

- non-destructive **Recover Old Books** with preview/confirmation and conservative merge;
- direct address-book **Export CSV**;
- secure password recovery/change flows;
- Supabase authorized shared-workspace synchronization;
- complete compact New Label, Batch, Manifest, reports, archives, profile, AirPrint/system print, and direct POS80C workflows.

Root SHIPDESK also adds address-book CSV export. Printer settings and active/deferred print queues remain device-local.

## Historical address-book recovery

Recovery works only in the same Safari/Chrome browser profile and device where the records remain visible at the existing SHIPDESK URL.

1. Do **not** clear website data, uninstall the existing web app, or overwrite the old book.
2. Confirm the records remain visible at <https://zinx3157.github.io/FBP/>.
3. After the release is deployed, open <https://zinx3157.github.io/FBP/labelonzeway/> in that same browser.
4. Choose **Recover Old Books**, review the preview, and confirm the merge.
5. Check the customer count and fields, then choose **Export CSV** and create a full backup.

Recovery scans discoverable legacy/current company books on the shared GitHub Pages origin, excludes the current book as a source, skips malformed or empty data, retains current customers, conservatively deduplicates/enriches records, and never deletes the historical source keys.

## Direct POS80C gateway

Download `downloads/POS80C_Hosted_Print_Gateway.zip`, run the gateway on a Mac or Windows computer that can reach the POS80C, then open:

```text
http://COMPUTER_LAN_IP:8765/labelonzeway/
```

The bundle contains LabelOnZeWay 1.3.0. Direct output uses zero added feed by default and one cut after every physical label copy. AirPrint and normal system printing remain available.

## Deployment

This is a direct-root package. Replace the tracked files in the authenticated local clone of `zinx3157/FBP` with the contents of this folder, review the diff, commit, and push to `main`. Do not copy the enclosing `FBP_Web_v1.3.0_Ready` folder itself into the repository.

After GitHub Pages deployment, verify both public URLs before running recovery. Do not remove any old browser data until CSV export and a full backup have been checked.

## Local preview

From this folder:

```bash
python3 -m http.server 8080
```

Then open <http://127.0.0.1:8080/>. Local-preview browser storage is separate and cannot recover production records stored at `https://zinx3157.github.io`.

## Publication status

This is an unpublished release candidate. Publication requires explicit approval and authenticated Git access.
