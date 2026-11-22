THE YOUNG CLUB / PTA BLOG — SETUP GUIDE
=====================================
1) Extract this ZIP file. Upload ALL extracted files to the ROOT of your existing GitHub repository:
   github.com/edwardhyl1989-design/theyoungclub-website
   IMPORTANT: Also upload .pages.yml. On Windows it may be hidden; enable View > Show > Hidden items.
   GitHub Add file > Upload files > Commit changes.
2) Cloudflare Pages will automatically deploy the new files. Do NOT change DNS or build settings.
3) Open https://theyoungclub.com/blog.html to see the sample post.
4) For easy writing, open https://app.pagescms.org, sign in with GitHub, authorize this repository.
   The item PTA BLOG - Posts lets you add items to posts.json. Enter a unique URL ID,
   title, date, category, optional summary/cover photo, and article body. Save to GitHub.
   Cloudflare Pages will redeploy; no manual HTML editing required.
5) For guest comments, create a Disqus site at https://disqus.com/admin/create/ .
   Copy its SHORTNAME (not the full site URL). In Pages CMS open PTA BLOG - Settings
   and enter the shortname under disqus_shortname. Save. Then in Disqus admin:
   Settings > Moderation > Guest Commenting = On, and approve guest comments when received.
   NOTE: Disqus Basic free plan may show ads. Guest commenters do not need a Disqus login,
   but may be asked for an email/name; guest comments require manual approval.
6) Website structure:
   index.html = existing landing page, unchanged
   blog.html = public article list and search
   post.html = individual article and comments
   shop.html = existing apparel page, unchanged
   posts.json = articles, edited in Pages CMS
   site-config.json = Disqus comment setup
   .pages.yml = Pages CMS editor settings
   site.css = blog styles
7) If Pages CMS cannot open posts.json, first confirm .pages.yml is in the repository ROOT.
   All files should be at repository root, not inside a subfolder from the ZIP.

IMPORTANT: Never post patient-identifying information or patient images without appropriate permission.
