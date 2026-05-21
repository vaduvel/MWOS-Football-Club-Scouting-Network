export default function MissingConfigScreen() {
  return (
    <div className="min-h-dvh bg-[var(--color-light)] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white border border-[var(--color-mid)]/20 rounded-3xl shadow-xl p-8 md:p-10">
        <div className="inline-flex items-center rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
          Setup Required
        </div>

        <h1 className="mt-6 text-3xl md:text-4xl font-black text-[var(--color-dark)] uppercase tracking-tighter">
          Connect Supabase before running the app
        </h1>

        <p className="mt-4 text-[var(--color-mid)] font-semibold leading-relaxed">
          This build no longer uses the local Express and SQLite backend. Add the Supabase environment
          variables below, then redeploy or restart local development.
        </p>

        <div className="mt-8 rounded-2xl bg-[var(--color-dark)] text-white p-5 font-mono text-sm overflow-x-auto">
          <p>VITE_SUPABASE_URL=...</p>
          <p>VITE_SUPABASE_ANON_KEY=...</p>
          <p>VITE_SERVERLESS_FUNCTIONS_BASE_URL=/api or /.netlify/functions</p>
        </div>

        <div className="mt-8 space-y-3 text-sm text-[var(--color-dark)] font-semibold">
          <p>1. Create a Supabase project and run the SQL from `supabase/schema.sql`.</p>
          <p>2. Copy the project URL and anon key into your environment.</p>
          <p>3. In your hosting platform, add the same variables plus the serverless base URL.</p>
        </div>
      </div>
    </div>
  );
}
