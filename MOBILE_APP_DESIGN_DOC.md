# Betti Smart Mirror Hub - Mobile App Design Documentation

> Comprehensive analysis of the web application architecture for mobile app development

## Table of Contents
- [Executive Summary](#executive-summary)
- [Application Architecture](#application-architecture)
- [Component Structure](#component-structure)
- [Data Management](#data-management)
- [Feature Analysis](#feature-analysis)
- [Mobile Adaptation Strategy](#mobile-adaptation-strategy)
- [Technical Specifications](#technical-specifications)

---

## Executive Summary

The Betti Smart Mirror Hub is a React-based health and wellness dashboard designed for a 13.3" touchscreen (1920x1080). It features comprehensive health tracking, IoT sensor integration, and real-time communication capabilities. This document analyzes the web app architecture to inform mobile app development.

### **Core Value Proposition**
- **Unified Health Dashboard**: Consolidates vitals, nutrition, fitness, hydration, medication, and appointments
- **IoT Integration**: Real-time BLE sensor discovery and data streaming
- **Smart Tracking**: Sip-based hydration, video workout integration, macro tracking
- **Real-time Communication**: WebRTC video chat and WebSocket sensor data

---

## Application Architecture

### **Technology Stack**
```
Frontend Framework: React 18 with functional components
Build Tool: Vite 5 with ES modules
State Management: Built-in React hooks (useState/useEffect)
Styling: SCSS with CSS variables and glass morphism
Real-time: WebSocket client for BLE sensors
Video: WebRTC for peer-to-peer communication
Storage: localStorage for persistence
API: REST endpoints with fallback to local data
```

### **Deployment Architecture**
```
Frontend: http://localhost:5173 (Vite dev server)
Backend API: http://localhost:3001 (Express with WebSocket)
Nutrition API: http://localhost:3002 (Separate service)
Video Chat: https://localhost:8080 (WebRTC signaling server)
```

### **Application Structure**
```
src/
├── main.jsx                 # App entry point
├── App.jsx                  # Root state manager & layout engine
├── App.css                  # Global styles & layout system
├── components/              # Feature components
│   ├── Header.jsx           # Navigation & time/weather
│   ├── Vitals.jsx           # Health monitoring
│   ├── Nutrition.jsx        # Macro & meal tracking
│   ├── Fitness.jsx          # Workout & exercise management
│   ├── Hydration.jsx        # Sip-based water tracking
│   ├── Medication.jsx       # Daily medication adherence
│   ├── Appointments.jsx     # Schedule management
│   ├── BLEDevices.jsx       # Bluetooth sensor discovery
│   ├── VideoChat.jsx        # WebRTC video calling
│   └── modals/              # Modal components
├── services/                # API & data services
├── data/                    # Static data files
└── styles/                  # Component-specific CSS
```

---

## Component Structure

### **Layout System**

The app uses a **dynamic panel-based layout** with three main modes:

#### **1. Overview Layout (Home)**
```javascript
// All panels shown as collapsed tiles in responsive grid
<div className="overview-grid">
  {collapsedPanels.map(panel =>
    <ClickablePanel key={panel.key} onClick={() => maximize(panel)} />
  )}
</div>
```

#### **2. Single Panel Layout**
```javascript
// One maximized panel (2/3 width) with sidebars showing collapsed panels
<div className="single-panel-layout">
  <div className="sidebar-left">{leftPanels}</div>
  <div className="maximized-panel">{activeComponent}</div>
  <div className="sidebar-right">{rightPanels}</div>
</div>
```

#### **3. Video Layout**
```javascript
// Video-dominant layout integrated with sidebar system
// Uses same structure as single panel but optimized for video
```

### **Panel State Management**
```javascript
const [panelState, setPanelState] = useState({
  health: 'collapsed',      // ❤️ Vitals monitoring
  nutrition: 'collapsed',   // 🍎 Macro tracking
  fitness: 'collapsed',     // 💪 Workout management
  hydration: 'collapsed',   // 💧 Sip-based water tracking
  medication: 'collapsed',  // 💊 Daily adherence
  appointments: 'collapsed',// 📅 Schedule
  sensors: 'hidden',        // ⚙️ BLE setup (hidden by default)
  video: 'hidden'          // 📹 WebRTC chat
})

// Panel states: 'collapsed' | 'visible' | 'hidden'
```

### **Navigation Flow**
```
Header Icon Click → handleNavigate(panelId) → Update panelState → Layout Re-render
                 ↓
    Single Panel System (only one maximized at a time)
                 ↓
    Other panels shown as collapsed tiles in sidebars
```

---

## Data Management

### **Local Storage Strategy**

The app uses **date-based localStorage keys** for daily data cycling:

```javascript
// Daily hydration tracking
localStorage.setItem(`hydration_${today}`, JSON.stringify({
  sipCounts: { sips: 15, bigSips: 3 },        // Separate sip counters
  todayIntake: 24.5,                          // Total fl oz consumed
  lastSipTime: "2025-11-19T14:30:00Z"         // Last interaction timestamp
}))

// Daily fitness stats
localStorage.setItem('daily_fitness_stats', JSON.stringify({
  date: "2025-11-19",
  workouts: 2,                                // Completed workouts
  calories: 450,                              // Burned calories
  minutes: 75,                                // Exercise duration
  recentWorkouts: [...]                       // Last 3 workouts
}))

// Daily medication tracking
localStorage.setItem(`medications_${today}`, JSON.stringify([
  { id: 1, name: "Morning Vitamins", time: "08:00", taken: true, type: "vitamin" }
]))
```

### **API Integration Patterns**

#### **Nutrition API (Port 3002)**
```javascript
// Primary API with localStorage fallback
const nutritionApi = {
  async getDailySummary() {
    try {
      const response = await fetch(`${BASE_URL}/nutrition/daily-summary`)
      return response.json()
    } catch (error) {
      // Fallback to local data
      return loadFallbackData()
    }
  },

  async logMeal(mealData) {
    // Immediate localStorage update + API sync
    updateLocalStorage(mealData)
    return fetch(`${BASE_URL}/nutrition/log-meal`, {
      method: 'POST',
      body: JSON.stringify(mealData)
    })
  }
}
```

#### **WebSocket Real-time Communication**
```javascript
// BLE sensor data streaming
const websocketClient = {
  connect() {
    this.ws = new WebSocket(`ws://${hostname}:3001`)
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      switch(data.type) {
        case 'ble-device':
          updateDeviceList(data.device)
          break
        case 'ble-scan-status':
          updateScanStatus(data.scanning)
          break
      }
    }
  }
}
```

### **Data Models**

#### **Health Vitals Model**
```typescript
interface VitalSign {
  icon: string           // Emoji representation
  label: string          // "BLOOD PRESSURE", "HEART RATE"
  value: string          // "120/80", "72"
  unit: string           // "mmHg", "bpm"
  status: 'Normal' | 'Warning' | 'Critical' | 'Stable'
  updated: string        // "2 min ago"
}

// Static data with exact values matching medical device
const vitals: VitalSign[] = [
  { icon: "❤️", label: "BLOOD PRESSURE", value: "120/80", unit: "mmHg", status: "Normal", updated: "2 min ago" },
  { icon: "💓", label: "HEART RATE", value: "72", unit: "bpm", status: "Normal", updated: "2 min ago" },
  { icon: "🫁", label: "OXYGEN SAT", value: "98", unit: "%", status: "Normal", updated: "3 min ago" },
  { icon: "🌡️", label: "TEMPERATURE", value: "98.6", unit: "°F", status: "Normal", updated: "5 min ago" }
]
```

#### **Nutrition Tracking Model**
```typescript
interface NutritionSummary {
  dailySummary: {
    calories: { consumed: number, target: number, percentage: number }
    protein: { consumed: number, target: number, percentage: number }
    carbs: { consumed: number, target: number, percentage: number }
    fat: { consumed: number, target: number, percentage: number }
  }
  todaysMeals: Meal[]
}

interface Meal {
  id: number
  date: string           // "2025-11-19"
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  time: string           // "08:15"
  foods: Food[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  totalSodium: number
  createdAt: string      // ISO timestamp
}
```

#### **Hydration Tracking Model**
```typescript
interface HydrationData {
  sipCounts: {
    sips: number         // Regular sips (0.5 fl oz each)
    bigSips: number      // Big sips (1.0 fl oz each)
  }
  todayIntake: number    // Total fl oz consumed
  lastSipTime: string | null  // ISO timestamp
  date: string           // "2025-11-19"
}

// Constants
const SIP_SIZE = 0.5      // Regular sip in fl oz
const BIG_SIP_SIZE = 1.0  // Big sip in fl oz
const DAILY_TARGET = 64   // Target daily intake in fl oz
```

#### **Fitness Tracking Model**
```typescript
interface FitnessData {
  dailyStats: {
    workouts: number
    calories: number
    minutes: number
    recentWorkouts: WorkoutEntry[]
  }
  exercises: Exercise[]
  workoutVideos: WorkoutVideo[]
}

interface WorkoutEntry {
  type: string           // Exercise category
  exercise: string       // Exercise name
  duration: number       // Minutes
  caloriesBurned: number
  videoUrl?: string      // YouTube video URL
  timestamp: string      // ISO timestamp
}

interface WorkoutVideo {
  id: string            // YouTube video ID
  title: string
  channel: string
  duration: string      // "20:11"
  category: 'strength' | 'cardio' | 'hiit' | 'yoga'
}
```

#### **Appointment Model**
```typescript
interface Appointment {
  id: number
  title: string         // "Doctor Appointment - Dr. Smith"
  time: string          // "10:00 AM"
  type: 'medical' | 'personal' | 'work'
  location?: string     // "Harmony Medical Center"
  notes?: string        // Additional details
  color: string         // CSS color for visual coding
}
```

---

## Feature Analysis

### **1. Health Vitals (❤️)**
```
Purpose: Real-time health monitoring dashboard
Data Source: Static data (designed for future IoT sensor integration)
Key Features:
  ✓ 4 vital signs + weight tracking
  ✓ Status indicators with color coding
  ✓ "All Systems Normal" status header
  ✓ Timestamp tracking for each metric
Mobile Considerations:
  → Large, readable vital display perfect for mobile
  → Status colors translate well to mobile UI
  → Consider Apple Health/Google Fit integration
```

### **2. Nutrition Tracking (🍎)**
```
Purpose: Macro nutrient tracking with meal logging
Data Source: REST API with localStorage fallback
Key Features:
  ✓ Daily macro progress (calories, protein, carbs, fat)
  ✓ Meal logging with food database search
  ✓ Real-time progress bars and percentages
  ✓ Quick meal suggestions and meal history
Mobile Considerations:
  → Food search/barcode scanning ideal for mobile
  → Camera integration for meal photos
  → Nutrition database API integration
```

### **3. Fitness Management (💪)**
```
Purpose: Workout tracking with video integration
Data Source: Local exercise database + YouTube videos
Key Features:
  ✓ Exercise search and logging with duration picker
  ✓ YouTube workout video integration with embeddability validation
  ✓ Daily workout statistics and progress tracking
  ✓ Calorie burn estimation
Mobile Considerations:
  → Video playback perfect for mobile screens
  → Timer/stopwatch integration for workouts
  → Apple Fitness/Google Fit integration potential
```

### **4. Hydration Tracking (💧)**
```
Purpose: Sip-based water intake monitoring
Data Source: localStorage with daily cycling
Key Features:
  ✓ Dual sip buttons (0.5 fl oz regular, 1.0 fl oz big)
  ✓ Real-time progress toward 64 fl oz daily goal
  ✓ Sip analytics and timestamp tracking
  ✓ IoT-ready for physical button integration
Mobile Considerations:
  → Perfect for mobile quick-action widgets
  → Apple Watch/WearOS integration potential
  → Push notifications for hydration reminders
```

### **5. Medication Adherence (💊)**
```
Purpose: Daily medication checklist and tracking
Data Source: localStorage with daily medication schedules
Key Features:
  ✓ Time-based medication reminders with overdue indicators
  ✓ Medication type categorization (prescription, vitamin, supplement)
  ✓ Progress tracking with completion percentages
  ✓ Daily reset with persistent schedules
Mobile Considerations:
  → Push notifications essential for medication reminders
  → Integration with prescription management apps
  → Camera for pill identification
```

### **6. Appointment Management (📅)**
```
Purpose: Daily schedule and appointment tracking
Data Source: Static JSON data (designed for calendar integration)
Key Features:
  ✓ Daily appointment list with time/location
  ✓ Color-coded appointment types
  ✓ Quick appointment details view
Mobile Considerations:
  → Calendar app integration (iOS Calendar, Google Calendar)
  → Location integration with Maps
  → Push notifications for upcoming appointments
```

### **7. BLE Sensor Discovery (⚙️)**
```
Purpose: Bluetooth device discovery and monitoring
Data Source: WebSocket real-time from Noble.js backend
Key Features:
  ✓ Real-time BLE device scanning (30-second intervals)
  ✓ Device information display (name, address, RSSI)
  ✓ Connection status and scan management
  ✓ Hidden by default (setup/configuration panel)
Mobile Considerations:
  → Mobile Bluetooth APIs (iOS Core Bluetooth, Android Bluetooth LE)
  → Background scanning with permission management
  → Device pairing and connection management
```

### **8. Video Chat (📹)**
```
Purpose: WebRTC peer-to-peer video communication
Data Source: WebRTC signaling server (port 8080)
Key Features:
  ✓ Room-based video chat (2 participants max)
  ✓ HTTPS support with SSL certificates
  ✓ Integrated with panel layout system
Mobile Considerations:
  → Native mobile camera/microphone access
  → Background video call support
  → Integration with mobile video calling patterns
```

---

## Mobile Adaptation Strategy

### **Layout Transformation**

#### **Current Web Layout → Mobile Layout**
```
Web: Panel-based dashboard with sidebars
Mobile: Bottom tab navigation + stack-based screens

Web Layout:
[Header with all panel icons]
[Single maximized panel + collapsed sidebars]

Mobile Layout:
[Screen-specific header]
[Full-screen panel content]
[Bottom tab bar with 5-6 main tabs]
```

#### **Recommended Mobile Navigation Structure**
```
Tab 1: Dashboard (Overview of all panels)
Tab 2: Health (Vitals + quick stats)
Tab 3: Nutrition (Meal logging + progress)
Tab 4: Fitness (Workouts + videos)
Tab 5: More (Hydration, Medication, Appointments, Settings)

Additional Screens:
- Video Chat (full-screen modal)
- BLE Setup (settings screen)
- Detailed views for each module
```

### **State Management Migration**

#### **Current → Mobile State Management**
```javascript
// Current: Single-component state
const [panelState, setPanelState] = useState({...})

// Mobile: Consider state management library
// Redux Toolkit or Zustand for:
// - Cross-screen state sharing
// - Offline state persistence
// - Background sync management
```

#### **Mobile-Specific State Requirements**
```javascript
// App State
interface MobileAppState {
  // Navigation
  activeTab: 'dashboard' | 'health' | 'nutrition' | 'fitness' | 'more'
  navigationStack: Screen[]

  // Connectivity
  isOnline: boolean
  lastSync: string

  // Permissions
  bluetoothPermission: 'granted' | 'denied' | 'not-determined'
  cameraPermission: 'granted' | 'denied' | 'not-determined'
  notificationPermission: 'granted' | 'denied' | 'not-determined'

  // Background Data
  pendingSyncData: SyncData[]
  backgroundRefreshEnabled: boolean
}
```

### **Data Persistence Migration**

#### **Enhanced Mobile Storage Strategy**
```javascript
// Current: localStorage only
// Mobile: Multi-layer storage strategy

// Layer 1: In-memory state (React/Redux)
// Layer 2: Async storage (React Native AsyncStorage / SQLite)
// Layer 3: Cloud sync (optional user data backup)

const mobileStorageManager = {
  // Immediate local storage for real-time updates
  async setLocal(key: string, data: any) {
    await AsyncStorage.setItem(key, JSON.stringify(data))
  },

  // Background sync for cross-device consistency
  async syncToCloud(data: UserData) {
    if (isOnline && userLoggedIn) {
      await cloudApi.syncUserData(data)
    } else {
      // Queue for later sync
      addToSyncQueue(data)
    }
  },

  // Offline-first data loading
  async loadData(key: string) {
    // Try local first, then cloud sync
    const local = await AsyncStorage.getItem(key)
    if (local) return JSON.parse(local)

    if (isOnline) {
      const cloud = await cloudApi.getUserData(key)
      if (cloud) {
        await this.setLocal(key, cloud) // Cache locally
        return cloud
      }
    }

    return null
  }
}
```

### **API Integration Migration**

#### **Mobile-Optimized API Client**
```javascript
// Enhanced API client with mobile considerations
const mobileApiClient = {
  // Retry logic for poor mobile connectivity
  async request(endpoint, options = {}) {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const response = await fetch(endpoint, {
          ...options,
          timeout: 10000, // 10s timeout for mobile
        })

        if (response.ok) return response.json()
        throw new Error(`HTTP ${response.status}`)

      } catch (error) {
        attempt++
        if (attempt === maxRetries) throw error
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  },

  // Background sync for offline actions
  async queueAction(action) {
    await AsyncStorage.setItem(`pending_${Date.now()}`, JSON.stringify(action))
    if (isOnline) this.processPendingActions()
  },

  async processPendingActions() {
    const pendingKeys = await AsyncStorage.getAllKeys()
    const pendingActions = pendingKeys
      .filter(key => key.startsWith('pending_'))
      .map(key => AsyncStorage.getItem(key))

    for (const action of pendingActions) {
      try {
        await this.request(action.endpoint, action.options)
        await AsyncStorage.removeItem(action.key)
      } catch (error) {
        console.log('Failed to sync action:', error)
      }
    }
  }
}
```

### **Platform-Specific Features**

#### **iOS Integration Opportunities**
```javascript
// HealthKit Integration
const healthKitManager = {
  async requestPermissions() {
    const permissions = [
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierBloodPressureSystolic',
      'HKQuantityTypeIdentifierDietaryEnergyConsumed',
      'HKQuantityTypeIdentifierDietaryWater'
    ]
    return await HealthKit.requestAuthorization(permissions)
  },

  async syncVitals(vitals) {
    await HealthKit.saveQuantitySample({
      type: 'HKQuantityTypeIdentifierHeartRate',
      value: vitals.heartRate,
      unit: 'count/min',
      date: new Date()
    })
  },

  async syncHydration(intake) {
    await HealthKit.saveQuantitySample({
      type: 'HKQuantityTypeIdentifierDietaryWater',
      value: intake,
      unit: 'fl_oz_us',
      date: new Date()
    })
  }
}

// Push Notifications
const notificationManager = {
  async scheduleMedicationReminder(medication) {
    const identifier = `med_${medication.id}`
    await PushNotificationIOS.scheduleLocalNotification({
      fireDate: medication.time,
      alertTitle: 'Medication Reminder',
      alertBody: `Time to take ${medication.name}`,
      repeatInterval: 'day',
      userInfo: { type: 'medication', id: medication.id }
    })
  },

  async scheduleHydrationReminder() {
    await PushNotificationIOS.scheduleLocalNotification({
      fireDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      alertTitle: 'Stay Hydrated! 💧',
      alertBody: 'Remember to track your water intake',
      repeatInterval: 'hour',
      userInfo: { type: 'hydration' }
    })
  }
}
```

#### **Android Integration Opportunities**
```javascript
// Google Fit Integration
const googleFitManager = {
  async syncNutrition(meals) {
    const nutritionData = meals.map(meal => ({
      dataSourceId: 'nutrition_app',
      point: [{
        startTimeNanos: Date.now() * 1000000,
        endTimeNanos: Date.now() * 1000000,
        value: [{ fpVal: meal.totalCalories }]
      }]
    }))

    await GoogleFit.insertData([{
      dataTypeName: 'com.google.calories.consumed',
      dataSourceId: 'nutrition_app',
      points: nutritionData
    }])
  }
}

// Background Tasks
const backgroundTaskManager = {
  async registerBLEScanning() {
    await BackgroundJob.register({
      name: 'BLE_SCAN',
      task: async () => {
        const devices = await BluetoothManager.scan(10000) // 10s scan
        await AsyncStorage.setItem('ble_devices', JSON.stringify(devices))
      },
      period: 300000 // Every 5 minutes
    })
  }
}
```

---

## Technical Specifications

### **Performance Requirements**
```
Target Platforms: iOS 14+, Android 8+ (API 26+)
Screen Sizes: 4.7" - 6.7" (375x667 to 428x926)
Performance: 60 FPS smooth scrolling, <3s app launch
Memory: <150MB baseline, <500MB peak usage
Battery: Background tasks <5% battery drain per hour
Network: Offline-first, works with poor connectivity
```

### **Development Recommendations**

#### **Technology Stack**
```
Framework: React Native 0.73+ (or Flutter 3.16+)
State Management: Redux Toolkit + RTK Query
Navigation: React Navigation 6
Storage: @react-native-async-storage/async-storage + SQLite
Real-time: Socket.io client for WebSocket compatibility
Video: react-native-webrtc for video calling
Bluetooth: react-native-ble-plx for BLE integration
Health: react-native-health (iOS) / Google Fit SDK (Android)
Notifications: @react-native-firebase/messaging
```

#### **Architecture Pattern**
```
Feature-Based Architecture:
src/
├── features/
│   ├── health/          # Vitals monitoring
│   ├── nutrition/       # Meal tracking
│   ├── fitness/         # Workout management
│   ├── hydration/       # Water intake
│   ├── medication/      # Adherence tracking
│   ├── appointments/    # Schedule
│   ├── sensors/         # BLE devices
│   └── video/           # Video chat
├── shared/
│   ├── api/             # API clients
│   ├── storage/         # Data persistence
│   ├── navigation/      # App navigation
│   ├── notifications/   # Push notifications
│   └── components/      # Reusable UI components
```

#### **Data Migration Strategy**
```
Phase 1: Direct Port
- Port localStorage patterns to AsyncStorage
- Maintain exact same data structures
- Replicate API integration patterns

Phase 2: Mobile Enhancement
- Add offline-first capabilities
- Implement background sync
- Add platform-specific integrations

Phase 3: Advanced Features
- Add cloud sync for cross-device data
- Implement advanced health platform integrations
- Add social features and data sharing
```

### **Development Timeline Estimate**
```
Phase 1 - Core App (8-10 weeks):
  Week 1-2: Project setup, navigation, basic layout
  Week 3-4: Health vitals + nutrition components
  Week 5-6: Fitness + hydration components
  Week 7-8: Medication + appointments components
  Week 9-10: Testing, polish, and basic integrations

Phase 2 - Advanced Features (6-8 weeks):
  Week 11-12: BLE integration + sensor management
  Week 13-14: Video chat integration
  Week 15-16: Platform-specific health integrations
  Week 17-18: Push notifications + background tasks

Phase 3 - Production Ready (4-6 weeks):
  Week 19-20: Performance optimization + testing
  Week 21-22: App store preparation + deployment
  Week 23-24: User feedback integration + bug fixes
```

---

## Conclusion

The Betti Smart Mirror Hub web application provides an excellent foundation for mobile app development. Its component-based architecture, clear data models, and IoT-ready integrations translate well to mobile platforms.

**Key Strengths for Mobile Adaptation:**
- ✅ Well-structured component hierarchy
- ✅ Clear separation of concerns
- ✅ Robust local storage patterns
- ✅ IoT integration readiness
- ✅ Real-time communication capabilities

**Mobile Enhancement Opportunities:**
- 📱 Native platform integrations (HealthKit, Google Fit)
- 🔔 Rich push notification system
- 🔄 Background data synchronization
- 📡 Enhanced offline capabilities
- ⌚ Wearable device integration

The sip-based hydration tracking and IoT sensor integration features are particularly well-suited for mobile deployment, where quick interactions and sensor connectivity are key user experience differentiators.