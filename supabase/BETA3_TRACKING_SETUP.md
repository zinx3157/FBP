# Beta 3 tracking migration

Review and run `beta3_tracking_migration.sql` in the existing Supabase project's SQL editor after the existing workspace schema is present. It exposes only order number, operational status, and update time through an opaque UUID token. It never exposes customer address, telephone, COD, reconciliation, or workspace data.

Do not add a service-role key to the application. Revoke a public link by setting its `revoked_at` value as an authorized workspace staff member.
