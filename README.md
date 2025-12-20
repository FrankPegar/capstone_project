# Capstone Project

Attendance monitoring application built with React (Vite) and a Supabase backend.

## Getting Started

1. Install dependencies:
   ```bash
   cd Attendance_monitoring_app
   npm install
   ```

2. Configure environment variables by copying the example file:
   ```bash
   cp .env.example .env.local
   ```
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are safe to expose to the Vite client and should come from your Supabase project's settings.
   - Keep the Supabase **service role key** private. Use it only for secure server-side tasks (migrations, scheduled jobs, etc.). Do **not** commit it or expose it to the browser.

3. Create the required database tables inside Supabase by running the SQL in `supabase/schema.sql` (Supabase Dashboard -> SQL Editor). Adjust the policies to fit your security requirements before deploying to production.

4. Start the development server:
   ```bash
   npm run dev
   ```

## Backend Notes

- The app connects directly to Supabase using the anon key for read/write operations against the `students` and `attendance` tables.
- Row Level Security (RLS) in `schema.sql` currently allows open inserts/selects; tighten these policies before going live.
- Use the service role key only from trusted server environments if you later add background jobs or admin scripts.
