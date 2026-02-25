# Client First-Run Configuration Wizard

**Status**: 🔴 **BLOCKING ISSUE FOR ALPHA** - See [ALPHA_READINESS_REVIEW.md](ALPHA_READINESS_REVIEW.md)

**Priority**: HIGH - Required before public alpha distribution

**Estimated Implementation**: 4-6 hours

---

## Problem Statement

Currently, the Congruity client requires **build-time configuration** of server URLs (Supabase, Signaling). This means:

❌ Users can't point the client at different servers  
❌ Distribution requires pre-configured builds  
❌ Testing multiple servers requires multiple builds  
❌ Can't switch between self-hosted and cloud deployments

## Solution Overview

Implement a **first-run configuration wizard** that:

✅ Runs on first launch (no config detected)  
✅ Prompts for server connection details  
✅ Validates URLs and connectivity  
✅ Saves configuration to localStorage  
✅ Allows reconfiguration from settings  
✅ Supports "connect to Congruity Cloud" quick option (future)  

---

## User Experience

### First Launch Flow

```
┌────────────────────────────────────────┐
│  Welcome to Congruity!                 │
│                                        │
│  Before you start, let's connect to    │
│  a server.                             │
│                                        │
│  [Connect to a Server]                 │
│                                        │
│  Advanced: [Manual Configuration]      │
└────────────────────────────────────────┘
```

#### Option 1: Server Code (Recommended for Alpha)

```
┌────────────────────────────────────────┐
│  Enter Server Code                     │
│                                        │
│  Your server admin will provide a      │
│  code that automatically configures    │
│  your connection.                      │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ XXXX-XXXX-XXXX-XXXX              │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Back]              [Connect]         │
└────────────────────────────────────────┘
```

**Server Code Format**: JSON Web Token (JWT) with server info

```javascript
// Encoded in JWT
{
  "name": "My Congruity Server",
  "supabase_url": "https://xyz.supabase.co",
  "supabase_anon_key": "eyJhbGc...",
  "signaling_url": "wss://signal.example.com",
  "icon_url": "https://example.com/icon.png" // optional
}
```

#### Option 2: Manual Configuration

```
┌────────────────────────────────────────┐
│  Manual Server Configuration          │
│                                        │
│  Server Name (for your reference)      │
│  ┌──────────────────────────────────┐  │
│  │ My Server                        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Supabase URL                          │
│  ┌──────────────────────────────────┐  │
│  │ https://xyz.supabase.co          │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Supabase Anonymous Key                │
│  ┌──────────────────────────────────┐  │
│  │ eyJhbGc...                       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  WebRTC Signaling URL                  │
│  ┌──────────────────────────────────┐  │
│  │ wss://signal.example.com         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Back]         [Test]    [Connect]    │
└────────────────────────────────────────┘
```

#### Validation & Testing

```
┌────────────────────────────────────────┐
│  Testing Connection...                 │
│                                        │
│  ✓ Supabase API reachable              │
│  ✓ Authentication working              │
│  ✓ Signaling server responding         │
│                                        │
│  [Cancel]                              │
└────────────────────────────────────────┘
```

Success:
```
┌────────────────────────────────────────┐
│  ✓ Connected!                          │
│                                        │
│  You're now connected to:              │
│  My Congruity Server                   │
│                                        │
│  [Continue to Sign In]                 │
└────────────────────────────────────────┘
```

Error:
```
┌────────────────────────────────────────┐
│  ✗ Connection Failed                   │
│                                        │
│  Could not connect to Supabase:        │
│  Network timeout (check URL)           │
│                                        │
│  [Try Again]    [Change Config]        │
└────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Configuration Storage

Use **localStorage** for persistence (works in browser and Tauri):

```typescript
// src/lib/serverConfig.ts

export interface ServerConfig {
  id: string; // UUID for this config
  name: string; // User-friendly name
  supabaseUrl: string;
  supabaseAnonKey: string;
  signalingUrl: string;
  iconUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export class ConfigManager {
  private static STORAGE_KEY = 'congruity_server_configs';
  private static ACTIVE_CONFIG_KEY = 'congruity_active_config';

  static saveConfig(config: ServerConfig): void {
    const configs = this.getAllConfigs();
    const existingIndex = configs.findIndex(c => c.id === config.id);
    
    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
  }

  static getAllConfigs(): ServerConfig[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static getActiveConfig(): ServerConfig | null {
    const activeId = localStorage.getItem(this.ACTIVE_CONFIG_KEY);
    if (!activeId) return null;
    
    const configs = this.getAllConfigs();
    return configs.find(c => c.id === activeId) || null;
  }

  static setActiveConfig(id: string): void {
    localStorage.setItem(this.ACTIVE_CONFIG_KEY, id);
    
    // Update lastUsedAt
    const configs = this.getAllConfigs();
    const config = configs.find(c => c.id === id);
    if (config) {
      config.lastUsedAt = new Date().toISOString();
      this.saveConfig(config);
    }
  }

  static deleteConfig(id: string): void {
    const configs = this.getAllConfigs().filter(c => c.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(configs));
    
    // If we deleted the active config, clear active
    if (this.getActiveConfig()?.id === id) {
      localStorage.removeItem(this.ACTIVE_CONFIG_KEY);
    }
  }

  static hasAnyConfig(): boolean {
    return this.getAllConfigs().length > 0;
  }

  static needsConfiguration(): boolean {
    return !this.getActiveConfig();
  }
}
```

### 2. Dynamic Supabase Client

Update `src/lib/supabase.js` to use runtime config:

```typescript
// src/lib/supabase.ts (refactored)
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ConfigManager } from "./serverConfig";

let supabaseInstance: SupabaseClient | null = null;

export function initializeSupabase(config?: ServerConfig): SupabaseClient {
  const activeConfig = config || ConfigManager.getActiveConfig();
  
  if (!activeConfig) {
    throw new Error("No server configuration found. Please configure a server.");
  }

  // Create new client with runtime config
  supabaseInstance = createClient(
    activeConfig.supabaseUrl,
    activeConfig.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );

  return supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    return initializeSupabase();
  }
  return supabaseInstance;
}

// For backward compatibility during migration
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const instance = getSupabase();
    return instance[prop as keyof SupabaseClient];
  },
});
```

### 3. Configuration Wizard Component

```tsx
// src/Components/ConfigWizard.tsx
import { useState } from "react";
import { ConfigManager, ServerConfig } from "../lib/serverConfig";
import { initializeSupabase } from "../lib/supabase";
import { generateUUID } from "../lib/utils";

type WizardStep = "welcome" | "method" | "server-code" | "manual" | "testing" | "complete";

export function ConfigWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<WizardStep>("welcome");
  const [config, setConfig] = useState<Partial<ServerConfig>>({
    name: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    signalingUrl: "",
  });
  const [serverCode, setServerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testingStatus, setTestingStatus] = useState<string[]>([]);

  const handleServerCodeSubmit = async () => {
    setError(null);
    
    try {
      // Decode JWT server code
      const decoded = decodeServerCode(serverCode);
      setConfig(decoded);
      setStep("testing");
      await testConnection(decoded);
    } catch (err) {
      setError("Invalid server code. Please check and try again.");
    }
  };

  const handleManualSubmit = async () => {
    setError(null);
    setStep("testing");
    await testConnection(config as ServerConfig);
  };

  const testConnection = async (cfg: Partial<ServerConfig>) => {
    const statuses: string[] = [];
    setTestingStatus(statuses);

    try {
      // Test 1: Supabase API reachable
      statuses.push("Testing Supabase connection...");
      setTestingStatus([...statuses]);
      
      const response = await fetch(`${cfg.supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': cfg.supabaseAnonKey || '',
        },
      });
      
      if (!response.ok) {
        throw new Error("Supabase API not reachable");
      }
      
      statuses.push("✓ Supabase API reachable");
      setTestingStatus([...statuses]);

      // Test 2: Can initialize Supabase client
      statuses.push("Testing authentication...");
      setTestingStatus([...statuses]);
      
      const tempClient = initializeSupabase(cfg as ServerConfig);
      const { data, error } = await tempClient.auth.getSession();
      
      if (error && error.message !== "No session found") {
        throw new Error(`Auth error: ${error.message}`);
      }
      
      statuses.push("✓ Authentication working");
      setTestingStatus([...statuses]);

      // Test 3: Signaling server
      statuses.push("Testing signaling server...");
      setTestingStatus([...statuses]);
      
      const signalingProtocol = cfg.signalingUrl?.startsWith("wss") ? "https" : "http";
      const signalingHost = cfg.signalingUrl?.replace("wss://", "").replace("ws://", "");
      
      const signalingResponse = await fetch(`${signalingProtocol}://${signalingHost}/health`, {
        method: 'GET',
      });
      
      if (!signalingResponse.ok) {
        throw new Error("Signaling server not responding");
      }
      
      statuses.push("✓ Signaling server responding");
      setTestingStatus([...statuses]);

      // Success!
      const finalConfig: ServerConfig = {
        id: generateUUID(),
        name: cfg.name || "My Server",
        supabaseUrl: cfg.supabaseUrl || "",
        supabaseAnonKey: cfg.supabaseAnonKey || "",
        signalingUrl: cfg.signalingUrl || "",
        iconUrl: cfg.iconUrl,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };

      ConfigManager.saveConfig(finalConfig);
      ConfigManager.setActiveConfig(finalConfig.id);
      
      setStep("complete");
      
      // Reinitialize Supabase with new config
      initializeSupabase(finalConfig);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("manual");
    }
  };

  const decodeServerCode = (code: string): Partial<ServerConfig> => {
    // Remove dashes and decode base64-encoded JWT
    const cleaned = code.replace(/-/g, "");
    
    try {
      // Simple JWT decode (just payload, no verification for now)
      const parts = cleaned.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid format");
      }
      
      const payload = JSON.parse(atob(parts[1]));
      
      return {
        name: payload.name,
        supabaseUrl: payload.supabase_url,
        supabaseAnonKey: payload.supabase_anon_key,
        signalingUrl: payload.signaling_url,
        iconUrl: payload.icon_url,
      };
    } catch (err) {
      throw new Error("Invalid server code format");
    }
  };

  // Render different steps
  switch (step) {
    case "welcome":
      return (
        <WelcomeScreen onStart={() => setStep("method")} />
      );
    
    case "method":
      return (
        <MethodSelection
          onServerCode={() => setStep("server-code")}
          onManual={() => setStep("manual")}
          onBack={() => setStep("welcome")}
        />
      );
    
    case "server-code":
      return (
        <ServerCodeInput
          value={serverCode}
          onChange={setServerCode}
          onSubmit={handleServerCodeSubmit}
          onBack={() => setStep("method")}
          error={error}
        />
      );
    
    case "manual":
      return (
        <ManualConfiguration
          config={config}
          onChange={setConfig}
          onSubmit={handleManualSubmit}
          onBack={() => setStep("method")}
          error={error}
        />
      );
    
    case "testing":
      return (
        <TestingScreen
          statuses={testingStatus}
          error={error}
          onRetry={() => setStep("manual")}
        />
      );
    
    case "complete":
      return (
        <CompleteScreen
          serverName={config.name || "Server"}
          onContinue={onComplete}
        />
      );
  }
}

// Individual screen components...
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome to Congruity!
        </h1>
        <p className="text-gray-300 mb-6">
          Before you start, let's connect to a server.
        </p>
        <button
          onClick={onStart}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}

// ... other screen components (ServerCodeInput, ManualConfiguration, etc.)
```

### 4. App Entry Point Update

```tsx
// src/main.tsx or App.tsx
import { ConfigWizard } from "./Components/ConfigWizard";
import { ConfigManager } from "./lib/serverConfig";

function App() {
  const [needsConfig, setNeedsConfig] = useState(ConfigManager.needsConfiguration());

  if (needsConfig) {
    return <ConfigWizard onComplete={() => setNeedsConfig(false)} />;
  }

  // Normal app flow
  return (
    <AuthProvider>
      <Router>
        {/* ... existing app */}
      </Router>
    </AuthProvider>
  );
}
```

### 5. Settings Panel for Reconfiguration

```tsx
// src/Components/ServerSettings.tsx
export function ServerSettings() {
  const [configs, setConfigs] = useState(ConfigManager.getAllConfigs());
  const activeConfig = ConfigManager.getActiveConfig();

  const handleSwitchServer = (id: string) => {
    ConfigManager.setActiveConfig(id);
    window.location.reload(); // Reinitialize with new config
  };

  const handleDeleteServer = (id: string) => {
    if (confirm("Delete this server configuration?")) {
      ConfigManager.deleteConfig(id);
      setConfigs(ConfigManager.getAllConfigs());
    }
  };

  const handleAddServer = () => {
    // Trigger config wizard modal
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Server Connections</h2>
      
      <div className="space-y-2">
        {configs.map(config => (
          <div
            key={config.id}
            className={`p-4 rounded ${
              config.id === activeConfig?.id
                ? "bg-blue-900 border border-blue-500"
                : "bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{config.name}</h3>
                <p className="text-sm text-gray-400">{config.supabaseUrl}</p>
              </div>
              
              <div className="space-x-2">
                {config.id !== activeConfig?.id && (
                  <button
                    onClick={() => handleSwitchServer(config.id)}
                    className="px-3 py-1 bg-blue-600 rounded text-sm"
                  >
                    Switch
                  </button>
                )}
                <button
                  onClick={() => handleDeleteServer(config.id)}
                  className="px-3 py-1 bg-red-600 rounded text-sm"
                >
                  Delete
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={handleAddServer}
        className="mt-4 w-full px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
      >
        + Add Another Server
      </button>
    </div>
  );
}
```

---

## Server Code Generation Tool

For server admins to generate codes easily:

```typescript
// Script: scripts/generate-server-code.ts
import jwt from 'jsonwebtoken';

interface ServerCodePayload {
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  signaling_url: string;
  icon_url?: string;
}

function generateServerCode(payload: ServerCodePayload): string {
  // Sign with a simple secret (since we're not verifying, just encoding)
  const token = jwt.sign(payload, 'congruity-server-code', {
    algorithm: 'HS256',
    expiresIn: '365d', // Valid for 1 year
  });
  
  // Format with dashes for readability: XXXX-XXXX-XXXX-XXXX
  return token.match(/.{1,4}/g)?.join('-') || token;
}

// Usage:
const code = generateServerCode({
  name: "My Congruity Server",
  supabase_url: "https://xyz.supabase.co",
  supabase_anon_key: "eyJhbGc...",
  signaling_url: "wss://signal.example.com",
});

console.log("Server Code:", code);
```

Add to setup.sh to auto-generate:

```bash
# In docker/setup.sh, after configuration
echo -e "\n${BLUE}Generating Server Code...${NC}"

cat > server-code.json << EOF
{
  "name": "Self-Hosted Congruity",
  "supabase_url": "${API_URL}",
  "supabase_anon_key": "${ANON_KEY}",
  "signaling_url": "${SIGNALING_PUBLIC_URL}"
}
EOF

# Use Node.js or a simple tool to encode
npm install -g jsonwebtoken
SERVER_CODE=$(node -e "
const jwt = require('jsonwebtoken');
const payload = $(cat server-code.json);
const token = jwt.sign(payload, 'congruity-server-code');
console.log(token.match(/.{1,4}/g).join('-'));
")

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Server Code (share with users):${NC}"
echo ""
echo -e "${YELLOW}${SERVER_CODE}${NC}"
echo ""
echo "Users can paste this into the Congruity client to auto-configure."
```

---

## Migration Path

### Phase 1: Add Configuration System (This PR)
- [ ] Implement `ConfigManager`
- [ ] Add `ConfigWizard` component
- [ ] Update `supabase.ts` to use runtime config
- [ ] Add fallback to env vars for backward compatibility
- [ ] Test locally

### Phase 2: Update Documentation
- [ ] Update `README.md` with new first-run flow
- [ ] Update `ALPHA_CLIENT_BUILD_GUIDE.md`
- [ ] Add server code generation to `setup.sh`

### Phase 3: Build & Test
- [ ] Build client for all platforms
- [ ] Test first-run wizard on each platform
- [ ] Test server switching
- [ ] Test configuration persistence

### Phase 4: Deploy
- [ ] Distribute new builds to alpha testers
- [ ] Monitor for configuration issues

---

## Testing Checklist

- [ ] First launch shows wizard
- [ ] Server code decodes correctly
- [ ] Manual config saves successfully
- [ ] Connection testing works (success path)
- [ ] Connection testing handles errors gracefully
- [ ] Configuration persists across app restarts
- [ ] Can switch between multiple servers
- [ ] Can delete server configurations
- [ ] Settings panel shows all saved servers
- [ ] Backward compatibility with env vars

---

## Future Enhancements

### "Connect to Congruity Cloud" Quick Option

```tsx
// In ConfigWizard welcome screen
<button
  onClick={() => useCongruityCLoud()}
  className="w-full px-4 py-2 bg-purple-600 text-white rounded"
>
  Connect to Congruity Cloud
</button>
```

Auto-fills configuration for cloud-hosted Congruity service.

### QR Code Server Codes

Encode server code as QR code for mobile apps:

```tsx
import QRCode from 'qrcode.react';

<QRCode value={serverCode} size={256} />
```

### Import/Export Configuration

```tsx
const exportConfig = (config: ServerConfig) => {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  // Trigger download
};
```

---

## Files to Create/Modify

### New Files
- `client/src/lib/serverConfig.ts` - Configuration management
- `client/src/Components/ConfigWizard.tsx` - First-run wizard
- `client/src/Components/ServerSettings.tsx` - Settings panel
- `client/scripts/generate-server-code.ts` - Code generation script

### Modified Files
- `client/src/lib/supabase.ts` - Runtime config support
- `client/src/main.tsx` - Add wizard check
- `client/src/hooks/useWebRTC.tsx` - Use runtime config
- `docker/setup.sh` - Generate server code

---

## Estimated Timeline

- **Day 1**: ConfigManager + basic wizard (4h)
- **Day 2**: Connection testing + polish (3h)  
- **Day 3**: Settings panel + testing (3h)
- **Day 4**: Integration testing + fixes (2h)

**Total**: ~12 hours for complete implementation

---

## Dependencies

```bash
cd client
npm install jsonwebtoken  # For server code generation
npm install @types/jsonwebtoken -D  # TypeScript types
```

---

## Security Considerations

1. **Server Code Signing**: Currently uses a shared secret. For production, consider:
   - Public/private key pairs
   - Server code expiration
   - One-time use codes

2. **Storage**: localStorage is acceptable but consider:
   - Encryption with user password
   - Secure storage APIs (Tauri's secure storage on desktop)

3. **Validation**: Always validate before saving:
   - URL format check
   - Key format check (JWT structure)
   - Connection test before saving

---

**Ready to implement?** See implementation checklist above. This is the **#1 blocking issue** for alpha release. Once complete, the client can be distributed as a single build that works with any Congruity server.
