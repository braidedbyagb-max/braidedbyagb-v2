# BraidedbyAGB Admin — Mobile App

React Native / Expo admin app for BraidedbyAGB. Mirrors the web admin panel with native UX and push notifications.

## Quick start

### 1. Install dependencies

```bash
cd apps/mobile
npm install -g expo-cli eas-cli
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://braidedbyagb.co.uk
```

> **Tip:** Use the same Supabase project as the web app.

### 3. Run in Expo Go (quick preview)

```bash
pnpm start
```

Scan the QR code with **Expo Go** on your Android phone.

> Note: Some features (SecureStore, push notifications) require a **development build** (see below).

### 4. Build a development build (recommended for full features)

```bash
eas build --platform android --profile development
```

Install the `.apk` on your Android device, then:
```bash
pnpm start
```

### 5. Build for production / Play Store

```bash
eas build --platform android --profile preview
# or for full release:
eas build --platform android --profile production
```

---

## Features

| Screen | What it does |
|--------|-------------|
| **Login** | Email + password (Supabase Auth) |
| **Dashboard** | Today's bookings, takings, pending deposits, quick WhatsApp links |
| **Bookings list** | Filter by Today / Pending / Confirmed / All; pull-to-refresh |
| **Booking detail** | Full booking info, all actions (confirm, complete with cash/card, cancel, late cancel, no show), payment link generator, activity log |
| **Clients (CRM)** | Search all clients; avatar, loyalty balance, blocked badge |
| **Client profile** | Full profile, tags, loyalty history, notes, adjust points, block/unblock |
| **Accounting** | Today's takings, log expense (with category), pay myself |
| **Settings** | Admin account info, quick links to web admin, sign out |

---

## Architecture

- **Expo Router** — file-based navigation (same mental model as Next.js App Router)
- **Supabase** — same project as web; direct queries from the app use the anon key + RLS
- **Next.js API routes** — complex actions (complete booking, cancel, expense logging) go through the same API routes as the web admin
- **React Query** — data fetching, caching, pull-to-refresh
- **Zustand** — auth session state
- **expo-secure-store** — encrypted JWT storage

---

## Screens map

```
app/
  _layout.tsx            Root layout (auth listener, QueryClient)
  index.tsx              Auth redirect
  login.tsx              Email + password login
  (tabs)/
    _layout.tsx          Tab navigator
    index.tsx            Dashboard
    bookings/
      _layout.tsx
      index.tsx          Bookings list (filter tabs)
      [id].tsx           Booking detail + all actions
    crm/
      _layout.tsx
      index.tsx          Client list (search)
      [id].tsx           Client profile (notes, tags, loyalty, block)
    accounting.tsx       Log expense + pay myself
    settings.tsx         Account info + links + sign out
```

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `EXPO_PUBLIC_API_URL` | Base URL of the Next.js web app (for API calls) |
