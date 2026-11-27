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

## Schema restoration and frontend connection
Schema copied from live catalog metadata without production rows: 58 tables, 335 columns, 87 functions, 251 constraints (three equivalent AND parenthesis normalizations), 101 indexes, 36 triggers, 203 RLS policies (including storage), 6 bucket definitions; role/column/function grants compared and matched. All 58 tables have RLS enabled. Zero auth users and storage objects at verification. pg_cron/pg_net and all Edge Functions deliberately excluded; no production secrets or scheduled jobs copied. Security advisor flags existing executable security-definer patterns; review before release. Development frontend is limited to staging Supabase HTTPS/WSS via CSP and hostname guard. Auth URL configuration, synthetic accounts, seed data, Edge Function staging substitutes, security and browser regression tests remain. Do not use production login credentials in staging. Set dev Auth Site URL and exact staging redirect URLs in Supabase Dashboard before signup testing. Current production branch head at verification: 613dc5d1b0f0fa183aabaf84b3c5848dbe23bd6f.

## Production source synchronization — 2026-11-26
Imported website source from production commit 913edf421f90ac4a7b886b40cc40acdba7be09ac. Kept staging Supabase configuration, robots, network headers, auth retry logic, and development migration. Production database records and storage objects were not copied. Future promotion must preserve the environment-specific settings.

## Production source synchronization — 2026-11-27
Imported production source snapshot adb8137f3534260ccfe09f8e9625bca7d8ac560c. Retained isolated Supabase configuration, hostname guard, CSP, robots, staging authentication retry logic and development migration. No production data or storage copied. Verified staging supports home activity counts, support chat, media framing, and notice destinations.

Included concurrent production Jobs redesign through f5d74dd90d43374de9202fa6e0f401bad08c7915.

## Production source synchronization — 2026-11-26 (evening)
Imported main snapshot a31b401b9125b91f722c2821771ba9573e1f783a. Preserved staging-only Supabase configuration, hostname guard, CSP, robots, development migration and auth retry; merged current production auth behavior into staging auth. No production database rows, users, storage or secrets copied.

Follow-up sync: 60fe77e67c94681736e5bdb890872b103e92de7e. Development-only job language flag columns verified: Korean, English, Chinese, Japanese, Spanish (boolean not null default false). Production data unchanged.
