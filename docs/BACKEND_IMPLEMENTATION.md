# Backend Implementation

The current prototype is wired to Supabase without changing the visual design of the app.

## Included Backend Pieces

- Supabase client in `src/lib/supabase.ts`.
- Local fallback data so the prototype can still open without env vars.
- Backend service layer in `src/services/activeBlockService.ts`.
- React hook in `src/hooks/useActiveBlockBackend.ts`.
- Supabase schema, RLS policies, indexes, and RPC functions in `supabase/migrations/20260527_active_block_backend.sql`.

## Data Covered

- User profiles.
- Active Block groups.
- Group members and invite state.
- Group join codes.
- Daily screen-time goals.
- Usage logs.
- Tower events and streak resets.
- Focus sessions.
- Blocked apps.
- Soft app limits.

## Key RPC Functions

- `create_active_block_group(...)`
- `join_active_block_group(...)`
- `run_active_block_daily_check(...)`

## Demo Behavior

The app can run in two modes:

- Local fallback mode when Supabase env vars are missing.
- Supabase mode when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.

This makes the repo useful for both a quick visual demo and a database-backed showcase.
