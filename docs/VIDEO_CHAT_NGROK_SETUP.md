# Video Chat Architecture & ngrok Setup Guide

This document describes the Betti video chat system architecture and how to expose it to the internet using ngrok for remote access.

---

## Architecture Overview

```
                                    INTERNET
                                        |
                                        v
                              +------------------+
                              |     ngrok        |
                              | (HTTPS tunnel)   |
                              +------------------+
                                        |
                                        v
+-------------------+           +------------------+           +-------------------+
|   Remote Client   |  <------> |  Video Chat      |  <------> |   Local Client    |
|   (Mobile/Web)    |   WSS     |  Server (8080)   |    WS     |   (Smart Mirror)  |
+-------------------+           +------------------+           +-------------------+
        |                               |                               |
        |                               |                               |
        v                               v                               v
+-------------------+           +------------------+           +-------------------+
|   WebRTC Media    |  <------> |   STUN Servers   |  <------> |   WebRTC Media    |
|   (P2P Video)     |   Direct  | (Google Public)  |   Direct  |   (P2P Video)     |
+-------------------+           +------------------+           +-------------------+
```

### Components

| Component | Port | Protocol | Description |
|-----------|------|----------|-------------|
| Video Chat Server | 8080 | WS/WSS | WebRTC signaling server (WebSocket-based) |
| Frontend | 5173 | HTTP/HTTPS | React app with VideoChat component |
| STUN Servers | 19302 | UDP | Google's public STUN servers for NAT traversal |

### How It Works

1. **Signaling Server** (`backend/videochat-server/server.cjs`)
   - Handles WebSocket connections for WebRTC signaling
   - Manages room-based sessions (max 2 participants per room)
   - Routes offer/answer/ICE candidates between peers
   - Supports both HTTP and HTTPS (auto-detects SSL certs)

2. **Frontend Client** (`frontend/src/components/VideoChat.jsx`)
   - Connects to signaling server via WebSocket
   - Handles WebRTC peer connection setup
   - Uses Google STUN servers for NAT traversal
   - Manages local/remote video streams

3. **WebRTC Flow**
   ```
   Client A                    Server                    Client B
      |                          |                          |
      |------ join-room -------->|                          |
      |<----- joined-room -------|                          |
      |                          |<------ join-room --------|
      |                          |------- joined-room ----->|
      |<----- user-joined -------|                          |
      |                          |                          |
      |------ offer ------------>|------- offer ----------->|
      |                          |<------ answer -----------|
      |<----- answer ------------|                          |
      |                          |                          |
      |<---- ICE candidates ---->|<---- ICE candidates ---->|
      |                          |                          |
      |<======== P2P Video/Audio (direct connection) ======>|
   ```

---

## ngrok Setup

### Prerequisites

1. **ngrok Account**: Sign up at [ngrok.com](https://ngrok.com)
2. **ngrok CLI**: Install from [ngrok.com/download](https://ngrok.com/download)
3. **Auth Token**: Get from [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)

### Step 1: Install and Configure ngrok

```bash
# Windows (via Chocolatey)
choco install ngrok

# Or download directly and add to PATH

# Authenticate (one-time setup)
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 2: Start the Video Chat Server

```bash
# From project root
npm run dev:video

# Or directly
cd backend/videochat-server && node server.cjs
```

You should see:
```
WebRTC signaling server running on port 8080
Access from other devices: https://[YOUR_IP]:8080
```

### Step 3: Create ngrok Tunnel

For WebSocket connections, you need an HTTP tunnel (ngrok upgrades to WSS automatically):

```bash
# Basic tunnel
ngrok http 8080

# With custom subdomain (requires paid plan)
ngrok http 8080 --subdomain=betti-video

# With region selection (for lower latency)
ngrok http 8080 --region=us
```

ngrok will display:
```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://abc123.ngrok.io -> http://localhost:8080
```

### Step 4: Configure Frontend

Update the frontend environment variable to use the ngrok URL:

**Option A: Environment Variable**

Create/edit `frontend/.env`:
```env
VITE_VIDEO_SERVER_URL=abc123.ngrok.io
```

**Option B: Runtime (for testing)**

The frontend auto-detects the protocol and constructs the WebSocket URL:
```javascript
const VIDEO_SERVER = import.meta.env.VITE_VIDEO_SERVER_URL || `${window.location.hostname}:8080`
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const ws = new WebSocket(`${protocol}//${VIDEO_SERVER}`)
```

### Step 5: Access Remotely

1. Share the ngrok HTTPS URL with remote participants
2. They open the Betti frontend (which connects to the ngrok-tunneled signaling server)
3. WebRTC establishes a direct P2P connection after signaling completes

---

## Advanced Configuration

### Persistent Subdomain (Paid ngrok)

For a stable URL, use a reserved domain:

```bash
# Reserve domain in ngrok dashboard, then:
ngrok http 8080 --domain=betti-video.ngrok.io
```

### ngrok Configuration File

Create `~/.ngrok2/ngrok.yml` (or `%USERPROFILE%\.ngrok2\ngrok.yml` on Windows):

```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  betti-video:
    proto: http
    addr: 8080
    hostname: betti-video.ngrok.io  # if you have a reserved domain
```

Then start with:
```bash
ngrok start betti-video
```

### Running ngrok as a Service (Windows)

For persistent tunnels, consider using NSSM or Task Scheduler:

```powershell
# Using NSSM (Non-Sucking Service Manager)
nssm install ngrok-betti "C:\path\to\ngrok.exe" "http 8080"
nssm start ngrok-betti
```

---

## Troubleshooting

### WebSocket Connection Fails

**Symptom**: `connection failed - check certificate` in browser console

**Causes & Solutions**:
1. **Mixed content**: If frontend is HTTPS, signaling must be WSS
   - ngrok automatically provides HTTPS/WSS
   - Ensure `VITE_VIDEO_SERVER_URL` doesn't include protocol

2. **ngrok tunnel expired**: Free tier tunnels expire after 2 hours
   - Restart ngrok to get new URL
   - Update `VITE_VIDEO_SERVER_URL`

### Video Not Appearing

**Symptom**: Call connects but no video

**Causes & Solutions**:
1. **Camera permissions**: Browser must grant camera/microphone access
   - HTTPS required for camera access on remote devices
   - ngrok provides HTTPS automatically

2. **Firewall blocking STUN**: WebRTC needs UDP access to STUN servers
   - Ensure outbound UDP 19302 is allowed
   - Try different network if behind strict corporate firewall

3. **NAT traversal failed**: Some NAT configurations block P2P
   - Consider adding a TURN server for relay fallback

### ICE Candidate Errors

**Symptom**: `ICE connection state: failed` in console

**Causes & Solutions**:
1. **Symmetric NAT**: Both peers behind symmetric NAT
   - Add TURN server to `rtcConfig` in VideoChat.jsx:
   ```javascript
   const rtcConfig = {
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       { urls: 'stun:stun1.l.google.com:19302' },
       {
         urls: 'turn:your-turn-server.com:3478',
         username: 'user',
         credential: 'password'
       }
     ]
   }
   ```

2. **Firewall blocking UDP**: Required for media streams
   - Use TCP TURN as fallback

---

## Security Considerations

### Production Recommendations

1. **Use HTTPS/WSS**: ngrok provides this automatically
2. **Room Authentication**: Currently rooms are open; consider adding:
   - Room passwords
   - JWT tokens for room access
   - User authentication

3. **Rate Limiting**: Add connection limits to prevent abuse:
   ```javascript
   // In server.cjs
   const connectionCounts = new Map()
   const MAX_CONNECTIONS_PER_IP = 5
   ```

4. **Reserved Domain**: Use a consistent domain for user trust

### Current Security Model

| Feature | Status | Notes |
|---------|--------|-------|
| Transport Encryption | Yes | WSS via ngrok, WebRTC encrypted |
| Room Authentication | No | Rooms are open by default |
| User Authentication | No | User IDs are random client-generated |
| Media Encryption | Yes | WebRTC SRTP encryption built-in |

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: Start all Betti servers
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 8080
```

### Environment Variables

| Variable | Location | Example Value |
|----------|----------|---------------|
| `VIDEO_PORT` | `backend/.env` | `8080` |
| `VITE_VIDEO_SERVER_URL` | `frontend/.env` | `abc123.ngrok.io` |

### Useful Commands

```bash
# Check if video server is running
curl http://localhost:8080

# List active ngrok tunnels
ngrok tunnels

# View ngrok web interface (local)
# Open http://localhost:4040
```

### Message Types (Signaling Protocol)

| Type | Direction | Description |
|------|-----------|-------------|
| `join-room` | Client -> Server | Join a video room |
| `joined-room` | Server -> Client | Confirmation with participant list |
| `user-joined` | Server -> Client | Notification of new participant |
| `offer` | Client -> Server -> Client | WebRTC SDP offer |
| `answer` | Client -> Server -> Client | WebRTC SDP answer |
| `ice-candidate` | Client -> Server -> Client | ICE candidate exchange |
| `leave-room` | Client -> Server | Leave the room |
| `user-left` | Server -> Client | Notification of participant leaving |
| `error` | Server -> Client | Error message |
