# Task: Integrate Video Chat with Ngrok Support

## Context

The betti-platform has an integrated video chat server at `backend/videochat-server/` (port 8080). We need to make this accessible via ngrok so users can connect from anywhere on the internet.

**Ngrok URL:** `https://halibut-saved-gannet.ngrok-free.app`

**Reference Implementation:** A standalone videochat exists at `C:\Users\AMI Server\Documents\betti-videochat\betti-videochat` that successfully works with ngrok. Use it as a reference for patterns that work.

## Objective

Enable the entire betti-platform (frontend + all backend services including video chat) to be accessible through a single ngrok tunnel, while keeping local development mode functional.

## Recommended Approach: Option B (Vite Proxy)

Use Vite's built-in proxy to route all backend services through the frontend dev server. Then point ngrok at the Vite dev server (port 5173).

```
Internet → ngrok → Port 5173 (Vite) → Proxy to backends
                                       ├─ /api → 3001
                                       ├─ /api/nutrition → 3002
                                       └─ /video → 8080
```

## Tasks

### Phase 1: Investigation (Read-Only)

1. **Examine current video chat server**
   - Read `backend/videochat-server/server.cjs`
   - Check if it uses HTTP or HTTPS
   - Check port configuration (should be 8080)
   - Compare with reference: `C:\Users\AMI Server\Documents\betti-videochat\betti-videochat\server-ngrok.js`

2. **Check for video chat client files**
   - Look for `backend/videochat-server/public/` directory
   - If exists: Check for `index.html`, `script.js`, `style.css`
   - If missing: Note that we'll need to copy from standalone videochat

3. **Examine frontend integration**
   - Check `frontend/src/` for video chat components
   - Look for existing video chat routes
   - Check `frontend/vite.config.js` for current proxy settings

4. **Review current startup process**
   - Read root `package.json` scripts
   - Understand `npm run dev` command
   - Check how `dev:video` script works

### Phase 2: Create HTTP Version of Video Chat (if needed)

5. **Create ngrok-compatible video chat server**
   - Create `backend/videochat-server/server-ngrok.cjs`
   - Use HTTP instead of HTTPS (ngrok provides SSL)
   - Copy logic from reference `server-ngrok.js`
   - Ensure same WebSocket signaling, room management
   - Listen on port 8080
   - Listen on host 0.0.0.0

6. **Ensure client auto-detects protocol**
   - Find video chat client WebSocket connection code
   - Ensure it uses: `const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';`
   - Ensure it uses: `const wsUrl = protocol + '//' + window.location.host + '/video';`
   - If files missing, copy from `standalone/public/script.js`

### Phase 3: Configure Vite Proxy

7. **Update `frontend/vite.config.js`**
   - Add proxy configuration for all backend services
   - Enable WebSocket support (`ws: true`)
   - Configuration:
   ```javascript
   export default defineConfig({
     server: {
       host: '0.0.0.0', // Allow external connections
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
           ws: true // WebSocket support
         },
         '/api/nutrition': {
           target: 'http://localhost:3002',
           changeOrigin: true
         },
         '/video': {
           target: 'http://localhost:8080',
           changeOrigin: true,
           ws: true // Important for WebRTC signaling
         }
       }
     }
   })
   ```

### Phase 4: Update CORS Configuration

8. **Update backend CORS settings**
   - Edit `backend/src/index.js`
   - Update CORS origin to allow ngrok domain:
   ```javascript
   app.use(cors({
     origin: ['http://localhost:5173', 'https://halibut-saved-gannet.ngrok-free.app'],
     credentials: true
   }))
   ```

9. **Update nutrition server CORS**
   - Edit `backend/src/nutrition-server.js`
   - Same CORS configuration as above

10. **Update video chat server CORS (if applicable)**
    - Edit video chat server files
    - Add same CORS configuration

### Phase 5: Create Startup Scripts

11. **Add npm script for ngrok-mode video chat**
    - Edit root `package.json`
    - Add to scripts section:
    ```json
    "dev:video:ngrok": "cd backend/videochat-server && node server-ngrok.cjs"
    ```

12. **Create startup batch file**
    - Create `start-with-ngrok.bat` in root directory
    - Content:
    ```batch
    @echo off
    echo Starting Betti Platform with Ngrok...
    echo.

    cd /d "C:\Users\AMI Server\Documents\betti-platform"

    echo Starting backend services...
    start "Betti Backend" cmd /k "npm run dev:backend"
    timeout /t 2 /nobreak >nul

    start "Betti Nutrition" cmd /k "npm run dev:nutrition"
    timeout /t 2 /nobreak >nul

    start "Betti Video (ngrok mode)" cmd /k "npm run dev:video:ngrok"
    timeout /t 2 /nobreak >nul

    echo Starting ngrok tunnel...
    start "Ngrok" cmd /k "ngrok http --url=halibut-saved-gannet.ngrok-free.app 5173"
    timeout /t 5 /nobreak >nul

    echo Starting frontend...
    start "Betti Frontend" cmd /k "npm run dev:frontend"
    timeout /t 3 /nobreak >nul

    echo.
    echo ========================================
    echo Betti Platform is starting...
    echo ========================================
    echo Local:  http://localhost:5173
    echo Public: https://halibut-saved-gannet.ngrok-free.app
    echo ========================================
    echo.
    echo Backend:    http://localhost:3001
    echo Nutrition:  http://localhost:3002
    echo Video Chat: http://localhost:8080
    echo ========================================
    pause
    ```

### Phase 6: Environment Configuration

13. **Create/update environment variables**
    - Create `backend/.env` if not exists
    - Add configuration:
    ```env
    PORT=3001
    NUTRITION_PORT=3002
    VIDEO_PORT=8080
    HOST=0.0.0.0

    # CORS Origins (for ngrok access)
    ALLOWED_ORIGINS=http://localhost:5173,https://halibut-saved-gannet.ngrok-free.app
    ```

### Phase 7: Documentation

14. **Update README.md**
    - Add section "Running with Ngrok"
    - Document `start-with-ngrok.bat` usage
    - Include public URL and access instructions

15. **Create quick start guide**
    - Create `NGROK_USAGE.md`
    - Step-by-step instructions for using ngrok
    - Troubleshooting common issues

### Phase 8: Testing

16. **Test locally without ngrok**
    ```bash
    npm run dev
    ```
    - Verify all services start
    - Test video chat at http://localhost:8080
    - Ensure frontend can access all APIs

17. **Test with ngrok**
    ```bash
    start-with-ngrok.bat
    ```
    - Wait for all services to start
    - Access https://halibut-saved-gannet.ngrok-free.app
    - Test frontend loads
    - Test video chat functionality:
      - Join room from ngrok URL
      - Open incognito window, join same room
      - Verify WebSocket connection
      - Verify video/audio streams

18. **Test cross-service communication**
    - Test API calls from frontend through ngrok
    - Test nutrition API access
    - Test BLE endpoints (if applicable)
    - Test WebSocket connections remain stable

## Success Criteria

✅ Video chat accessible via ngrok URL
✅ All platform services accessible via ngrok
✅ WebRTC signaling works through ngrok
✅ Media streams establish between remote users
✅ Local development mode still works (`npm run dev`)
✅ Single command starts everything (`start-with-ngrok.bat`)
✅ Documentation updated

## Reference Files to Study

From standalone videochat (`C:\Users\AMI Server\Documents\betti-videochat\betti-videochat`):
- `server-ngrok.js` - HTTP server pattern for ngrok
- `public/script.js` - WebSocket auto-detection (lines 275-276)
- `start-videochat.bat` - Proven startup script pattern

## Important Notes

1. **Keep both modes working:**
   - Local HTTPS mode: `npm run dev` (existing, uses `server.cjs`)
   - Ngrok HTTP mode: `start-with-ngrok.bat` (new, uses `server-ngrok.cjs`)

2. **WebSocket protocol detection is critical:**
   - Must auto-detect based on page protocol
   - `wss://` for HTTPS (ngrok)
   - `ws://` for HTTP (local)

3. **CORS must allow ngrok domain:**
   - All backend services need updated CORS
   - Critical for WebSocket connections

4. **Port consistency:**
   - Don't change existing ports
   - Frontend: 5173
   - Backend: 3001
   - Nutrition: 3002
   - Video: 8080

5. **Use proven patterns:**
   - The standalone videochat successfully works with ngrok
   - Copy its patterns: HTTP server, auto-detection, startup script
   - Don't reinvent - adapt what works

## Potential Issues & Solutions

**Issue:** WebSocket connection fails through ngrok
- **Solution:** Ensure Vite proxy has `ws: true` for video route
- **Solution:** Check CORS allows ngrok domain
- **Solution:** Verify protocol auto-detection in client

**Issue:** Video chat can't find public files
- **Solution:** Copy from standalone videochat `public/` directory
- **Solution:** Ensure server serves static files correctly

**Issue:** CORS errors
- **Solution:** Update all backend servers with ngrok domain
- **Solution:** Ensure `credentials: true` in CORS config

**Issue:** Services can't be reached
- **Solution:** Verify all servers listen on `0.0.0.0`, not `localhost`
- **Solution:** Check firewall settings

## Detailed Reference: See NGROK_MIGRATION_PLAN.md

For comprehensive architecture options, security considerations, and detailed explanations, see `NGROK_MIGRATION_PLAN.md` in this directory.

---

**Ready to start? Begin with Phase 1 (Investigation) to understand the current setup before making changes.**
