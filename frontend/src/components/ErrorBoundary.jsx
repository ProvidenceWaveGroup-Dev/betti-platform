import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: Math.random().toString(36).substr(2, 9)
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo)

    // Store error details
    this.setState({
      error,
      errorInfo,
      hasError: true
    })

    // Also log to localStorage for mobile debugging
    try {
      const errorDetails = {
        id: this.state.errorId,
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
      }

      const existingErrors = JSON.parse(localStorage.getItem('betti_errors') || '[]')
      existingErrors.push(errorDetails)
      localStorage.setItem('betti_errors', JSON.stringify(existingErrors.slice(-10))) // Keep last 10 errors
    } catch (storageError) {
      console.error('Failed to store error in localStorage:', storageError)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'linear-gradient(135deg, #ff0000, #cc0000)',
          color: 'white',
          padding: '20px',
          fontFamily: 'monospace',
          fontSize: '14px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          overflowY: 'auto'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>🚨 Error Boundary Triggered</h1>

          <div style={{ marginBottom: '20px' }}>
            <strong>Error ID:</strong> {this.state.errorId}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <strong>Time:</strong> {new Date().toLocaleString()}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <strong>User Agent:</strong> {navigator.userAgent.substring(0, 100)}...
          </div>

          <div style={{ marginBottom: '20px' }}>
            <strong>Window Size:</strong> {window.innerWidth}x{window.innerHeight}
          </div>

          {this.state.error && (
            <div style={{ marginBottom: '20px' }}>
              <strong>Error Message:</strong>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                marginTop: '10px',
                whiteSpace: 'pre-wrap',
                fontSize: '12px'
              }}>
                {this.state.error.message}
              </div>
            </div>
          )}

          {this.state.error && this.state.error.stack && (
            <div style={{ marginBottom: '20px' }}>
              <strong>Stack Trace:</strong>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                marginTop: '10px',
                whiteSpace: 'pre-wrap',
                fontSize: '10px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.error.stack}
              </div>
            </div>
          )}

          {this.state.errorInfo && this.state.errorInfo.componentStack && (
            <div style={{ marginBottom: '20px' }}>
              <strong>Component Stack:</strong>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '10px',
                borderRadius: '4px',
                marginTop: '10px',
                whiteSpace: 'pre-wrap',
                fontSize: '10px',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                {this.state.errorInfo.componentStack}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null })
              }}
              style={{
                background: 'white',
                color: 'red',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reset Error
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid white',
                padding: '12px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>

          <div style={{ marginTop: '20px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Error details saved to localStorage for debugging
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary