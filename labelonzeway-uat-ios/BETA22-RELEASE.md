# LabelOnZeWay Beta 2.2

Beta 2.2 is a reliability-focused test release and does not replace the live `labelonzeway/` application.

## Included

- Self-contained batch readiness states: Processing, Contact Review, Price Required, Customer Required and Ready.
- Derived Sales, Delivery and Total COD summaries on every batch row.
- Visible warning whenever Collect is manually overridden.
- Manifest search and filters for operational status, payment, missing details and overrides.
- Duplicate Pick-number detection.
- Profile audit history with CSV export.
- Date-based Pick IDs backed by reserved cloud number blocks when signed in.
- Explicit offline Pick IDs when a signed-in device has no reserved online number available.
- Beta 2.2 build badge and isolated service-worker cache.
- Beta 2.1 contact decisions, PDF sharing, secure-link hook, reports, label vault and printing features.

## Backend-dependent features

Secure PDF/tracking links require `supabase/LABEL_SHARE_SETUP.sql` and the `create-label-share` Edge Function to be deployed. Cloud-safe Pick blocks require the order-counter functions in `supabase/SUPABASE_SETUP.sql`.

