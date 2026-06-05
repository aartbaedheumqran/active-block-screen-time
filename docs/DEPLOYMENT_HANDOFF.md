# Deployment Handoff

This repo is safe to share publicly. It does not include real Supabase keys, database passwords, `.env.local`, Vercel project metadata, generated builds, or local deployment logs.

## What the deployment agent should do

1. Create or use a Supabase project.
2. Enable Auth for the prototype. Anonymous sign-in is useful for a quick demo.
3. Run `supabase/migrations/20260527_active_block_backend.sql` in the Supabase SQL editor.
4. In Vercel, set these environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy the React/Vite app.
6. Test the demo flow:
   - sign in or create a demo user
   - create a group challenge
   - copy/join with the group code
   - set a daily goal
   - log usage
   - run/check the tower outcome

## Security reminder

Only the Supabase anon key belongs in the frontend environment. Never put a service-role key, database password, personal GitHub token, or OAuth client secret in this repo.
