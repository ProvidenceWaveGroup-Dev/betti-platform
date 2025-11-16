import React, { useState } from 'react'
import Header from './components/Header'
import Appointments from './components/Appointments'
import Vitals from './components/Vitals'
import BLEDevices from './components/BLEDevices'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState('home')
  const [panelState, setPanelState] = useState({
    health: 'expanded',
    appointments: 'expanded',
    sensors: 'collapsed'
  })

  const handleNavigate = (view) => {
    setActiveView(view)

    // Toggle panels between expanded and collapsed
    if (view === 'health') {
      setPanelState(prev => ({
        ...prev,
        health: prev.health === 'expanded' ? 'collapsed' : 'expanded'
      }))
    } else if (view === 'appointments') {
      setPanelState(prev => ({
        ...prev,
        appointments: prev.appointments === 'expanded' ? 'collapsed' : 'expanded'
      }))
    } else if (view === 'sensors') {
      setPanelState(prev => ({
        ...prev,
        sensors: prev.sensors === 'expanded' ? 'collapsed' : 'expanded'
      }))
    }

    console.log('Navigated to:', view, 'State:', panelState)
  }

  return (
    <div className="app">
      <Header onNavigate={handleNavigate} activeView={activeView} />
      <main className="main-content">
        <div className="content-grid">
          <div className="grid-left">
            <Appointments isCollapsed={panelState.appointments === 'collapsed'} />
          </div>
          <div className="grid-right">
            <Vitals isCollapsed={panelState.health === 'collapsed'} />
          </div>
        </div>
        <BLEDevices isCollapsed={panelState.sensors === 'collapsed'} />
      </main>
    </div>
  )
}

export default App
