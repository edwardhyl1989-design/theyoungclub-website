# THE YOUNG CLUB — isolated development
Base production commit: 613dc5d1b0f0fa183aabaf84b3c5848dbe23bd6f
Branch: development

This branch is a staging workspace. Production main and its database must remain untouched.
The Supabase config is deliberately empty until a distinct test project is approved and verified.
Cloudflare Pages headers block external API connections while isolated credentials are not configured.
Do not merge supabase-config.js, robots.txt, _headers, or DEVELOPMENT.md into production.
Do not use live user records, production secrets, email/notification jobs, or production storage for staging tests.
Before enabling API access, verify the test project ref, use only its public client key, update the CSP to allow only its HTTPS/WSS origins, and configure test auth redirects.
Use Cloudflare Access (including branch preview hostnames) for staging. Robots/noindex are not access control.
Before releasing a redesign, test guest/member/verified/admin roles and mobile/desktop layouts using synthetic accounts and data; review a targeted diff and preserve production configuration.

## Staging project provisioned
Supabase project: theyoungclub-dev
Project ref: manxspfufydqwgkxpwtw
Region: us-west-1
Provisioning status: ACTIVE_HEALTHY
Creation cost quote approved: USD 0/month.

The new database has zero public application tables, zero auth users and zero storage objects at provisioning. Production has 58 public application tables and 102 recorded migrations. The repository's legacy supabase-schema.sql defines only two tables; it is NOT a full restore baseline. Do not replay the migration history blindly or copy production user data.

Next: export the current schema only using the Supabase CLI/pg_dump with authorized database access. Review custom auth and storage policies/triggers, grants, extensions, functions, and dependencies; exclude production secrets, data, scheduler jobs, webhooks and external integrations. Restore into the development project only, create test-only storage buckets and synthetic users/content, configure test auth redirects, and verify permissions. See https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.
Until verified, keep supabase-config.js empty and the staging network guard in place.
Cloudflare: create a separate Pages project using the development branch; apply access protection to custom and preview hostnames before using real accounts; then add dev.theyoungclub.com. Do not change the production project or its DNS records.
