# Notepad
A public note wall for thoughts, questions, kindness, recommendations and replies.

## Run locally
1. Install Node.js 18+.
2. Run `npm install`.
3. Run `npm run dev` and open the local URL.

Without Supabase credentials, preview mode stores notes in this browser only.

## Make it shared with everyone
1. Create a project at https://supabase.com/.
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy your Project URL and anon/public key from Project Settings → API.
4. Add these environment variables to Vercel (and a local `.env.local` when developing):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Redeploy. Notes, replies and reactions are then shared and update live.

Never put a Supabase service-role key in frontend code or GitHub.

## Deploy
Import this repository into Vercel with the Vite preset. Set the two environment variables above and deploy.

## Before a public launch
The database policies allow public posting and replies. Add server-side rate limiting, CAPTCHA/spam protection, and a moderation workflow before promoting the site widely. Reports are collected but do not automatically hide content. Remind visitors not to share private or identifying information.

Built with React, Vite, Supabase and Lucide.