// Next.js middleware — runs on every request before rendering.
// Handles session refresh (required for Supabase SSR) and admin route protection.
export { proxy as middleware, config } from '@/proxy'
