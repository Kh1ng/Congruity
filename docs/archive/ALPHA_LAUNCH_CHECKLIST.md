# Alpha Launch Checklist

**Target Date**: ___________ (Fill in based on timeline choice)  
**Timeline**: [ ] 2-week limited alpha | [ ] 4-6 week public alpha

---

## Week 1: Implementation (18h)

### Day 1-2: Client Runtime Configuration (12h)
**Reference**: [CLIENT_RUNTIME_CONFIG_DESIGN.md](CLIENT_RUNTIME_CONFIG_DESIGN.md)

#### Phase 1: Add Configuration System
- [ ] Create `client/src/lib/serverConfig.ts`
  - [ ] `ServerConfig` interface
  - [ ] `ConfigManager` class with localStorage methods
  - [ ] `saveConfig()`, `getAllConfigs()`, `getActiveConfig()`
  - [ ] `setActiveConfig()`, `deleteConfig()`, `needsConfiguration()`
- [ ] Create `client/src/lib/utils.ts` (if not exists)
  - [ ] `generateUUID()` function
- [ ] Test ConfigManager in isolation
  - [ ] Can save config
  - [ ] Can retrieve config
  - [ ] Can delete config
  - [ ] Persists across refreshes

#### Phase 2: Update Supabase Client
- [ ] Refactor `client/src/lib/supabase.ts` (or `.js`)
  - [ ] Convert to TypeScript if needed
  - [ ] Add `initializeSupabase(config?)` function
  - [ ] Add `getSupabase()` function
  - [ ] Keep backward compatibility with env vars
- [ ] Update all imports to use `getSupabase()` instead of direct `supabase`
- [ ] Test Supabase initialization
  - [ ] Works with runtime config
  - [ ] Falls back to env vars
  - [ ] Throws error if no config

#### Phase 3: Build ConfigWizard Component
- [ ] Create `client/src/Components/ConfigWizard.tsx`
  - [ ] Welcome screen
  - [ ] Method selection (server code vs manual)
  - [ ] Server code input screen
  - [ ] Manual configuration form
  - [ ] Connection testing screen
  - [ ] Success screen
- [ ] Implement server code decoder
  - [ ] JWT decode (without verification)
  - [ ] Error handling for invalid codes
- [ ] Implement connection testing
  - [ ] Test Supabase API reachability
  - [ ] Test Supabase authentication
  - [ ] Test signaling server health endpoint
  - [ ] Display progress to user
- [ ] Style with Tailwind (match existing app design)
- [ ] Test wizard flow
  - [ ] Server code path
  - [ ] Manual config path
  - [ ] Error states
  - [ ] Success path

#### Phase 4: Integrate into App
- [ ] Update `client/src/main.tsx` or `App.tsx`
  - [ ] Check `ConfigManager.needsConfiguration()` on mount
  - [ ] Show `<ConfigWizard>` if no config
  - [ ] Show normal app if configured
- [ ] Update `client/src/hooks/useWebRTC.jsx`
  - [ ] Use `ConfigManager.getActiveConfig().signalingUrl`
  - [ ] Fall back to env var for backward compatibility
- [ ] Test full integration
  - [ ] First launch shows wizard
  - [ ] Configuration persists
  - [ ] App works after configuration
  - [ ] Can switch between servers (next phase)

#### Phase 5: Server Settings Panel
- [ ] Create `client/src/Components/ServerSettings.tsx`
  - [ ] List all saved server configs
  - [ ] Show active server
  - [ ] Switch server button
  - [ ] Delete server button
  - [ ] Add new server button (opens wizard)
- [ ] Add to AccountSettings or similar
- [ ] Test server switching
  - [ ] Can add multiple servers
  - [ ] Can switch between servers
  - [ ] Can delete servers
  - [ ] Active server persists

#### Phase 6: Server Code Generation
- [ ] Create `scripts/generate-server-code.ts`
  - [ ] Install `jsonwebtoken` dependency
  - [ ] Implement JWT signing
  - [ ] Format with dashes (XXXX-XXXX-XXXX-XXXX)
- [ ] Update `docker/setup.sh`
  - [ ] Auto-generate server code at end
  - [ ] Display in terminal
  - [ ] Save to file (e.g., `SERVER_CODE.txt`)
- [ ] Test code generation
  - [ ] Code decodes correctly in client
  - [ ] Auto-configuration works

---

### Day 3: WebRTC JWT Authentication (4h)
**Reference**: [ALPHA_READINESS_REVIEW.md](ALPHA_READINESS_REVIEW.md) - Security section

#### Server-Side (Signaling)
- [ ] Install `jsonwebtoken` in `server/`
  - [ ] `cd server && npm install jsonwebtoken`
- [ ] Update `server/index.js`
  - [ ] Import JWT library
  - [ ] Add middleware to verify JWT on socket connection
  - [ ] Extract user ID from JWT
  - [ ] Reject unauthorized connections
- [ ] Add JWT signing endpoint (or use Supabase session token)
  - [ ] Option A: Supabase session token (recommended)
  - [ ] Option B: Custom endpoint in signaling server
- [ ] Test signaling auth
  - [ ] Authorized connection succeeds
  - [ ] Unauthorized connection fails

#### Client-Side
- [ ] Update `client/src/hooks/useWebRTC.jsx`
  - [ ] Get Supabase session token
  - [ ] Send token in Socket.IO auth payload
  - [ ] Handle auth errors
- [ ] Test WebRTC with auth
  - [ ] Can connect with valid session
  - [ ] Cannot connect without session
  - [ ] Cannot connect with invalid session

---

### Day 4: Build Distributables (2h)
**Reference**: [../ALPHA_CLIENT_BUILD_GUIDE.md](../ALPHA_CLIENT_BUILD_GUIDE.md)

#### Pre-Build Setup
- [ ] Configure `client/.env` with **PRODUCTION** values
  - [ ] `VITE_SUPABASE_URL` (production Supabase)
  - [ ] `VITE_SUPABASE_ANON_KEY` (production key)
  - [ ] `VITE_SIGNALING_URL` (WSS with Cloudflare Tunnel or public IP)
- [ ] Update version in `client/src-tauri/tauri.conf.json`
  - [ ] Set to `0.1.0-alpha.1`
- [ ] Test client connects to production backend
  - [ ] Run `npm run dev`
  - [ ] Create account
  - [ ] Send message
  - [ ] Join voice channel

#### macOS Build
- [ ] Ensure Rust and Xcode CLI tools installed
- [ ] Run `npm run tauri:build -- --target universal-apple-darwin`
- [ ] Locate DMG: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/`
- [ ] Test on macOS
  - [ ] Install on Intel Mac (if available)
  - [ ] Install on Apple Silicon Mac
  - [ ] App opens and connects

#### Windows Build (if Windows available)
- [ ] Ensure Rust and VS Build Tools installed
- [ ] Run `npm run tauri:build`
- [ ] Locate MSI: `src-tauri/target/release/bundle/msi/`
- [ ] Test on Windows
  - [ ] Install MSI
  - [ ] Accept SmartScreen warning
  - [ ] App opens and connects

#### Linux Build
- [ ] Ensure build dependencies installed (see guide)
- [ ] Run `npm run tauri:build`
- [ ] Locate builds:
  - [ ] AppImage: `src-tauri/target/release/bundle/appimage/`
  - [ ] DEB: `src-tauri/target/release/bundle/deb/`
- [ ] Test on Linux
  - [ ] Make AppImage executable: `chmod +x *.AppImage`
  - [ ] Run AppImage
  - [ ] App opens and connects

#### Build Artifacts
- [ ] Rename builds with version:
  - [ ] `Congruity-0.1.0-alpha.1-macOS.dmg`
  - [ ] `Congruity-0.1.0-alpha.1-Windows.msi`
  - [ ] `Congruity-0.1.0-alpha.1-Linux.AppImage`
- [ ] Calculate checksums (SHA256)
  - [ ] `shasum -a 256 Congruity-*.dmg > checksums.txt`
  - [ ] `shasum -a 256 Congruity-*.msi >> checksums.txt`
  - [ ] `shasum -a 256 Congruity-*.AppImage >> checksums.txt`

---

### Day 5: Internal Testing (8h)

#### Manual Testing (All Platforms)
- [ ] **macOS**
  - [ ] Install from DMG
  - [ ] First launch shows config wizard
  - [ ] Enter server code (or manual config)
  - [ ] Create account
  - [ ] Create server
  - [ ] Send text message
  - [ ] Join voice channel
  - [ ] Screen share works
  - [ ] Upload file
  - [ ] Send DM
  - [ ] Add friend
- [ ] **Windows**
  - [ ] Same as macOS tests
- [ ] **Linux**
  - [ ] Same as macOS tests

#### Network Testing
- [ ] Same network (LAN)
  - [ ] Voice call between two clients
  - [ ] Screen share
- [ ] Different networks (WAN)
  - [ ] Voice call works
  - [ ] Check Cloudflare Tunnel routing
- [ ] Behind NAT/firewall
  - [ ] STUN traversal works
  - [ ] (If fails, note need for TURN server)

#### Performance Testing
- [ ] Message latency
  - [ ] Local: <2 seconds
  - [ ] Remote: <5 seconds
- [ ] Voice quality
  - [ ] No audio dropouts
  - [ ] Latency <500ms
- [ ] Memory usage
  - [ ] Idle: <200MB
  - [ ] Active voice: <500MB
- [ ] CPU usage
  - [ ] Idle: <5%
  - [ ] Screen share: <20%

#### Bug Tracking
- [ ] Create GitHub Issues project for alpha bugs
- [ ] Document all bugs found
- [ ] Fix critical bugs before distribution
- [ ] Document known issues for testers

---

## Week 2: Launch Limited Alpha

### Day 1-2: Tester Materials (4h)

#### Onboarding Guide
- [ ] Create `docs/ALPHA_TESTER_ONBOARDING.md`
  - [ ] Installation instructions (per platform)
  - [ ] Server code entry
  - [ ] What to test
  - [ ] How to report bugs
  - [ ] Known issues
- [ ] Create GitHub issue templates
  - [ ] Bug report template
  - [ ] Feature request template

#### Distribution Setup
- [ ] Choose distribution method:
  - [ ] [ ] GitHub Releases (recommended)
  - [ ] [ ] Google Drive
  - [ ] [ ] AWS S3 with presigned URLs
  - [ ] [ ] Self-hosted (nginx)
- [ ] Upload builds
  - [ ] macOS DMG
  - [ ] Windows MSI
  - [ ] Linux AppImage
  - [ ] Checksums file
- [ ] Test download links
- [ ] Create `CHANGELOG.md` with alpha.1 notes

#### Server Code Distribution
- [ ] Generate server code via `docker/setup.sh` output
- [ ] Test decoding in client
- [ ] Include in tester onboarding email

---

### Day 3: Feedback Channels (4h)

#### GitHub Issues
- [ ] Set up labels
  - [ ] `bug` (critical, high, medium, low)
  - [ ] `feature-request`
  - [ ] `alpha-feedback`
  - [ ] `help-wanted`
- [ ] Create pinned issue for alpha feedback
- [ ] Link issue tracker in onboarding

#### Discord/Slack (Optional)
- [ ] Create private Discord server or Slack workspace
- [ ] Channels:
  - [ ] `#alpha-announcements` (read-only)
  - [ ] `#alpha-bugs` (bug reports)
  - [ ] `#alpha-feedback` (general feedback)
  - [ ] `#alpha-help` (support)
- [ ] Invite bot for notifications (GitHub integration)
- [ ] Create invite link (limited to alpha testers)

#### Email
- [ ] Set up support email (e.g., alpha-support@yourdomain.com)
- [ ] Create auto-response with links to docs and issue tracker
- [ ] Monitor daily

#### Error Tracking (Optional)
- [ ] [ ] Set up Sentry project
- [ ] [ ] Add Sentry SDK to client
- [ ] [ ] Configure DSN in `.env`
- [ ] [ ] Test error reporting
- [ ] [ ] Monitor Sentry dashboard

---

### Day 4: Invite Testers (1h)

#### Tester Selection
- [ ] Identify 5-10 trusted testers
  - [ ] Technical users (can handle bugs)
  - [ ] Mix of platforms (macOS, Windows, Linux)
  - [ ] Willing to provide feedback
- [ ] Create spreadsheet to track:
  - [ ] Tester name
  - [ ] Email
  - [ ] Platform
  - [ ] Invitation date
  - [ ] First connection date
  - [ ] Bugs reported

#### Invitation Email Template
```
Subject: Congruity Alpha Testing Invitation

Hi [Name],

You're invited to test Congruity, a privacy-focused Discord alternative!

**What is Congruity?**
- Self-hosted chat (text, voice, video, screen share)
- Powered by Supabase + WebRTC
- Native desktop apps (Tauri)

**Your Role:**
- Install and use the app
- Report bugs and provide feedback
- Help shape the product!

**Getting Started:**
1. Download for your platform: [LINK]
2. Follow the onboarding guide: [LINK]
3. Server code: XXXX-XXXX-XXXX-XXXX
4. Report bugs: [LINK]
5. Have questions? Email: alpha-support@yourdomain.com

**Known Issues:**
- See docs/ALPHA_READINESS_REVIEW.md#known-issues

Thanks for being an early tester! 🎉

—Your Name
```

- [ ] Send invitation emails
- [ ] Share download links
- [ ] Provide server code
- [ ] Monitor for responses

---

### Day 5: Monitor & Iterate (Ongoing)

#### Daily Tasks
- [ ] Check GitHub Issues
  - [ ] Respond to new issues within 24h
  - [ ] Triage bugs (critical vs non-critical)
  - [ ] Close duplicates
- [ ] Check Discord/Slack (if using)
  - [ ] Respond to questions
  - [ ] Acknowledge feedback
- [ ] Check email
  - [ ] Support requests
  - [ ] Bug reports
- [ ] Monitor Sentry (if using)
  - [ ] Check for new errors
  - [ ] Investigate crashes

#### Weekly Tasks
- [ ] Collect feedback summary
  - [ ] Most requested features
  - [ ] Most reported bugs
  - [ ] Common pain points
- [ ] Prioritize fixes for alpha.2
- [ ] Update `CHANGELOG.md`
- [ ] Build and release alpha.2 if needed:
  - [ ] Fix critical bugs
  - [ ] Bump version (e.g., `0.1.0-alpha.2`)
  - [ ] Build distributables
  - [ ] Upload to distribution platform
  - [ ] Notify testers

#### Success Metrics
- [ ] Track metrics (document results in `ALPHA_RELEASE.md` or a dated test report):
  - [ ] % testers who successfully install
  - [ ] % testers who create/join server
  - [ ] % testers who send messages
  - [ ] % testers who use voice/video
  - [ ] Crash rate (<5%)
  - [ ] Message latency (<5s WAN)
  - [ ] WebRTC connection success (>95%)

---

## Weeks 3-6: Expand to Public Alpha (Optional)

### If Going to Full Public Alpha

#### Additional Implementation
- [ ] Increase test coverage to 70%
  - [ ] Unit tests for critical hooks
  - [ ] Integration tests for auth flow
  - [ ] WebRTC tests (where feasible)
- [ ] Add in-app update mechanism
  - [ ] Tauri updater plugin
  - [ ] Update server/endpoint
  - [ ] Test update flow
- [ ] Profile pictures
  - [ ] Upload to MinIO/Supabase Storage
  - [ ] Display in UI
  - [ ] Update avatar components

#### Polish
- [ ] UI/UX improvements based on feedback
  - [ ] Fix confusing flows
  - [ ] Improve error messages
  - [ ] Add missing features per feedback
- [ ] Performance optimizations
  - [ ] Reduce bundle size
  - [ ] Optimize re-renders
  - [ ] Lazy load components
- [ ] Accessibility
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] High contrast mode

#### Expand Tester Pool
- [ ] Invite 20-30 more testers (total 30-40)
- [ ] Monitor server load
- [ ] Iterate on feedback
- [ ] Prepare for beta

---

## Pre-Launch Checklist (Run This Before Sending Invites)

### Infrastructure
- [ ] Production Supabase project created
- [ ] Signaling server running and accessible via HTTPS/WSS
- [ ] MinIO storage running and accessible
- [ ] Cloudflare Tunnel configured (or other external access)
- [ ] DNS records configured (if using custom domain)
- [ ] Database migrations applied
- [ ] Test account created and verified

### Client
- [ ] Runtime configuration implemented and tested
- [ ] WebRTC JWT authentication working
- [ ] macOS build tested (Intel + Apple Silicon)
- [ ] Windows build tested
- [ ] Linux build tested
- [ ] All builds connect to production backend
- [ ] Voice/video tested on all platforms

### Documentation
- [ ] Alpha readiness review complete
- [ ] Build guide complete
- [ ] Tester onboarding guide created
- [ ] Known issues documented
- [ ] FAQ created (at minimum, answers in onboarding doc)
- [ ] Changelog created with alpha.1 notes

### Distribution
- [ ] Builds uploaded to distribution platform
- [ ] Download links tested
- [ ] Checksums verified
- [ ] Server code generated and tested

### Support
- [ ] GitHub Issues project created with labels
- [ ] Discord/Slack/email support channel ready
- [ ] Error monitoring (Sentry) configured (optional)
- [ ] Support email auto-responder set up

---

## Post-Alpha Review (After 2-4 Weeks)

### Feedback Analysis
- [ ] Compile bug reports
  - [ ] Critical bugs (blockers)
  - [ ] High priority bugs
  - [ ] Nice-to-fix bugs
- [ ] Compile feature requests
  - [ ] Most requested (implement for beta)
  - [ ] Nice-to-have (backlog)
  - [ ] Out of scope
- [ ] Usability issues
  - [ ] Confusing UI/UX
  - [ ] Missing onboarding steps
  - [ ] Documentation gaps

### Metrics Review
- [ ] Installation success rate: ____%
- [ ] Server creation success rate: ____%
- [ ] Message sending success rate: ____%
- [ ] Voice/video usage rate: ____%
- [ ] Crash rate: ____%
- [ ] Average session length: _____ minutes
- [ ] NPS score (Net Promoter Score): _____

### Decision: Next Steps
- [ ] [ ] Iterate and continue alpha (if major issues found)
- [ ] [ ] Graduate to beta (if alpha successful)
- [ ] [ ] Pivot/redesign (if fundamental issues)

---

## Notes / Blockers

Use this space to track blockers, decisions, and notes during alpha preparation:

```
[Date] - [Issue/Decision]
2025-02-15 - Started alpha prep, created all documentation
2025-02-16 - Implemented client runtime config
...
```

---

**Status**: Use this checklist to track progress. Check off items as completed. Update notes section with any blockers or decisions made during implementation.

**Questions?** See the referenced documentation for details on each task.
