/**
 * Vital Signs Status Calculation Utility
 *
 * Provides consistent status calculation across the frontend.
 * These thresholds match the backend VitalsRepo.determineStatus()
 */

/**
 * Determine status based on vital type and values
 *
 * @param {string} vitalType - Type of vital sign
 * @param {number} valuePrimary - Primary value (e.g., systolic BP, heart rate)
 * @param {number|null} valueSecondary - Secondary value (e.g., diastolic BP)
 * @returns {string} Status: 'normal', 'elevated', 'high', 'low', 'critical', 'fever'
 */
export function determineVitalStatus(vitalType, valuePrimary, valueSecondary = null) {
  switch (vitalType) {
    case 'blood_pressure': {
      const systolic = valuePrimary
      const diastolic = valueSecondary || 0

      // Critical takes precedence
      if (systolic > 180 || diastolic > 120) return 'critical'

      // Low blood pressure
      if (systolic < 90 || diastolic < 60) return 'low'

      // High Stage 2 (Hypertension)
      if (systolic >= 140 || diastolic >= 90) return 'high'

      // High Stage 1 or Elevated
      if (systolic >= 130 || diastolic >= 80) return 'elevated'

      // Elevated (systolic only, diastolic normal)
      if (systolic >= 120 && systolic < 130 && diastolic < 80) return 'elevated'

      // Normal: 90-119 systolic AND 60-79 diastolic
      return 'normal'
    }

    case 'heart_rate':
      if (valuePrimary < 40 || valuePrimary > 150) return 'critical'
      if (valuePrimary < 60) return 'low'
      if (valuePrimary > 100) return 'high'
      return 'normal'

    case 'spo2':
      if (valuePrimary < 90) return 'critical'
      if (valuePrimary < 95) return 'low'
      return 'normal'

    case 'temperature':
      // Fahrenheit thresholds
      if (valuePrimary < 95.0 || valuePrimary > 103.0) return 'critical'
      if (valuePrimary > 99.0) return 'fever'  // 99.1-103.0
      if (valuePrimary < 97.0) return 'low'    // 95.0-96.9
      return 'normal'  // 97.0-99.0

    case 'weight':
      return 'normal'

    case 'glucose':
      // mg/dL, fasting levels
      if (valuePrimary < 54 || valuePrimary > 400) return 'critical'
      if (valuePrimary < 70) return 'low'
      if (valuePrimary > 126) return 'high'
      if (valuePrimary >= 100 && valuePrimary <= 126) return 'elevated'
      return 'normal'

    default:
      return 'normal'
  }
}

/**
 * Get display configuration for a status
 *
 * @param {string} status - Status string from determineVitalStatus
 * @returns {object} { color, backgroundColor, label, severity }
 */
export function getStatusDisplay(status) {
  const statusMap = {
    normal: {
      color: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      label: 'Normal',
      severity: 0
    },
    elevated: {
      color: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      label: 'Elevated',
      severity: 1
    },
    low: {
      color: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      label: 'Low',
      severity: 1
    },
    high: {
      color: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      label: 'High',
      severity: 2
    },
    fever: {
      color: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      label: 'Fever',
      severity: 2
    },
    critical: {
      color: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.15)',
      label: 'Critical',
      severity: 3
    }
  }

  return statusMap[status?.toLowerCase()] || statusMap.normal
}

/**
 * Get the CSS class name for a status
 *
 * @param {string} status - Status string
 * @returns {string} CSS class name
 */
export function getStatusClass(status) {
  const classMap = {
    normal: 'status-normal',
    elevated: 'status-warning',
    low: 'status-warning',
    high: 'status-critical',
    fever: 'status-critical',
    critical: 'status-critical'
  }
  return classMap[status?.toLowerCase()] || 'status-normal'
}

/**
 * Calculate overall health status from multiple vitals
 *
 * @param {Array} vitals - Array of vital objects with status property
 * @returns {object} { text, class, severity }
 */
export function getOverallHealthStatus(vitals) {
  if (!vitals || vitals.length === 0) {
    return { text: 'No Data', class: 'status-unknown', severity: -1 }
  }

  const hasCritical = vitals.some(v => v.status?.toLowerCase() === 'critical')
  const hasHigh = vitals.some(v => ['high', 'fever'].includes(v.status?.toLowerCase()))
  const hasWarning = vitals.some(v => ['low', 'elevated'].includes(v.status?.toLowerCase()))

  if (hasCritical) {
    return { text: 'Critical Alert', class: 'status-critical', severity: 3 }
  }
  if (hasHigh) {
    return { text: 'Attention Required', class: 'status-critical', severity: 2 }
  }
  if (hasWarning) {
    return { text: 'Needs Monitoring', class: 'status-warning', severity: 1 }
  }

  return { text: 'All Systems Normal', class: 'status-normal', severity: 0 }
}

/**
 * Vital type display configuration
 */
export const VITAL_DISPLAY_CONFIG = {
  blood_pressure: { icon: '❤️', label: 'BLOOD PRESSURE', unit: 'mmHg' },
  heart_rate: { icon: '💓', label: 'HEART RATE', unit: 'bpm' },
  spo2: { icon: '🫁', label: 'OXYGEN SAT', unit: '%' },
  temperature: { icon: '🌡️', label: 'TEMPERATURE', unit: '°F' },
  weight: { icon: '⚖️', label: 'WEIGHT', unit: 'lbs' },
  glucose: { icon: '🩸', label: 'BLOOD GLUCOSE', unit: 'mg/dL' }
}

/**
 * Get display config for a vital type
 *
 * @param {string} vitalType - Type of vital
 * @returns {object} { icon, label, unit }
 */
export function getVitalDisplayConfig(vitalType) {
  return VITAL_DISPLAY_CONFIG[vitalType] || { icon: '📊', label: vitalType?.toUpperCase(), unit: '' }
}
