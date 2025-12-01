# Quick Start: Ngrok Integration Task

## What We're Doing

Replacing the standalone betti-videochat with the integrated video chat in betti-platform, making it accessible via ngrok at: `https://halibut-saved-gannet.ngrok-free.app`

## Current Setup

**betti-platform has:**
- Frontend (React/Vite): Port 5173
- Backend (Express): Port 3001
- Nutrition Server: Port 3002
- Video Chat Server: Port 8080 (integrated, needs ngrok support)

**Working reference:**
- Standalone videochat at `C:\Users\AMI Server\Documents\betti-videochat\betti-videochat`
- Already works with ngrok
- Has proven patterns to copy

## Your Task

Make the betti-platform video chat work with ngrok using the **Vite Proxy approach**:

```
Internet → ngrok (halibut-saved-gannet.ngrok-free.app)
           ↓
        Port 5173 (Vite Frontend)
           ↓ (proxy)
        ├─ /api → Backend (3001)
        ├─ /api/nutrition → Nutrition (3002)
        └─ /video → Video Chat (8080)
```

## Files to Read First

1. **Your detailed task list:** `TASK_FOR_CLAUDE.md` (18 tasks with step-by-step instructions)
2. **Comprehensive plan:** `NGROK_MIGRATION_PLAN.md` (architecture options, security, rollback)
3. **System overview:** `C:\Users\AMI Server\Documents\BETTI_SYSTEM_OVERVIEW.md`

## Key Changes Needed

1. **Create HTTP video server:** `backend/videochat-server/server-ngrok.cjs`
2. **Update Vite proxy:** Add routes for all backend services in `frontend/vite.config.js`
3. **Update CORS:** Allow ngrok domain in all backend servers
4. **Create startup script:** `start-with-ngrok.bat`
5. **Test everything:** Local mode and ngrok mode

## Quick Reference

**Copy these patterns from standalone videochat:**
- HTTP server setup (no SSL): `server-ngrok.js`
- WebSocket auto-detection: `public/script.js` lines 275-276
- Startup script: `start-videochat.bat`

**Key code pattern (auto-detect protocol):**
```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;
```

## Success = Working Video Chat via Ngrok

When done, users should:
1. Run `start-with-ngrok.bat`
2. Access `https://halibut-saved-gannet.ngrok-free.app`
3. Use video chat to connect with other users remotely
4. All other platform features still work

## Start Here

1. Read `TASK_FOR_CLAUDE.md` for complete task list
2. Start with Phase 1 (Investigation)
3. Follow phases 2-8 sequentially
4. Test thoroughly at each phase

Good luck! All the details are in the task file.
