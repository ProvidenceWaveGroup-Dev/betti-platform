import React from 'react'
import Header from './components/Header'
import Appointments from './components/Appointments'
import Vitals from './components/Vitals'
import BLEDevices from './components/BLEDevices'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="content-grid">
          <div className="grid-left">
            <Appointments />
          </div>
          <div className="grid-right">
            <Vitals />
          </div>
        </div>
        <BLEDevices />
      </main>
    </div>
  )
}

export default App
