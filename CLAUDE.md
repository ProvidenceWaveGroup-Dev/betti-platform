# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Betti Smart Mirror Hub is a full-stack IoT application designed for a 13.3" touchscreen display (1920x1080). The project uses npm workspaces to manage a React frontend and Node.js backend.

## Development Commands

### Setup
```bash
npm run install:all          # Install all dependencies (root + workspaces)
```

### Development
```bash
npm run dev                   # Run frontend, backend, nutrition server, and video chat server concurrently
npm run dev:frontend          # Frontend only (http://localhost:5173)
npm run dev:backend           # Backend only (http://localhost:3001)
npm run dev:nutrition         # Nutrition server only
npm run dev:video             # Video chat server only (port 8080)
```

### Building
```bash
npm run build                 # Build both frontend and backend
npm run build:frontend        # Build frontend only (outputs to frontend/dist)
npm run build:backend         # Build backend only
```

### Production
```bash
npm run start:frontend        # Start frontend in production mode
npm run start:backend         # Start backend in production mode
```

## Architecture

### Workspace Structure
This is an npm workspaces monorepo with a 4-server architecture:
- `frontend/` - React application built with Vite (port 5173)
- `backend/` - Express API server with WebSocket support (port 3001)
- `backend/src/nutrition-server.js` - Dedicated nutrition API server (port 3002)
- `backend/videochat-server/` - WebRTC signaling server (port 8080)

### Frontend (`@betti/frontend`)
- **Framework**: React 18 with React Router for navigation
- **Build Tool**: Vite 5
- **Dev Server**: Port 5173, bound to all interfaces (host: true) for testing on actual hardware
- **Display Target**: Desktop: 1920x1080 (13.3" touchscreen), Mobile: Responsive
- **CSS Variables**: Screen dimensions pre-configured ($screen-width: 1920px, $screen-height: 1080px)
- **Entry Point**: `frontend/src/main.jsx`
- **Main App**: `frontend/src/App.jsx` - Dynamic component layout with automatic device detection, supporting both desktop panel-based layout and mobile screen-based layout
- **PWA Support**: Service worker registration for offline capabilities (production only)

### Backend (`@betti/backend`)
- **Framework**: Express 4
- **Runtime**: Node.js with ES modules (type: "module")
- **Dev Tool**: Nodemon for auto-restart
- **WebSocket**: ws library for real-time sensor data streaming
- **Default Port**: 3001 (configured via PORT in .env)
- **CORS**: Enabled, defaults to http://localhost:5173
- **Entry Point**: `backend/src/index.js`

### Video Chat Server (`backend/videochat-server/`)
- **Runtime**: Node.js with CommonJS (server.cjs)
- **Framework**: Native WebSocket Server with HTTPS support
- **Default Port**: 8080 (configured via VIDEO_PORT environment variable)
- **SSL Support**: Supports HTTPS with cert.pem and key.pem certificates for WebRTC compatibility
- **Functionality**: WebRTC signaling server for peer-to-peer video communication
- **Room Management**: Supports room-based video chat with up to 2 participants per room

### Communication
- **REST API**: Backend exposes Express endpoints for frontend consumption
  - `/api/health` - Health check with WebSocket client count
  - `/api/ble/scan` (POST) - Start BLE device scanning
  - `/api/ble/status` (GET) - Get current scanning status
  - `/api/nutrition/*` - Nutrition tracking endpoints (meals, foods database)
- **Nutrition Server**: Separate nutrition server (`backend/src/nutrition-server.js`) on port 3002 handles nutrition-specific functionality
- **WebSocket**: Real-time bidirectional communication for sensor data updates
  - WebSocket server runs on same port as HTTP server (3001)
  - Frontend connects via `ws://${window.location.hostname}:3001`
  - Message types: `connection`, `ble-device`, `ble-scan-status`
  - Auto-reconnect logic in frontend with 3-second interval
- **Default sensor update interval**: 5000ms (configurable via SENSOR_UPDATE_INTERVAL)

### Bluetooth LE Integration
- **BLE Scanner**: `backend/src/services/bleScanner.js` - Singleton service using `@abandonware/noble` library for device discovery
- **Scan Duration**: 30 seconds (hardcoded in bleScanner.js)
- **Device Discovery**: Uses Noble's peripheral discovery events to detect BLE devices with name, address, and RSSI
- **Event-Driven Architecture**: BLEScanner extends EventEmitter, emitting `bleStateChange`, `bleDeviceDiscovered`, and `bleScanStatus` events
- **WebSocket Broadcasting**: Discovered devices and scan status are broadcast to all connected clients in real-time
- **Frontend WebSocket Client**: `frontend/src/services/websocket.js` - Singleton client with event emitter pattern

## Configuration

### Backend Environment Variables
Copy `backend/.env.example` to `backend/.env` before first run:
- `PORT` - Server port (default: 3001)
- `HOST` - Bind address (default: 0.0.0.0)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Frontend URL for CORS (default: http://localhost:5173)
- `SENSOR_UPDATE_INTERVAL` - Sensor polling interval in ms (default: 5000)
- `VIDEO_PORT` - Video chat server port (default: 8080)

### Frontend Environment Variables
Configure `frontend/.env`:
- `VITE_VIDEO_SERVER_URL` - Video chat server URL (e.g., "10.0.0.232:8080" for local network access)

### Frontend Configuration
Vite configuration in `frontend/vite.config.js`:
- Dev server uses strictPort mode (fails if 5173 is occupied)
- Production builds exclude sourcemaps for smaller bundle size
- SCSS preprocessor configured with screen dimension variables
- SSL support enabled via @vitejs/plugin-basic-ssl for HTTPS development

## Hardware Context

This application is designed to run on a touchscreen-enabled device (likely Raspberry Pi or similar):
- 13.3" display at 1920x1080 resolution
- Landscape orientation
- Touch input enabled
- Bluetooth LE adapter required for device scanning (uses `@abandonware/noble` library)
- SSL certificates (cert.pem/key.pem) required for HTTPS in video chat server for WebRTC camera access on remote devices
- Video chat server automatically falls back to HTTP if SSL certificates are not found (development only)

## Important Implementation Notes

### BLE Architecture Changes
The project recently transitioned from using `bluetoothctl` command-line interface to the `@abandonware/noble` Node.js library for better integration and performance. Key architectural improvements:
- **Decoupled Design**: BLEScanner service is completely decoupled from WebSocket broadcasting via EventEmitter pattern
- **State Management**: Noble handles Bluetooth adapter state changes (`poweredOn`, `poweredOff`, etc.)
- **Real-time Discovery**: Device discovery happens through Noble's event system rather than parsing command output
- **Error Handling**: Improved error handling for Bluetooth state and scanning failures

### Development Data
- `frontend/src/data/appointments.json` - Static appointment data for development
- `frontend/src/data/vitals.json` - Static vital signs data for development
- `backend/src/data/meals.json` - Nutrition meal tracking data
- `backend/src/data/nutrition.json` - Nutrition goals and targets
- `backend/src/data/foods-database.json` - Foods database for nutrition calculations

### Health & Fitness Tracking Integration
The app features comprehensive health and fitness tracking with multiple interactive components:
- **Nutrition Tracking**: `frontend/src/components/Nutrition.jsx` - Calorie counting, meal logging, and nutrition goals
- **Fitness Tracking**: `frontend/src/components/Fitness.jsx` - Workout logging, exercise tracking with video integration
- **Hydration Tracking**: `frontend/src/components/Hydration.jsx` - Daily water intake monitoring
- **Medication Tracking**: `frontend/src/components/Medication.jsx` - Daily medication checklist
- **Modal Components**: Multiple detail modals for nutrition, fitness, and meal logging with rich UIs

### Mobile UI Architecture
The app features responsive device detection with separate layouts:
- **Device Detection**: `frontend/src/utils/deviceDetection.js` - Detects mobile devices via user agent, touch capability, and screen size
- **Mobile Layout**: `frontend/src/layouts/MobileLayout.jsx` - Container layout with header and bottom navigation
- **Mobile Screens**: `frontend/src/screens/Mobile*.jsx` - Full-screen views for each feature (Dashboard, Health, Nutrition, Fitness, Hydration, Medication, Schedule, Video)
- **Mobile Styles**: `frontend/src/styles/mobile*.scss` - Mobile-specific styling per screen
- **Force Mobile Mode**: URL parameter `?mobile=true` forces mobile layout for testing

### Desktop Panel System
The desktop layout uses a sophisticated panel state management system in `frontend/src/App.jsx`:
- **Panel States**: `collapsed`, `visible`, `hidden` for health, appointments, sensors, video, and all health tracking panels
- **Single Panel Layout**: One maximized panel (2/3 width) with collapsed sidebar panels
- **Overview Layout**: All panels shown as clickable tiles when no panel is maximized
- **Dynamic Layouts**: Automatic panel state management when switching between views

## Development Notes

### Project Roadmap
See `TODO.md` for a comprehensive list of planned features, enhancements, and future development priorities organized by category and priority level.

### Testing and Linting
This project currently does not have configured linting (ESLint) or testing frameworks. The backend `package.json` includes a placeholder test script that exits with an error.

### Source Code Location

When implementing features, source code should be placed in:
- `backend/src/` - Backend JavaScript files (ES modules)
- `frontend/src/` - Frontend React components and application code
- `backend/videochat-server/` - Video chat server files (CommonJS)

The entry points are:
- Backend: `backend/src/index.js`
- Frontend: `frontend/src/main.jsx`
- Video Chat Server: `backend/videochat-server/server.cjs`