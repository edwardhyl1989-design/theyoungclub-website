# THE YOUNG CLUB — Member Job Board Setup

## What this package does
- **jobs.html**: separate Hiring / Job Postings site, independent of PTA BLOG / Disqus.
- Visitors can read APPROVED postings without a login.
- Members sign up via email, log in, submit ads, edit their own submissions, and view review status.
- New and edited posts are **pending**, invisible to the public until approved.
- An administrator can approve or reject posts using the admin area on jobs.html.
- Row Level Security plus a database trigger enforce authorization on the server, not just in the browser.

## One-time setup (not optional)
1. Go to https://supabase.com, register, create a **Free** project (create a strong database password and keep it private).
2. In Supabase SQL Editor run the *entire* `supabase-schema.sql` script. Do NOT use public service keys on the web.
3. In Supabase Project Settings / API Keys copy the **Project URL** and **publishable key** (or legacy **anon** key). Paste those PUBLIC values into `supabase-config.js`. NEVER paste a **service_role**, **secret**, or database password into that file.
4. In Supabase Authentication → URL Configuration, add `https://theyoungclub.com/jobs.html` as an allowed redirect URL. You may also add the full `https://www.theyoungclub.com/jobs.html` if used. Set Site URL to `https://theyoungclub.com`.
5. In Authentication → Providers, enable Email and **Confirm email** for secure self-registration. Configure SMTP if default mail delivery limits prevent signup email delivery.
6. Upload `jobs.html`, `jobs.css`, `jobs.js`, `supabase-config.js` to the ROOT of your GitHub `theyoungclub-website` repository; Cloudflare Pages will deploy automatically.
7. Open `https://theyoungclub.com/jobs.html`, sign up using your own ADMIN EMAIL and confirm the email; then log in.
8. In Supabase SQL Editor run the commented-out admin assignment at the bottom of `supabase-schema.sql`, replacing `YOUR_ADMIN_EMAIL@example.com` with the exact email used above. This SQL must be executed manually by project owner; **do not add it to frontend source**.
9. Refresh jobs.html. Your account will see an **Approve Job Postings** section. Approve or reject sample submissions. New submissions stay pending.

## Link the board from your PTA BLOG without replacing blog files
Add a normal link to your existing blog sidebar / navigation, e.g.:
`<a href="jobs.html">HIRING / JOB POSTINGS</a>`
You do NOT need to overwrite your existing `blog.html`, `post.html`, `site.css`, `posts.json`, `.pages.yml`, `index.html`, or Disqus setup.

## Security notes
- The PUBLIC Supabase key only works with database row-level policies. Keep RLS enabled.
- Admin status is NOT assigned based on emails entered in browser profiles. Only `job_admins` populated by your trusted SQL grants admin rights.
- Uploaded scripts or direct API calls can't approve unaudited entries: the trigger forces member edits to `pending`.
- Applicant contact email is public when submitted; avoid sharing a personal address if privacy is desired.
- Applications happen by external HTTPS URLs or mailto links. This site does NOT collect resumes, passwords, or applicants' health information.
- Keep a backup of your Supabase data; the free tier has limits and service terms may change.

## Notes about release state
No real Supabase project, member, database, or DNS is created by downloading this ZIP. Nothing will accept registrations until setup steps 1–8 are completed. Frontend interactions need live testing once connected. The package leaves your existing PTA BLOG untouched.
