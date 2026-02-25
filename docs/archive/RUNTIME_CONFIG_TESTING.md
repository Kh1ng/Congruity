# Runtime Configuration Testing Guide

## Overview
This guide covers manual testing of the client runtime configuration system implemented for alpha launch.

## Setup

### Prerequisites
- Vite dev server running: `cd client && npm run dev`
- Browser with DevTools access
- Test server code (generate one if needed)

### Generate Test Server Code

```bash
cd client
node scripts/generate-server-code.js \
  --name "Local Test Server" \
  --url "https://nwprbforlqxzwpkiiyrc.supabase.co" \
  --key "sb_publishable_EezFRukg3nqRdf44R1ifVw_2R2glfsO" \
  --signaling "ws://localhost:3001"
```

**Example Server Code:**
```
eyJhbGciOiJIUzI1-NiIsInR5cCI6IkpX-VCJ9.eyJuYW1lIjo-iTG9jYWwgVGVzdCB-TZXJ2ZXIiLCJ
zdXB-hYmFzZV91cmwiOiJ-odHRwczovL253cHJ-iZm9ybHF4endwa2l-peXJjLnN1cGFiYXN-lLmNvIi
wic3VwYWJ-hc2VfYW5vbl9rZXk-iOiJzYl9wdWJsaXN-oYWJsZV9FZXpGUnV-rZzNucVJkZjQ0UjF-pZ
lZ3XzJSMmdsZnN-PIiwic2lnbmFsaW5-nX3VybCI6IndzOi8-vbG9jYWxob3N0OjM-wMDEiLCJpYXQiO
jE-3NzE2MzYxOTgsImV-4cCI6MTgwMzE3MjE-5OH0.x1aK-Ob5xIv-0CnHqzIeq_SejORn-J8gSleuDz
1ikrMGE
```

## Test Scenarios

### 1. First Launch (Fresh State)

**Objective:** Verify wizard shows on first run

**Steps:**
1. Open browser DevTools (F12)
2. Navigate to Application → Local Storage → `http://localhost:5173` (or 5174)
3. Clear all localStorage entries
4. Navigate to `http://localhost:5173/` (or the port shown by Vite)
5. Observe ConfigWizard Welcome screen

**Expected Results:**
- ✅ Welcome screen displays with two options
- ✅ "I have a server code" button visible
- ✅ "Enter details manually" button visible
- ✅ No auth UI visible (wizard takes priority)

**Failure Modes:**
- ❌ Auth UI shows instead → Check `needsConfiguration()` logic in `App.jsx`
- ❌ Blank screen → Check browser console for errors
- ❌ Wizard doesn't render → Verify `ConfigWizard.jsx` import

---

### 2. Server Code Flow

**Objective:** Verify server code decoding and connection testing

**Steps:**
1. From Welcome screen, click "I have a server code"
2. Paste the test server code (see above)
3. Click "Connect"
4. Observe connection testing progress:
   - Stage 1: Supabase API test
   - Stage 2: Supabase Auth test (sign in anonymously)
   - Stage 3: Signaling server test (WebSocket)
5. Wait for completion (or failure)

**Expected Results (Success Path):**
- ✅ Server code decodes successfully (shows server name in UI)
- ✅ All 3 connection stages pass
- ✅ Configuration saved to localStorage
- ✅ Wizard closes and main app loads
- ✅ Check localStorage: `congruity_server_configs` and `congruity_active_config` exist

**Expected Results (Failure Path - Signaling Down):**
- ✅ Stages 1 & 2 pass
- ⚠️ Stage 3 fails (signaling server not running)
- ✅ Error message displays
- ✅ User can retry or go back

**Failure Modes:**
- ❌ JWT decode error → Check server code format (3 parts, base64url)
- ❌ Supabase API fails → Check Supabase URL/key validity
- ❌ Auth test hangs → Check network tab for stuck requests

---

### 3. Manual Configuration Flow

**Objective:** Verify manual entry form and validation

**Steps:**
1. Clear localStorage again (see Test 1)
2. Refresh page → Welcome screen
3. Click "Enter details manually"
4. Fill in form:
   - **Name:** "Manual Test Server"
   - **Supabase URL:** `https://nwprbforlqxzwpkiiyrc.supabase.co`
   - **Supabase Anon Key:** `sb_publishable_EezFRukg3nqRdf44R1ifVw_2R2glfsO`
   - **Signaling URL:** `ws://localhost:3001`
   - **Icon URL:** (leave blank)
5. Click "Test & Save"
6. Observe connection testing (same as Test 2)

**Expected Results:**
- ✅ Form fields accept input
- ✅ URL validation works (try invalid URLs)
- ✅ Required fields enforced (name, URL, key)
- ✅ Optional fields work (signaling, icon)
- ✅ Connection testing runs
- ✅ Configuration saves on success

**Validation Tests:**
- Invalid Supabase URL: `not a url` → Should show error
- Invalid signaling URL: `http://missing-protocol` → Should show error
- Empty name: → Should disable submit button
- Empty Supabase URL: → Should disable submit button

---

### 4. Configuration Persistence

**Objective:** Verify configurations survive app restarts

**Steps:**
1. Complete Test 2 or Test 3 (save a configuration)
2. Check localStorage:
   ```javascript
   JSON.parse(localStorage.getItem('congruity_server_configs'))
   localStorage.getItem('congruity_active_config')
   ```
3. Refresh the page (Ctrl+R / Cmd+R)
4. Observe app loads normally (no wizard)
5. Open DevTools Console:
   ```javascript
   import { ConfigManager } from './lib/serverConfig.ts';
   ConfigManager.getAllConfigs();
   ConfigManager.getActiveConfig();
   ```

**Expected Results:**
- ✅ localStorage contains config data
- ✅ Page refresh skips wizard
- ✅ App uses saved configuration
- ✅ `ConfigManager.getActiveConfig()` returns the saved config

**Failure Modes:**
- ❌ Wizard shows again → `needsConfiguration()` not reading localStorage correctly
- ❌ Config lost → localStorage cleared by browser (check incognito mode)

---

### 5. Environment Variable Migration

**Objective:** Verify auto-migration from .env to localStorage

**Prerequisites:**
- Ensure `client/.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Steps:**
1. Clear localStorage
2. Refresh page
3. Check console for migration log (if implemented)
4. Verify wizard does NOT show (auto-migrated)
5. Check localStorage for migrated config

**Expected Results:**
- ✅ No wizard shown (env vars detected)
- ✅ localStorage contains migrated config with name "Environment Config"
- ✅ App functions normally

**Testing Negative Case:**
1. Rename `client/.env` to `client/.env.backup`
2. Clear localStorage
3. Restart Vite dev server
4. Refresh page
5. Verify wizard DOES show (no env vars)

---

### 6. Multi-Server Management (ServerSettings Panel)

**Objective:** Verify switching, adding, deleting servers

**Prerequisites:**
- At least one server configured

**Steps:**
1. Access ServerSettings panel (needs UI integration - check AccountSettings or modal)
   - **Note:** As of implementation, ServerSettings exists but needs UI entry point
   - **Workaround:** Add test button to App.jsx or AccountSettings temporarily
2. View existing server configurations
3. Click "Add New Server"
4. Add a second server (use server code or manual)
5. Switch between servers:
   - Click "Switch Active" on the second server
   - Observe page reload
6. Delete a server:
   - Click "Delete" on non-active server
   - Confirm deletion
   - Verify localStorage updated

**Expected Results:**
- ✅ All saved configs displayed
- ✅ Active server shows badge
- ✅ Switching triggers `window.location.reload()`
- ✅ Deleted config removed from localStorage
- ✅ Cannot delete active server (or confirm warning)

**Current Status:**
⚠️ **ServerSettings component exists but no UI entry point yet**  
**Action Required:** Add ServerSettings to AccountSettings or create modal trigger

---

### 7. Backward Compatibility (Env Vars)

**Objective:** Verify existing deployments still work

**Prerequisites:**
- `client/.env` with valid Supabase credentials
- No localStorage config (clear it)

**Steps:**
1. Clear localStorage
2. Ensure `.env` has:
   ```
   VITE_SUPABASE_URL=https://nwprbforlqxzwpkiiyrc.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_EezFRukg3nqRdf44R1ifVw_2R2glfsO
   VITE_SIGNALING_URL=ws://localhost:3001
   ```
3. Restart Vite dev server
4. Navigate to app
5. Observe auto-migration or direct initialization

**Expected Results:**
- ✅ App initializes Supabase from env vars
- ✅ No wizard shows (env vars trigger migration)
- ✅ Supabase client works normally
- ✅ Auth flow functions

**Testing Production Build:**
```bash
cd client
npm run build
npm run preview
```
- Verify production build still reads env vars baked into the bundle

---

## Server Code Generator Testing

**Objective:** Verify server code generation script

**Steps:**
1. Generate with all parameters:
   ```bash
   node scripts/generate-server-code.js \
     --name "Test Server" \
     --url "https://test.supabase.co" \
     --key "eyJhbGciOiJIUzI1..." \
     --signaling "wss://signal.test.com" \
     --icon "https://test.com/icon.png"
   ```
2. Generate with env vars:
   ```bash
   export SUPABASE_URL=https://test.supabase.co
   export SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
   export SIGNALING_URL=wss://signal.test.com
   export SERVER_NAME="Env Test Server"
   node scripts/generate-server-code.js
   ```
3. Decode the generated JWT:
   ```javascript
   const jwt = require('jsonwebtoken');
   const code = 'eyJhbGci...'; // Your generated code
   const decoded = jwt.decode(code);
   console.log(decoded);
   ```

**Expected Results:**
- ✅ Valid JWT output with dashes (XXXX-XXXX-XXXX...)
- ✅ Decoded payload contains all fields
- ✅ Expiration set to 365 days from now
- ✅ Formatted output is user-friendly

---

## Known Issues & Workarounds

### Issue 1: ServerSettings No UI Entry Point
**Status:** Component implemented but not accessible  
**Workaround:** Temporarily add to `AccountSettings.jsx`:
```jsx
import ServerSettings from './ServerSettings';

// Inside AccountSettings component
<div className="mt-8">
  <ServerSettings />
</div>
```

### Issue 2: TypeScript Import.meta.env Error (VS Code)
**Status:** Type definition exists but VS Code cache may be stale  
**Workaround:** Reload VS Code window or restart TS server

### Issue 3: Signaling Server Connection Always Fails
**Status:** Expected if signaling server not running locally  
**Workaround:** Start signaling server:
```bash
cd server
npm install
npm start
```

---

## Checklist Summary

From `ALPHA_LAUNCH_CHECKLIST.md` → Day 1-2 Tasks:

- [x] Implement ConfigManager with localStorage
- [x] Refactor Supabase client for runtime init
- [x] Build ConfigWizard UI (6 screens)
- [x] Integrate wizard into App.jsx
- [x] Create ServerSettings panel
- [x] Build server code generator
- [ ] **Test full integration** ← **Current Step**
  - [ ] First launch shows wizard
  - [ ] Server code decodes correctly
  - [ ] Manual config saves successfully
  - [ ] Connection testing works (success path)
  - [ ] Configuration persists across restarts
  - [ ] Env var migration works
  - [ ] Multi-server switching works

---

## Next Steps After Testing

1. **Fix any bugs discovered**
2. **Add ServerSettings UI entry point** (Account Settings modal)
3. **Test production build** (`npm run build && npm run preview`)
4. **Move to Blocking Issue #2:** WebRTC JWT Authentication
5. **Build distributables** for macOS/Windows/Linux

---

## Test Results Log

**Date:** 2024-02-20  
**Tester:** (Your name)  
**Environment:** macOS / Vite Dev Server

| Test ID | Scenario | Status | Notes |
|---------|----------|--------|-------|
| 1       | First Launch | ⏳ Pending | |
| 2       | Server Code Flow | ⏳ Pending | |
| 3       | Manual Config | ⏳ Pending | |
| 4       | Persistence | ⏳ Pending | |
| 5       | Env Migration | ⏳ Pending | |
| 6       | Multi-Server | ⏳ Pending | Needs UI |
| 7       | Backward Compat | ⏳ Pending | |

**Legend:**
- ⏳ Pending
- ✅ Pass
- ❌ Fail
- ⚠️ Partial / Known Issue
