# LabelOnZeWay — Supabase Setup

LabelOnZeWay is prepared to synchronize business data across the Web/PWA, Android, and native iOS builds. Until `sync-config.json` contains valid public project details, every build continues to work locally/offline and shows **Cloud setup pending**.

## What synchronizes

Within one authorized company workspace:

- Company profiles and shared profile settings
- Customers/address book
- Active parcel/label rows and Manifests
- Archived Manifest days
- Permanent, versioned electronic label copies for claims (`label_copy` records)
- Physical label-copy values (kept separate from permanent claim retention)
- Delivery, POD, payment, reconciliation, and received-amount fields
- Counters and report-source data

The following always stay local to each device:

- POS80C IP address and port
- Direct/system print mode
- Local gateway URL
- Raster, feed, threshold, and cutter settings
- Pending print queue
- Device-specific Qwen/OCR endpoint settings

This separation prevents one phone from changing another phone's printer and prevents duplicate print jobs.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com/dashboard>.
2. Choose **New project**.
3. Set a strong database password and save it in a password manager.
4. Choose the nearest suitable region and wait for provisioning to finish.

Do not put the database password or a `service_role` key in LabelOnZeWay.

## 2. Install the secure schema and RLS rules

1. Open **SQL Editor** in the new project.
2. Open `SUPABASE_SETUP.sql` from this package.
3. Paste the entire file into a new query and run it once.
4. Confirm the query completes successfully.

**Existing project upgrade:** if this Supabase project was configured with an earlier LabelOnZeWay release, run `SUPABASE_CLAIMS_MIGRATION.sql` in SQL Editor before publishing v1.3.3. It non-destructively adds the `label_copy` entity type and updates the protected synchronization RPC. Rerunning the full current `SUPABASE_SETUP.sql` is also safe and performs the same schema upgrade.

The SQL creates:

- Shared workspaces and per-user memberships
- RLS-protected generic synchronized entities
- Per-record client timestamps, device IDs, and tombstones
- Atomic order-number block reservation
- Realtime publication, with 20-second reconciliation as a fallback

## 3. Create a separate login for each staff member

1. Go to **Authentication → Users**.
2. Use **Add user** or **Invite user** for each person.
3. Give every staff member their own email and password. Do not share one account.
4. Copy each user's UUID for the membership step.

For a controlled staff app, leave public self-signup disabled unless you have a separate onboarding process.

### Configure password recovery

LabelOnZeWay provides **Forgot password** for signed-out staff and **Change password** for signed-in staff. Password recovery is email-based, and the administrator never sees or stores a staff password.

1. In Supabase, open **Authentication → URL Configuration**.
2. Set the production Site URL to:
   `https://zinx3157.github.io/FBP/labelonzeway/`
3. Add this exact URL under **Redirect URLs / Additional Redirect URLs**:
   `https://zinx3157.github.io/FBP/labelonzeway/?lz_action=password-recovery`
4. Keep the Email authentication provider enabled.
5. If validating from a temporary preview, add that preview's exact `/?lz_action=password-recovery` URL only for the test, then remove it afterward.
6. After v1.3.3 is published, repeat one recovery-email test from **Cloud → Forgot password?** to verify the permanent production URL.

The recovery link intentionally opens the secure production Web/PWA page, including when it was requested from Android or native iOS. Temporary Arena `.e2b.app` previews are recognized only for pre-publication recovery testing; every normal build uses the fixed production redirect above. For a signed-in change, LabelOnZeWay securely reauthenticates the staff email with the entered current password immediately before sending only the new password to Supabase. After setting the new password, the staff member returns to the app and signs in again. A successful password change signs out all existing sessions for that staff account.

Do not delete and recreate a staff user merely because a password was forgotten. Recreating the user changes its Auth UUID and therefore its workspace membership identity.

## 4. Create the company workspace and memberships

In **SQL Editor**, run the following after replacing the placeholders:

```sql
insert into public.workspaces (name, created_by)
values ('YOUR COMPANY', 'OWNER_AUTH_USER_UUID')
returning id;
```

Copy the returned workspace UUID. Then add staff:

```sql
insert into public.workspace_members (workspace_id, user_id, role)
values
  ('WORKSPACE_UUID', 'OWNER_AUTH_USER_UUID', 'admin'),
  ('WORKSPACE_UUID', 'SECOND_STAFF_AUTH_USER_UUID', 'staff');
```

Roles:

- `admin`: can synchronize and administer workspace memberships.
- `staff`: can synchronize business records and reserve order numbers.
- `viewer`: can read synchronized records but cannot upload changes or reserve numbers.

Add more rows for additional staff. Never add an unauthenticated/public user.

## 5. Obtain the two public client values

Open **Project Settings → API** (or **Connect → App Frameworks**, depending on the current Supabase dashboard layout) and copy:

1. Project URL, similar to `https://example.supabase.co`
2. Public **anon** or **publishable** key

The public anon/publishable key is designed for client use. Security is enforced by Supabase Auth, workspace membership, RLS, and the protected RPC functions.

**Never use the `service_role` secret.** It bypasses RLS.

## 6. Configure LabelOnZeWay

Edit `sync-config.json` in each source/distribution and put only these two values in it:

```json
{
  "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
  "supabaseAnonKey": "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
}
```

Do not add email addresses, passwords, workspace IDs, database passwords, or service secrets to this file.

The same configured `sync-config.json` is used by:

- GitHub Pages Web/PWA
- Android app assets
- Native iOS app assets
- Local gateway-hosted Web/PWA

## 7. Validate before publishing

1. Sign in as Staff A on one test device.
2. Sign in as Staff B on a second test device.
3. Confirm both show the same workspace.
4. Create a customer and label on device A.
5. Tap **Cloud → Sync Now** or wait up to 20 seconds.
6. Confirm the record appears on device B.
7. Edit payment/POD/copies on B and confirm A receives the changes.
8. Disconnect B from the internet, create a label, and confirm it receives an `OFF-…` collision-safe order ID if its reserved online block is exhausted.
9. Reconnect B and confirm the pending count returns to zero.
10. Confirm printer IP/mode and pending print jobs do **not** move between devices.
11. Test staff outside the workspace and confirm they cannot read its rows.
12. Test a `viewer` account and confirm it cannot upload changes.
13. Request a password recovery email, open its link, set a new password, and confirm the old password no longer signs in.
14. Generate a label on A, then confirm its permanent claim copy appears in the Claims Vault on B.
15. Correct the label on B and confirm both independent claim versions appear on A.
16. Delete/clear the related Manifest and archived day and confirm both claim versions remain searchable and reprint one copy.
17. While signed in, use **Cloud → Change password**, then confirm all sessions sign out and the new password works.

## Order-number behavior

While online, each device reserves a small atomic block from Supabase and consumes it synchronously. This prevents two staff phones from issuing the same normal order number. If a device is offline and has no reserved number left, it issues a device-qualified `OFF-…` order ID. Existing labels are never renamed later.

## Operational notes

- Local/offline work remains available if Supabase or the internet is temporarily unavailable.
- Pending business mutations remain on the originating device and retry when connectivity returns.
- Deleted records synchronize as tombstones instead of silently reappearing.
- The current client reconciles every 20 seconds and also listens for Realtime changes.
- Pulls are paginated in 1,000-row pages. Uploads use at most 200 records and about 4 MB per RPC; one synchronized record is limited to 8 MB.
- Large retained images increase database and bandwidth use. Monitor Supabase quotas and keep regular LabelOnZeWay backups.
- Publication should occur only after software validation and after the Project URL and public key have been supplied and tested.
