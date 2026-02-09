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

### Client (React + Vite)
```bash
cd client
npm install
npm run dev        # Start Vite dev server (port 5173)
npm run devh       # Start with --host flag for network access
npm run build      # Production build
npm run lint       # ESLint with Airbnb config
```

### Server (Express.js)
```bash
cd server
npm install
npm start          # Start with nodemon (ports 3000 + 3001)
```

### Database (Prisma + PostgreSQL)
```bash
cd server
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma client
npx prisma studio          # Database GUI
node seed.js               # Seed database
```

Required environment variables in `server/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT token signing

## Architecture

### Monorepo Structure
- `client/` - React frontend (primary implementation)
- `server/` - Express.js backend with WebSocket signaling
- `app/` - Alternative implementation using Supabase (experimental)

### Backend (`server/`)
- **Entry point**: `index.js` - Runs Express API on port 3000 and Socket.IO signaling server on port 3001
- **Routes**: `routes/` - REST endpoints for auth, servers, friends
- **Middleware**: `middleware/security.middleware.js` - JWT authentication via `authenticate` function
- **Database**: Prisma ORM with PostgreSQL; schema in `prisma/schema.prisma`

### Frontend (`client/`)
- **Entry point**: `src/main.jsx` - React Router setup with AuthProvider context
- **Components**: `src/Components/` - React components (Login, Home, VideoChat, Servers, etc.)
- **Services**: `src/Services/` - API client functions (note: some use Prisma directly which won't work in browser)
- **Auth**: `AuthContext.jsx` provides `userId` and `login` via React Context

### Data Model (Prisma)
Core entities: `User`, `Server`, `Channel`, `Message`, `Friendship`, `Call`
- Users belong to Servers via `ServerMembership`
- Users belong to Channels via `ChannelMembership`
- `Friendship` uses composite key `[senderId, receiverId]`

### Real-time Communication
- **Signaling**: Socket.IO server handles WebRTC signaling (offer/answer/ICE candidates)
- **Video chat**: `VideoChat.jsx` uses native WebRTC APIs with Google STUN server
- **API proxy**: Vite proxies `/api/*` requests to Express backend (see `vite.config.js`)

## Known Issues / Technical Debt
- `client/src/Services/messages.js` imports PrismaClient directly - this won't work in browser and should use fetch API
- `middleware/security.middleware.js` has hardcoded `"your_secret_key"` in `authMiddleware` (unused), while `authenticate` correctly uses `process.env.JWT_SECRET`
