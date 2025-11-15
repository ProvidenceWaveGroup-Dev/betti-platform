# GEMINI.md: Betti Smart Mirror Hub

This document provides a comprehensive overview of the Betti Smart Mirror Hub project, intended to serve as a guide for AI-driven development.

## Project Overview

The Betti Smart Mirror Hub is a full-stack application designed to power a 13.3" touchscreen smart mirror. It consists of a React frontend and a Node.js backend, communicating via a WebSocket for real-time data transfer and a REST API for other commands.

-   **Frontend**: A React application built with Vite. It displays information such as appointments, vitals, and Bluetooth device status. The UI is organized into several components (`Header`, `Appointments`, `Vitals`, `BLEDevices`). It connects to the backend using a WebSocket for real-time updates.

-   **Backend**: A Node.js server using Express. It serves a REST API and manages a WebSocket server. The backend is responsible for handling business logic, such as scanning for Bluetooth LE devices. It uses a `.env` file for configuration.

-   **Monorepo Structure**: The project is set up as a monorepo using npm workspaces, with `frontend` and `backend` packages.

## Building and Running

The project uses `npm` for package management. Key commands are defined in the root `package.json`.

### Installation

To install all dependencies for the root, frontend, and backend packages:

```bash
npm run install:all
```

### Development

To run both the frontend and backend development servers concurrently:

```bash
npm run dev
```

-   The frontend (Vite) will run on `http://localhost:5173`.
-   The backend (Node/Express) will run on `http://localhost:3001`.

### Production Build

To build both the frontend and backend for production:

```bash
npm run build
```

## Development Conventions

-   **Code Style**: The code appears to follow standard JavaScript/React conventions.
-   **API**: The backend exposes a REST API (e.g., for BLE scanning) and a WebSocket for real-time communication.
-   **State Management**: The frontend appears to manage state within individual components. There is no evidence of a global state management library like Redux or Zustand.
-   **Styling**: CSS files are co-located with their respective components (e.g., `Appointments.css`, `Appointments.jsx`).
-   **Data**: The frontend uses some local `.json` files for data (`appointments.json`, `vitals.json`), likely for development or static content.
-   **Environment Configuration**: The backend uses a `.env` file for configuration. A `.env.example` file is provided as a template.
