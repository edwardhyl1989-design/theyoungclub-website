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
