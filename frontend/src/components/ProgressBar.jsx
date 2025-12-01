import { useState, useEffect } from 'react'

const ProgressBar = ({
  value = 0,
  max = 100,
  min = 0,
  color = '#4a9eff',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  height = 8,
  borderRadius = 4,
  animated = true,
  striped = false,
  showLabel = false,
  label = '',
  showPercentage = false,
  duration = 800,
  className = '',
  style = {}
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Calculate percentage
  const percentage = Math.min(Math.max((value - min) / (max - min) * 100, 0), 100)

  // Animate the progress bar
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setIsVisible(true)
        setAnimatedValue(percentage)
      }, 100)

      return () => clearTimeout(timer)
    } else {
      setAnimatedValue(percentage)
      setIsVisible(true)
    }
  }, [percentage, animated])

  // Generate gradient for striped effect
  const stripedBackground = striped
    ? `repeating-linear-gradient(
        45deg,
        ${color},
        ${color} 10px,
        rgba(255, 255, 255, 0.1) 10px,
        rgba(255, 255, 255, 0.1) 20px
      )`
    : color

  const progressStyle = {
    width: `${animatedValue}%`,
    height: `${height}px`,
    background: stripedBackground,
    borderRadius: `${borderRadius}px`,
    transition: animated ? `width ${duration}ms ease-out` : 'none',
    transform: isVisible ? 'scaleX(1)' : 'scaleX(0)',
    transformOrigin: 'left',
    ...style
  }

  const containerStyle = {
    width: '100%',
    height: `${height}px`,
    backgroundColor,
    borderRadius: `${borderRadius}px`,
    overflow: 'hidden',
    position: 'relative'
  }

  return (
    <div className={`progress-bar-container ${className}`}>
      {(showLabel || label) && (
        <div className="progress-label" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <span>{label}</span>
          {showPercentage && (
            <span style={{ fontWeight: '600' }}>
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div style={containerStyle}>
        <div className="progress-fill" style={progressStyle} />

        {/* Animated shine effect */}
        {animated && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
              transform: 'translateX(-100%)',
              animation: animatedValue > 0 ? 'shine 2s ease-in-out 0.5s' : 'none'
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}

// Specialized progress bar variants
export const HealthProgressBar = ({
  value,
  max = 100,
  type = 'normal',
  label,
  ...props
}) => {
  const getHealthColor = (percentage, type) => {
    switch (type) {
      case 'heart-rate':
        if (percentage >= 60 && percentage <= 90) return '#22c55e'
        if (percentage > 90) return '#ef4444'
        return '#f59e0b'

      case 'blood-pressure':
        if (percentage <= 80) return '#22c55e'
        if (percentage <= 90) return '#f59e0b'
        return '#ef4444'

      case 'medication':
        if (percentage >= 100) return '#22c55e'
        if (percentage >= 75) return '#f59e0b'
        return '#ef4444'

      case 'hydration':
        if (percentage >= 80) return '#06b6d4'
        if (percentage >= 50) return '#f59e0b'
        return '#ef4444'

      default:
        return '#4a9eff'
    }
  }

  const percentage = (value / max) * 100
  const color = getHealthColor(percentage, type)

  return (
    <ProgressBar
      value={value}
      max={max}
      color={color}
      label={label}
      showPercentage={true}
      animated={true}
      {...props}
    />
  )
}

// Circular progress bar variant
export const CircularProgressBar = ({
  value = 0,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#4a9eff',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  showLabel = false,
  label = '',
  showPercentage = true,
  animated = true,
  className = '',
  style = {}
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedValue(percentage)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setAnimatedValue(percentage)
    }
  }, [percentage, animated])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference

  return (
    <div
      className={`circular-progress-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...style
      }}
    >
      <div style={{ position: 'relative' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: animated ? 'stroke-dashoffset 1s ease-out' : 'none'
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}
        >
          {showPercentage && (
            <div style={{ fontSize: `${size * 0.2}px`, fontWeight: 'bold' }}>
              {Math.round(animatedValue)}%
            </div>
          )}
        </div>
      </div>

      {(showLabel || label) && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '12px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

export default ProgressBar