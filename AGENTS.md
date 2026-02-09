# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Congruity is a Discord alternative focused on:
- **Native experience** via Tauri (minimize gaming performance impact)
- **Free to use** - join unlimited servers; pay only to host on cloud infrastructure (or self-host free)
- **Supabase-powered** - works for both cloud-hosted and self-hosted deployments

## MVP Scope

### Server (Self-hosted Docker image)
- Intuitive setup via script/GUI/TUI with good documentation
- Supabase backend (auth, database, realtime, storage)
- WebRTC signaling for voice/video

### Tauri Client
- Text channels and DMs
- Voice rooms and private calls  
- Screen share and webcam streaming
- Server browser and management

### Future: Cloud-hosted Servers
- Moderation tooling
- CDN for media/assets

## Development Commands

### Client (React + Vite + Tauri)
```bash
cd client
npm install
npm run dev          # Start Vite dev server (port 5173)
npm run test         # Run Vitest in watch mode
npm run test:run     # Run tests once
npm run tauri:dev    # Start Tauri desktop app (dev mode)
npm run tauri:build  # Build production Tauri app
npm run lint         # ESLint with Airbnb config
```

### Server (Signaling only)
```bash
cd server
npm install
npm start            # Start signaling server (port 3001)
```

### Self-Hosted Deployment
```bash
cd docker
./setup.sh           # Interactive setup script
docker compose up -d # Start all services
docker compose logs -f  # View logs
```

### Environment Variables
Client (`client/.env`):
- `VITE_SUPABASE_URL` - Supabase API URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SIGNALING_URL` - WebRTC signaling server URL

## Architecture

### Project Structure
```
congruity/
├── client/                 # Tauri + React app
│   ├── src-tauri/          # Tauri native shell (Rust)
│   ├── src/
│   │   ├── Components/     # React components
│   │   ├── hooks/          # Custom React hooks (useAuth, etc.)
│   │   ├── lib/            # Supabase client, utilities
│   │   └── test/           # Vitest setup
│   └── package.json
├── server/                 # WebRTC signaling server only
│   ├── Dockerfile
│   └── index.js
├── docker/                 # Self-hosted deployment
│   ├── docker-compose.yml  # Supabase + signaling
│   └── setup.sh            # Interactive setup
└── supabase/
    └── migrations/         # SQL schema + RLS policies
```

### Frontend (`client/`)
- **Tauri**: Native desktop shell in `src-tauri/` (Rust)
- **Entry point**: `src/main.jsx` - React Router with AuthProvider
- **Auth**: `src/hooks/useAuth.jsx` - Supabase auth hook with session management
- **Supabase client**: `src/lib/supabase.js`
- **Tests**: Vitest with React Testing Library

### Backend (Supabase + Signaling)
- **Database**: PostgreSQL via Supabase (schema in `supabase/migrations/`)
- **Auth**: Supabase Auth (email/password, OAuth)
- **Realtime**: Supabase Realtime for messages
- **Signaling**: Minimal Socket.IO server for WebRTC (port 3001)

### Data Model (Supabase)
Core tables: `profiles`, `servers`, `server_members`, `channels`, `messages`, `dm_channels`, `dm_messages`, `friendships`
- `profiles` extends Supabase `auth.users`
- Row Level Security (RLS) policies in `002_rls_policies.sql`
- Auto-creates profile on user signup via trigger

### Real-time Communication
- **Messages**: Supabase Realtime subscriptions
- **WebRTC Signaling**: Socket.IO (offer/answer/ICE candidates)
- **STUN**: Google STUN servers for NAT traversal
