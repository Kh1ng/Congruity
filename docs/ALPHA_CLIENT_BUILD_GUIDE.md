# Congruity Alpha Client Build & Distribution Guide

This guide covers building and distributing the Congruity client for alpha testing. Since the client currently requires build-time configuration (see [archive/ALPHA_READINESS_REVIEW.md](archive/ALPHA_READINESS_REVIEW.md) for the historical runtime-config discussion), you'll need to provide testers with a pre-configured build.

## Table of Contents

- [Overview](#overview)
- [Pre-Build Setup](#pre-build-setup)
- [Building for Different Platforms](#building-for-different-platforms)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [iOS (Future)](#ios-future)
  - [Android (Future)](#android-future)
- [Web Version (Development Server)](#web-version-development-server)
- [Distribution Strategies](#distribution-strategies)
- [Alpha Testing Best Practices](#alpha-testing-best-practices)
- [Known Limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Current Architecture
- **Frontend**: React + Vite
- **Desktop Shell**: Tauri (Rust)
- **Configuration**: Environment variables at build time
- **Backends**: Supabase (auth, database, realtime) + WebRTC signaling

### Build Outputs
- **macOS**: `.dmg` installer (Intel and Apple Silicon)
- **Windows**: `.msi` installer
- **Linux**: `.AppImage`, `.deb`, `.rpm`
- **Web**: Static files (for browser access)

---

## Pre-Build Setup

### 1. Prepare Your Backend Infrastructure

Before building the client, ensure you have:

```bash
# Cloud-hosted option (recommended for alpha)
✓ Supabase project created at https://supabase.com
✓ Self-hosted signaling + MinIO setup (see docker/setup.sh)
✓ Cloudflare Tunnels configured for external access (optional but recommended)

# OR fully self-hosted option
✓ Complete local Supabase stack + signaling + MinIO
✓ Public IP or Cloudflare Tunnels for external access
```

### 2. Gather Configuration Values

You'll need these values from your backend:

```env
# From Supabase Dashboard (Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# From your self-hosted signaling server
VITE_SIGNALING_URL=wss://signal.yourdomain.com
# OR for local testing
VITE_SIGNALING_URL=ws://localhost:3001
```

**Important**: For alpha testing, use HTTPS/WSS URLs (not HTTP/WS) so the client works from anywhere.

### 3. Configure the Client

```bash
cd client
cp .env.example .env
```

Edit `.env` with your backend URLs:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# WebRTC Signaling Server
VITE_SIGNALING_URL=wss://signal.yourdomain.com

# Optional: Sentry error tracking for alpha testing
VITE_SENTRY_DSN=https://your-sentry-dsn
```

---

## Building for Different Platforms

### macOS

#### Prerequisites
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js (via Homebrew)
brew install node
```

#### Build Steps

```bash
cd client

# Install dependencies
npm install

# Build for macOS (creates .dmg)
npm run tauri:build

# Output locations:
# - Universal (Intel + Apple Silicon): src-tauri/target/universal-apple-darwin/release/bundle/dmg/
# - Intel only: src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/
# - Apple Silicon only: src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
```

**Universal Binary (Recommended)**:
```bash
# Build for both architectures
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

npm run tauri:build -- --target universal-apple-darwin
```

#### Code Signing (Optional for Alpha)

For a private alpha, code signing is not required. Users will need to:
1. Right-click the app
2. Select "Open"
3. Accept the security warning

For a public alpha or beta:
```bash
# You'll need an Apple Developer account ($99/year)
# Set up in src-tauri/tauri.conf.json:
{
  "tauri": {
    "bundle": {
      "macOS": {
        "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)"
      }
    }
  }
}
```

---

### Windows

#### Prerequisites
```bash
# Install Rust
# Download from: https://rustup.rs/

# Install Node.js
# Download from: https://nodejs.org/

# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++"
```

#### Build Steps

```bash
cd client

# Install dependencies
npm install

# Build for Windows (creates .msi and .exe)
npm run tauri:build

# Output location: src-tauri/target/release/bundle/msi/
```

#### Code Signing (Optional for Alpha)

For a private alpha, users will see a SmartScreen warning. They can:
1. Click "More info"
2. Click "Run anyway"

For production:
- Obtain a code signing certificate (e.g., DigiCert, Sectigo)
- Configure in `tauri.conf.json`

---

### Linux

#### Prerequisites (Debian/Ubuntu)
```bash
# Install build dependencies
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Build Steps

```bash
cd client

# Install dependencies
npm install

# Build for Linux (creates .deb, .AppImage, .rpm)
npm run tauri:build

# Output location: src-tauri/target/release/bundle/
# - Debian package: deb/
# - AppImage: appimage/
# - RPM: rpm/
```

**AppImage** is recommended for broad compatibility across distros.

---

### iOS (Future)

Tauri supports iOS in beta. To prepare:

```bash
# Install dependencies (macOS only)
brew install cocoapods

# Add iOS targets
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios

# Initialize iOS project
cd client/src-tauri
cargo tauri ios init
```

**Status**: Not recommended for current alpha. Wait for Tauri's iOS support to stabilize.

---

### Android (Future)

Tauri supports Android in beta. To prepare:

```bash
# Install Android SDK and NDK
# Follow: https://tauri.app/v1/guides/building/android

# Add Android targets
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android

# Initialize Android project
cd client/src-tauri
cargo tauri android init
```

**Status**: Not recommended for current alpha. Wait for Tauri's Android support to stabilize.

---

## Web Version (Development Server)

For testers who can't install native apps, you can run a web version:

### Option 1: Vite Development Server (Local Testing)

```bash
cd client
npm install
npm run dev

# Accessible at http://localhost:5173
```

**Limitations**:
- No desktop notifications
- No system tray integration
- Must keep browser tab open

### Option 2: Static Build (Deploy to Vercel/Netlify)

```bash
cd client
npm install
npm run build

# Output: dist/
# Deploy to any static host:
# - Vercel: vercel deploy
# - Netlify: netlify deploy
# - GitHub Pages: gh-pages -d dist
```

**Important**: Configure environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment

---

## Distribution Strategies

### Strategy 1: Private Alpha (Recommended)

**Best for**: 5-20 testers, direct communication

1. Build platform-specific installers
2. Upload to private file host:
   - **Google Drive** (simple, works for small files)
   - **Dropbox** (automatic versioning)
   - **AWS S3** with presigned URLs
   - **Self-hosted** (nginx with basic auth)

3. Share links directly with testers

**Pros**:
- Simple and fast
- No app store approval needed
- Easy to iterate

**Cons**:
- Manual distribution
- No automatic updates
- Testers must trust unsigned binaries

### Strategy 2: GitHub Releases (Semi-Public)

**Best for**: 20-100 testers, version tracking

```bash
# Tag a release
git tag -a v0.1.0-alpha.1 -m "Alpha release 1"
git push origin v0.1.0-alpha.1

# Create GitHub Release
# 1. Go to repository → Releases → Draft new release
# 2. Select the tag
# 3. Upload build artifacts:
#    - Congruity_0.1.0_x64.dmg
#    - Congruity_0.1.0_x64.msi
#    - Congruity_0.1.0_amd64.AppImage
# 4. Mark as "pre-release"
# 5. Publish
```

**Pros**:
- Version tracking built-in
- Easy changelog management
- URL stability

**Cons**:
- Publicly visible (unless using private repo)
- Still requires manual updates

### Strategy 3: App Stores (Public Beta)

**Not recommended for initial alpha**. Use Strategy 1 or 2 first, then consider:
- **macOS**: TestFlight (requires Apple Developer account)
- **Windows**: Microsoft Store (requires Developer account)
- **Linux**: Flathub, Snap Store

---

## Alpha Testing Best Practices

### 1. Version Numbering

Use semantic versioning with alpha tag:
```
v0.1.0-alpha.1
v0.1.0-alpha.2
v0.1.1-alpha.1
```

Update in `client/src-tauri/tauri.conf.json`:
```json
{
  "package": {
    "productName": "Congruity",
    "version": "0.1.0-alpha.1"
  }
}
```

### 2. Changelog

Create `docs/CHANGELOG.md` and update with each release:

```markdown
# Changelog

## [0.1.0-alpha.2] - 2025-02-15

### Added
- Screen sharing in voice channels
- Friend requests

### Fixed
- Message timestamps incorrect in DMs
- Voice quality issues on macOS

### Known Issues
- Random disconnections on Windows (#42)
```

### 3. Feedback Collection

Set up channels for feedback:
- **Discord/Slack**: Private channel for testers
- **GitHub Issues**: Bug reports with template
- **Google Forms**: Structured feedback surveys
- **Sentry/LogRocket**: Automatic error tracking

### 4. Tester Onboarding

Create a simple onboarding document:

```markdown
# Congruity Alpha Testing Guide

## Installation

### macOS
1. Download `Congruity.dmg`
2. Open the DMG
3. Drag Congruity to Applications
4. Right-click → Open (first time only)

### Windows
1. Download `Congruity.msi`
2. Run installer
3. Click "More info" → "Run anyway" if SmartScreen appears

### Linux
1. Download `Congruity.AppImage`
2. Make executable: `chmod +x Congruity-*.AppImage`
3. Run: `./Congruity-*.AppImage`

## What We're Testing
- Text messaging and DMs
- Voice channels and private calls
- Screen sharing
- Server management

## What to Report
✓ Crashes and errors
✓ Performance issues
✓ Confusing UI/UX
✓ Missing features you expected

## Where to Report
- Bugs: https://github.com/your-repo/issues/new
- Feedback: #alpha-feedback on Discord
```

### 5. Critical Information Sheet

Provide testers with:

```markdown
# Congruity Alpha - Critical Info

**Server URL**: https://your-project.supabase.co
**Support**: support@yourdomain.com or #alpha-help on Discord
**Known Issues**: See docs/CHANGELOG.md

## Emergency Contacts
- Can't log in: Email support@yourdomain.com
- Crash on startup: Attach logs from:
  - macOS: ~/Library/Logs/Congruity/
  - Windows: %APPDATA%\Congruity\logs\
  - Linux: ~/.local/share/congruity/logs/

## Data Privacy
This is a testing environment:
- Don't share sensitive information
- Expect occasional database resets
- Enable 2FA on your account
```

---

## Known Limitations

### Critical (Blockers for Alpha - see [archive/ALPHA_READINESS_REVIEW.md](archive/ALPHA_READINESS_REVIEW.md))

1. **No Runtime Configuration**
   - Server URL hardcoded at build time
   - Can't switch servers without rebuilding
   - **Workaround**: Pre-configure builds for testers
   - **Fix Required**: First-run configuration wizard

2. **WebRTC Signaling Lacks Auth**
   - Anyone can connect to signaling server
   - **Risk**: Moderate (DoS possible)
   - **Workaround**: Firewall signaling server, only give URL to testers
   - **Fix Required**: JWT-based authentication

### Known Issues (Non-Blocking)

3. **Low Test Coverage** (30%)
   - Bugs may slip through
   - **Mitigation**: Thorough manual testing per release

4. **No In-App Updates**
   - Testers must manually download new versions
   - **Mitigation**: Email/Discord notifications for updates

5. **Profile Pictures Not Implemented**
   - Avatar initials only
   - **Status**: Nice-to-have for alpha

---

## Troubleshooting

### Build Failures

#### macOS: "xcrun: error: unable to find utility ld"
```bash
sudo xcode-select --reset
sudo xcode-select --install
```

#### Windows: "linker `link.exe` not found"
Install Visual Studio Build Tools with "Desktop development with C++"

#### Linux: "webkit2gtk not found"
```bash
sudo apt install libwebkit2gtk-4.0-dev
```

### Runtime Issues

#### "Failed to connect to Supabase"
- Check `VITE_SUPABASE_URL` in `.env`
- Verify Supabase project is running
- Test in browser: `curl https://your-project.supabase.co/rest/v1/`

#### "WebRTC connection failed"
- Check `VITE_SIGNALING_URL` in `.env`
- Verify signaling server is running
- Test: `curl http://your-signaling-url/health`

#### "App won't open on macOS"
```bash
# If quarantine flag is set
xattr -d com.apple.quarantine /Applications/Congruity.app
```

#### "SmartScreen blocks app on Windows"
This is expected for unsigned apps. Testers should:
1. Click "More info"
2. Click "Run anyway"

---

## Checklist: Pre-Alpha Release

Before distributing to testers:

### Infrastructure
- [ ] Supabase project configured and accessible
- [ ] Signaling server running and accessible externally
- [ ] MinIO storage configured and tested
- [ ] Cloudflare Tunnels set up (if using)
- [ ] Database migrations applied
- [ ] Test account created and verified

### Client Configuration
- [ ] `.env` file configured with production URLs
- [ ] `VITE_SIGNALING_URL` uses WSS (not WS) for external access
- [ ] Version number updated in `tauri.conf.json`
- [ ] Changelog updated

### Builds
- [ ] macOS build tested (both Intel and Apple Silicon if possible)
- [ ] Windows build tested
- [ ] Linux build tested (at least one format)
- [ ] All builds open and connect to backend
- [ ] Voice/video tested on each platform

### Documentation
- [ ] Tester onboarding guide created
- [ ] Known issues documented
- [ ] Feedback channels set up
- [ ] Emergency contact info provided

### Testing
- [ ] Can create account
- [ ] Can create server
- [ ] Can send messages
- [ ] Can join voice channel
- [ ] Can send DMs
- [ ] Can add friends
- [ ] Can upload files

### Distribution
- [ ] Builds uploaded to distribution platform
- [ ] Download links tested
- [ ] Tester invitations sent
- [ ] Feedback form/channel ready

---

## Next Steps After Alpha Build

Once you've built and distributed the alpha:

1. **Monitor Feedback**
   - Check bug reports daily
   - Respond to tester questions promptly
   - Track common issues

2. **Iterate Quickly**
   - Release bug fixes as `v0.1.0-alpha.2`, `alpha.3`, etc.
   - Aim for 1-2 releases per week during active testing

3. **Prepare for Beta**
   - Implement runtime configuration wizard (see `docs/archive/ALPHA_READINESS_REVIEW.md`)
   - Add WebRTC JWT authentication
   - Improve test coverage to >70%
   - Add in-app update mechanism

4. **Scale Testing**
   - Invite more testers in waves (10 → 25 → 50)
   - Monitor server load and performance
   - Iterate on infrastructure as needed

---

## Resources

- **Tauri Documentation**: https://tauri.app/v1/guides/
- **Supabase Self-Hosting**: https://supabase.com/docs/guides/self-hosting
- **WebRTC Debugging**: chrome://webrtc-internals
- **Congruity Docs**:
  - [Alpha Readiness Review](archive/ALPHA_READINESS_REVIEW.md)
  - [Security Audit](ALPHA_SECURITY_AUDIT.md)
  - [Self-Hosting Guide](SELF_HOSTING_GUIDE.md)

---

**Questions?** Open an issue or contact the team.

**Happy alpha testing! 🚀**
