SIRAYAT WEBSITE — PHASE 2 CMS STARTER
=====================================

This package adds an editorial dashboard prepared for a real Supabase backend.

FILES
- index.html / styles.css / script.js: public website prototype
- admin.html / admin.css / admin.js: staff login and article manager
- supabase-schema.sql: database tables and row-level security policies
- README_PHASE2.txt: setup guide

SETUP OVERVIEW
1. Create a Supabase project at https://supabase.com/.
2. Open SQL Editor and run the complete contents of supabase-schema.sql.
3. In Supabase Project Settings > API, copy the Project URL and anon/public key.
4. Open admin.js and replace YOUR_SUPABASE_PROJECT_URL and YOUR_SUPABASE_ANON_KEY.
   The anon/public key is intended for browser use when Row Level Security is correctly enabled.
   NEVER put a service_role key in admin.js or any browser file.
5. Create the first administrator account in Supabase Authentication.
6. In SQL Editor, run the administrator profile INSERT shown at the bottom of supabase-schema.sql,
   replacing YOUR_ADMIN_EMAIL with the actual admin email.
7. Create staff accounts in Supabase Authentication and insert matching rows in public.profiles.
   Set role to admin, editor_in_chief, section_editor, writer, or photojournalist.
   For section_editor, set section to one of the exact article categories.
8. Upload the folder to a static host that supports HTTPS (for example, Netlify or Cloudflare Pages).
   Keep index.html and admin.html in the same published folder.
9. Open /admin.html to sign in.

CURRENT IMPLEMENTATION STATUS
- The dashboard login and article CRUD are wired for Supabase.
- Database access is protected by row-level security policies.
- The public homepage still uses its sample articles from script.js; it is not yet connected to
  the database. The next integration step is to load only published records from Supabase.
- No public sign-up is provided. An administrator creates accounts and assigns roles.
- Image upload/storage and full editorial approval workflow are future additions.
- The dashboard's "Approve & publish" action is available to editor roles. Review your policies,
  test using separate role accounts, and have your school approve the system before public launch.

SECURITY / SCHOOL PUBLICATION NOTES
- Use individual accounts; do not share passwords.
- Use strong passwords and enable available account security protections.
- Do not publish private student details, sensitive information, or photographs without appropriate
  school approval and consent.
- Verify every story before publication. Sample content on the public site is placeholder content,
  not actual school reporting.
- This starter is not a substitute for a security review. Test all role permissions before launch.
