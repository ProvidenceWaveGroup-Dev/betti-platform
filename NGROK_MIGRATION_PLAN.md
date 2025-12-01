# Betti Platform - Ngrok Migration Plan

**Objective:** Replace standalone betti-videochat with integrated video chat in betti-platform, accessible via ngrok.

**Target:** Enable public access to the complete betti-platform (frontend + all backend services) through a single ngrok tunnel.

**Ngrok URL:** `https://halibut-saved-gannet.ngrok-free.app`

---

## Current State Analysis

### What Exists Now

**betti-platform structure:**
```
betti-platform/
├── frontend/              # React app (port 5173)
├── backend/
│   ├── src/
│   │   ├── index.js              # Main backend (port 3001)
│   │   └── nutrition-server.js   # Nutrition API (port 3002)
│   └── videochat-server/
│       ├── server.cjs             # Video chat (port 8080) - HTTPS
│       ├── cert.pem
│       └── key.pem
└── package.json
```

**Current start command:** `npm run dev`
- Runs all 4 services concurrently (frontend, backend, nutrition, video)
- Uses HTTPS with self-signed certificates
- Only accessible locally

### What We're Moving From

**Standalone betti-videochat:**
- Location: `C:\Users\AMI Server\Documents\betti-videochat\betti-videochat`
- Has `server-ngrok.js` (HTTP server for ngrok compatibility)
- Has `start-videochat.bat` (ngrok startup script)
- Auto-detects ws:// vs wss:// based on protocol
- Successfully works with ngrok

---

## Migration Plan

### Phase 1: Analyze Current Video Chat Integration

**Tasks:**

1. **Read and understand current integrated video chat server**
   - File: `backend/videochat-server/server.cjs`
   - Check if it uses HTTP or HTTPS
   - Understand current signaling protocol
   - Check WebSocket implementation
   - Compare with standalone `server-ngrok.js`

2. **Check if public/ files exist for video chat**
   - Look for `public/` directory in `backend/videochat-server/`
   - Verify client files: `index.html`, `script.js`, `style.css`
   - If missing, need to copy from standalone videochat

3. **Verify frontend integration**
   - Check if `frontend/src/` has video chat components
   - Look for any routes or components that link to video chat
   - Determine if video chat is embedded or separate page

---

### Phase 2: Create Ngrok-Compatible Setup

**Approach:** Create a reverse proxy that routes all services through one port for ngrok.

**Tasks:**

1. **Create unified HTTP server with proxy** (`backend/src/proxy-server.js`)
   - Listen on single port (e.g., 3000)
   - Route paths to different services:
     - `/` → Frontend (Vite dev server on 5173)
     - `/api/*` → Main backend (3001)
     - `/api/nutrition/*` → Nutrition server (3002)
     - `/video/*` → Video chat server (8080)
     - Handle WebSocket upgrades for all services

2. **OR: Modify video chat server to HTTP** (`backend/videochat-server/server-ngrok.cjs`)
   - Create HTTP version similar to standalone `server-ngrok.js`
   - Remove HTTPS/SSL certificate requirements
   - Keep all WebRTC signaling logic identical
   - Ensure WebSocket auto-detection works

3. **Update frontend to detect protocol**
   - Modify video chat client connection logic
   - Auto-detect `ws://` vs `wss://` based on page protocol
   - Similar to standalone videochat: `const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';`

---

### Phase 3: Create Startup Scripts

**Tasks:**

1. **Create `backend/videochat-server/server-ngrok.cjs`** (HTTP version)
   ```javascript
   // HTTP server instead of HTTPS
   // Same signaling logic as server.cjs
   // Port: 8080 (or configurable via env)
   ```

2. **Create `start-with-ngrok.bat`** (root level)
   ```batch
   @echo off
   echo Starting Betti Platform with Ngrok...

   REM Start backend services
   start "Backend" cmd /k "npm run dev:backend"
   timeout /t 2

   start "Nutrition" cmd /k "npm run dev:nutrition"
   timeout /t 2

   start "Video (ngrok)" cmd /k "npm run dev:video:ngrok"
   timeout /t 2

   REM Start ngrok (adjust port based on architecture choice)
   start "Ngrok" cmd /k "ngrok http --url=halibut-saved-gannet.ngrok-free.app 5173"
   timeout /t 5

   REM Start frontend (will be served through ngrok)
   start "Frontend" cmd /k "npm run dev:frontend"

   echo Betti Platform accessible at: https://halibut-saved-gannet.ngrok-free.app
   ```

3. **Add npm scripts to root `package.json`**
   ```json
   {
     "scripts": {
       "dev:video:ngrok": "cd backend/videochat-server && node server-ngrok.cjs",
       "start:ngrok": "start-with-ngrok.bat"
     }
   }
   ```

---

### Phase 4: Configuration Updates

**Tasks:**

1. **Update `.env` files**
   - Backend `.env`: Add `USE_HTTPS=false` flag for ngrok mode
   - Add `VIDEO_PORT=8080` or make configurable
   - Add `NGROK_MODE=true` for conditional logic

2. **Update CORS settings**
   - Backend `src/index.js`: Allow ngrok domain in CORS
   - Add: `origin: ['http://localhost:5173', 'https://halibut-saved-gannet.ngrok-free.app']`
   - Similar updates for nutrition server

3. **Update WebSocket connection URLs**
   - If video chat client is in frontend, update connection string
   - Use relative WebSocket URLs or auto-detect host
   - Example: `new WebSocket(wss://${window.location.host}/video)`

---

### Phase 5: Testing Plan

**Local Testing:**

1. **Test integrated video chat locally (HTTPS)**
   ```bash
   npm run dev
   # Access: http://localhost:5173
   # Video chat: http://localhost:8080 or embedded in frontend
   ```

2. **Test with ngrok (HTTP mode)**
   ```bash
   npm run start:ngrok
   # Access: https://halibut-saved-gannet.ngrok-free.app
   ```

3. **Verify all services accessible through ngrok:**
   - Frontend loads correctly
   - API endpoints work (test backend health)
   - Nutrition API accessible
   - Video chat WebSocket connects
   - WebRTC signaling works
   - Video/audio streams establish

**Test Scenarios:**

1. **Video Chat Functionality**
   - User A: Join room via ngrok URL
   - User B: Join same room via ngrok URL
   - Verify: WebSocket connection, WebRTC connection, media streams

2. **Cross-Service Communication**
   - Test API calls from frontend to backend
   - Test WebSocket connections
   - Test nutrition data fetch

3. **Protocol Detection**
   - Verify `wss://` used when accessing via ngrok (HTTPS)
   - Verify `ws://` used when accessing locally (HTTP)

---

### Phase 6: Documentation Updates

**Tasks:**

1. **Update `README.md`**
   - Add section for running with ngrok
   - Document public access setup
   - Include ngrok URL and access instructions

2. **Update `ARCHITECTURE.md`**
   - Document ngrok integration
   - Update port allocation
   - Add network diagram with ngrok tunnel

3. **Create `NGROK_SETUP.md`**
   - Step-by-step ngrok configuration
   - Troubleshooting guide
   - Security considerations for public access

---

## Architecture Options

### Option A: Single Port Proxy (Recommended)

**Approach:** All services behind one reverse proxy on port 3000.

```
Internet → Ngrok → Port 3000 (Proxy Server)
                        ├─ / → Frontend (5173)
                        ├─ /api → Backend (3001)
                        ├─ /api/nutrition → Nutrition (3002)
                        └─ /video → Video Chat (8080)
```

**Pros:**
- Single ngrok tunnel
- Clean URL structure
- Easy path-based routing

**Cons:**
- Need to implement proxy server
- More complex setup

---

### Option B: Frontend Proxy (Simpler)

**Approach:** Ngrok tunnels to Vite dev server (5173), Vite proxies backend calls.

```
Internet → Ngrok → Port 5173 (Vite Dev Server)
                        └─ Vite Proxy
                            ├─ /api → Backend (3001)
                            ├─ /api/nutrition → Nutrition (3002)
                            └─ /video → Video Chat (8080)
```

**Pros:**
- Simpler, uses existing Vite proxy
- No new proxy server needed
- Frontend already configured

**Cons:**
- All WebSocket upgrades must go through Vite
- May need Vite config updates

**Implementation:**
Update `frontend/vite.config.js`:
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      },
      '/api/nutrition': {
        target: 'http://localhost:3002',
        changeOrigin: true
      },
      '/video': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
```

---

### Option C: Direct Video Chat (Quick Solution)

**Approach:** Ngrok directly to video chat server, keep others local.

```
Internet → Ngrok → Port 8080 (Video Chat Only)
Local network:
    - Frontend (5173)
    - Backend (3001)
    - Nutrition (3002)
```

**Pros:**
- Minimal changes
- Quick to implement
- Similar to current standalone setup

**Cons:**
- Only video chat public
- Other services remain local only
- Not true "platform" integration

---

## Recommended Implementation Order

**For maximum success, implement in this order:**

### Step 1: Copy Proven Patterns
- Copy `server-ngrok.js` pattern from standalone to create `server-ngrok.cjs`
- Copy auto-detection WebSocket logic to video chat client
- Use proven working code as template

### Step 2: Minimal Changes First
- Get video chat working with ngrok (Option C)
- Verify WebRTC signaling works through ngrok
- Confirm media streams establish

### Step 3: Expand to Full Platform
- Implement Option B (Vite proxy) for full platform access
- Update Vite config to proxy all services
- Test all services through ngrok

### Step 4: Polish and Document
- Add proper error handling
- Create startup scripts
- Write documentation
- Test thoroughly

---

## Files to Create/Modify

### New Files:
1. `backend/videochat-server/server-ngrok.cjs` - HTTP version of video chat server
2. `start-with-ngrok.bat` - Startup script with ngrok
3. `NGROK_SETUP.md` - Setup and troubleshooting guide

### Modified Files:
1. `package.json` - Add `dev:video:ngrok` and `start:ngrok` scripts
2. `frontend/vite.config.js` - Add proxy configuration for all services
3. `backend/src/index.js` - Update CORS to allow ngrok domain
4. `backend/src/nutrition-server.js` - Update CORS to allow ngrok domain
5. `backend/videochat-server/server.cjs` - Verify or update for ngrok compatibility
6. `README.md` - Add ngrok instructions
7. `ARCHITECTURE.md` - Document ngrok setup
8. `.env.example` - Add ngrok-related environment variables

---

## Environment Variables

**Create/Update `backend/.env`:**
```env
# Server Configuration
PORT=3001
NUTRITION_PORT=3002
VIDEO_PORT=8080
HOST=0.0.0.0

# Ngrok Configuration
NGROK_MODE=false          # Set to true when using ngrok
NGROK_URL=https://halibut-saved-gannet.ngrok-free.app

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,https://halibut-saved-gannet.ngrok-free.app

# SSL/TLS (for local HTTPS mode)
USE_HTTPS=true            # Set to false for ngrok mode
```

---

## Security Considerations

**Important:** When making the platform publicly accessible:

1. **Authentication Required**
   - Implement user authentication before public launch
   - Protect sensitive endpoints (BLE scanning, etc.)
   - Add API key or JWT validation

2. **Rate Limiting**
   - Add rate limiting to prevent abuse
   - Especially important for public WebSocket connections

3. **Input Validation**
   - Validate all WebSocket messages
   - Sanitize room IDs and user IDs
   - Prevent injection attacks

4. **CORS Configuration**
   - Restrict to known domains
   - Don't use `origin: true` in production

5. **WebRTC Security**
   - Room IDs should be treated as secrets
   - Consider adding room passwords
   - Implement max room size limits

---

## Success Criteria

**The migration is complete when:**

✅ Video chat accessible via `https://halibut-saved-gannet.ngrok-free.app/video`
✅ Frontend accessible via `https://halibut-saved-gannet.ngrok-free.app`
✅ All API endpoints work through ngrok tunnel
✅ WebSocket connections establish successfully
✅ WebRTC peer connections work between remote users
✅ Media streams (audio/video) flow correctly
✅ All services start with single command
✅ Documentation updated with ngrok setup
✅ Local development mode still works (without ngrok)

---

## Rollback Plan

**If issues occur:**

1. Standalone betti-videochat remains available at:
   - `C:\Users\AMI Server\Documents\betti-videochat\betti-videochat`
   - Can be started with `start-videochat.bat`
   - Ngrok URL can be quickly redirected back

2. Platform services continue to work locally
   - `npm run dev` still functions normally
   - No breaking changes to local development

3. Separate ngrok tunnels can be set up temporarily
   - Video: `ngrok http 8080 --url=halibut-saved-gannet.ngrok-free.app`
   - Platform: `ngrok http 5173 --subdomain=betti-platform` (if available)

---

## Next Steps

**For the Claude CLI bot in betti-platform folder:**

1. **Start with Option B (Vite Proxy) - Recommended**
   - Simplest path to success
   - Least code changes
   - Uses existing Vite infrastructure

2. **Implementation checklist:**
   - [ ] Read current `backend/videochat-server/server.cjs`
   - [ ] Create `backend/videochat-server/server-ngrok.cjs` (HTTP version)
   - [ ] Update `frontend/vite.config.js` with proxy settings
   - [ ] Update CORS in all backend servers
   - [ ] Create `start-with-ngrok.bat`
   - [ ] Add npm scripts to `package.json`
   - [ ] Test locally first (all services)
   - [ ] Test with ngrok
   - [ ] Update documentation

3. **Testing priority:**
   - Get video chat working first
   - Then verify other services
   - Finally test full integration

---

## Questions to Resolve

**For the implementing bot to investigate:**

1. Does `backend/videochat-server/` have public files (HTML/JS/CSS)?
   - If yes: Use as-is
   - If no: Copy from standalone videochat

2. Is video chat embedded in frontend or separate page?
   - Embedded: Update component WebSocket URL
   - Separate: Video chat server serves its own files

3. Current `server.cjs` - HTTP or HTTPS?
   - HTTPS: Need to create HTTP version for ngrok
   - HTTP: Can use as-is, just need port forwarding

4. Frontend video chat integration:
   - Check `frontend/src/` for video chat components
   - Verify routing configuration
   - Check if WebSocket URLs are hardcoded or dynamic

---

**Good luck with the migration! This plan should give you everything needed to successfully integrate video chat with ngrok support into the betti-platform.**

**Author:** Claude Code
**Date:** December 1, 2025
**For:** Betti Platform Ngrok Migration
