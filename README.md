# Scout Report Builder

Aplicatia este pregatita acum pentru:

- autentificare si stocare date in Supabase
- deploy frontend pe Netlify
- functii Netlify pentru importul de loturi prin API-Football

## Setup local

1. Instaleaza dependintele:
   `npm install`
2. Copiaza variabilele din [.env.example](/Users/vaduvageorge/Desktop/Scout Report Builder/.env.example) intr-un fisier `.env.local`.
3. Creeaza un proiect Supabase.
4. Ruleaza SQL-ul din [supabase/schema.sql](/Users/vaduvageorge/Desktop/Scout Report Builder/supabase/schema.sql) in SQL Editor-ul Supabase.
5. Completeaza:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
6. Porneste frontend-ul:
   `npm run dev`

Observatie: importul de echipe foloseste functii Netlify. In productie merge direct pe Netlify. Local, pentru a testa si functiile, ruleaza proiectul prin `netlify dev` sau seteaza `VITE_NETLIFY_FUNCTIONS_BASE_URL` catre instanta ta de functii.

## Deploy pe Netlify

1. Pune proiectul intr-un repository Git.
2. In Netlify, conecteaza repository-ul.
3. Build command:
   `npm run build`
4. Publish directory:
   `dist`
5. Adauga environment variables in Netlify:
   `VITE_SUPABASE_URL`
   `VITE_SUPABASE_ANON_KEY`
   `VITE_NETLIFY_FUNCTIONS_BASE_URL=/.netlify/functions`
6. Deploy.

Fisierul [netlify.toml](/Users/vaduvageorge/Desktop/Scout Report Builder/netlify.toml) este deja adaugat pentru:

- publish din `dist`
- functii din `netlify/functions`
- redirect SPA catre `index.html`

## Supabase auth

Aplicatia foloseste Supabase Auth cu email/parola.

- Daca vrei login imediat dupa sign-up, dezactiveaza `Confirm email` in Supabase Auth settings.
- Daca lasi confirmarea activa, utilizatorul trebuie sa confirme emailul inainte de login.
