# Creative Cost Compass

Rate benchmarking platform for creative professionals — TouchDesigner, Notch, projection mapping, LED installations, and live visuals.

## Stack

- **Frontend:** React 18 + TypeScript (Vite), Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Supabase (PostgreSQL + RLS + Auth), Deno edge functions
- **AI:** Gemini API for rate estimation and privacy sanitization

## Getting started

```sh
npm install
npm run dev
```

The dev server starts at `http://localhost:8080`.

## Environment variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

The Supabase edge functions require a `GEMINI_API_KEY` secret:

```sh
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

## Build

```sh
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Tests

```sh
npm test         # run once
npm run test:watch
```
