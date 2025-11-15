# Betti Smart Mirror Hub

A full-screen smart mirror application designed for a 13.3" touchscreen display (1920x1080).

## Project Structure

```
betti-platform/
├── frontend/          # React web application (Vite + React)
├── backend/           # Node.js API server (Express)
├── docs/              # Documentation
├── figma-exports/     # Design assets from Figma
└── README.md
```

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- Optimized for 1920x1080 touchscreen display

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **WebSocket (ws)** - Real-time sensor data
- **CORS** - Cross-origin support

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

Install all dependencies:
```bash
npm run install:all
```

Or install individually:
```bash
npm install              # Root dependencies
npm install --workspace=frontend
npm install --workspace=backend
```

### Development

Run both frontend and backend:
```bash
npm run dev
```

Or run individually:
```bash
npm run dev:frontend    # Start React dev server (http://localhost:5173)
npm run dev:backend     # Start API server (http://localhost:3001)
```

### Backend Configuration

Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration.

### Building for Production

Build both:
```bash
npm run build
```

Or build individually:
```bash
npm run build:frontend
npm run build:backend
```

## Display Specifications

- **Screen Size**: 13.3"
- **Resolution**: 1920x1080 (Full HD)
- **Orientation**: Landscape
- **Touch**: Enabled

## License

MIT
