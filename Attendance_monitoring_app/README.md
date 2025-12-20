# Attendance Monitoring App

React + Vite front-end for the attendance/anomaly dashboard. Supabase can be used for persistence.

## Supabase setup

1) In Supabase, create a new project and run the SQL in `supabase/schema.sql` to create tables/policies.  
2) Copy your project URL and anon key from **Project Settings → API**.  
3) Create a `.env.local` file in this folder with:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
VITE_EMAILJS_PARENT_TEMPLATE_ID=your-emailjs-template-id
VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
VITE_EMAIL_FROM_NAME=Attendance Team
VITE_EMAIL_REPLY_TO=replyto@example.com
```
4) Restart `npm run dev` so Vite picks up the env vars.

When both Supabase vars are set, the app auto-enables Supabase: it reads students/attendance on load and writes new/edited/deleted students and new attendance records through Supabase.

Optional: set the EmailJS vars to enable automatic parent alerts for medium/high anomalies (uses `@emailjs/browser`). The email template can include `time_in` and `time_out` placeholders.

## Local development

```
npm install
npm run dev
```

## Production build

```
npm run build
```
