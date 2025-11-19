/**
 * Comprehensive device detection utility
 * Detects mobile devices, tablets, and desktops based on multiple factors
 */

export const detectDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || ''
  const platform = navigator.platform || ''

  // Touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // Screen dimensions
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const devicePixelRatio = window.devicePixelRatio || 1

  // Mobile device patterns (comprehensive list)
  const mobilePatterns = [
    // Android devices
    /Android/i,
    /Mobile.*Android/i,

    // iOS devices
    /iPhone/i,
    /iPod/i,
    /iPad/i, // iPad can be considered mobile for our purposes

    // Windows Phone
    /Windows Phone/i,
    /IEMobile/i,
    /WPDesktop/i,

    // BlackBerry
    /BlackBerry/i,
    /BB10/i,

    // Other mobile devices
    /webOS/i,
    /Opera Mini/i,
    /Opera Mobi/i,
    /Mobile Safari/i,
    /Mobile/i,
    /CriOS/i, // Chrome on iOS
    /FxiOS/i, // Firefox on iOS

    // Specific devices
    /Pixel/i,
    /Galaxy/i,
    /Nexus/i,
    /OnePlus/i,
    /Xiaomi/i,
    /Huawei/i,
    /Nokia/i
  ]

  // Desktop patterns
  const desktopPatterns = [
    /Windows NT/i,
    /Macintosh/i,
    /Mac OS X/i,
    /Linux/i,
    /X11/i,
    /CrOS/i // Chrome OS
  ]

  // Check if user agent matches mobile patterns
  const isMobileUserAgent = mobilePatterns.some(pattern => pattern.test(userAgent))

  // Check if user agent matches desktop patterns
  const isDesktopUserAgent = desktopPatterns.some(pattern => pattern.test(userAgent))

  // Additional mobile indicators
  const hasMobileKeywords = /Mobile|mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)

  // Screen size analysis (accounting for device pixel ratio)
  const effectiveScreenWidth = Math.max(screenWidth / devicePixelRatio, windowWidth)
  const effectiveScreenHeight = Math.max(screenHeight / devicePixelRatio, windowHeight)

  // Mobile screen characteristics
  const hasSmallScreen = effectiveScreenWidth < 768 || effectiveScreenHeight < 1024
  const hasPhoneAspectRatio = (effectiveScreenHeight / effectiveScreenWidth) > 1.5

  // Final mobile detection logic
  let isMobile = false
  let deviceType = 'unknown'
  let confidence = 0

  if (isMobileUserAgent) {
    isMobile = true
    deviceType = 'mobile'
    confidence = 95
  } else if (isTouchDevice && hasSmallScreen) {
    isMobile = true
    deviceType = 'mobile'
    confidence = 85
  } else if (hasMobileKeywords) {
    isMobile = true
    deviceType = 'mobile'
    confidence = 80
  } else if (isDesktopUserAgent) {
    isMobile = false
    deviceType = 'desktop'
    confidence = 90
  } else {
    // Fallback to screen size
    isMobile = effectiveScreenWidth < 1200
    deviceType = isMobile ? 'mobile' : 'desktop'
    confidence = 60
  }

  // Special handling for tablets (treat as mobile for our app)
  if (/iPad/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    deviceType = 'tablet'
    isMobile = true // Treat tablets as mobile for Betti
    confidence = 85
  }

  const detectionResult = {
    isMobile,
    deviceType,
    confidence,
    details: {
      userAgent,
      platform,
      isTouchDevice,
      screenDimensions: {
        width: screenWidth,
        height: screenHeight,
        effectiveWidth: effectiveScreenWidth,
        effectiveHeight: effectiveScreenHeight
      },
      windowDimensions: {
        width: windowWidth,
        height: windowHeight
      },
      devicePixelRatio,
      indicators: {
        mobileUserAgent: isMobileUserAgent,
        desktopUserAgent: isDesktopUserAgent,
        hasMobileKeywords,
        hasSmallScreen,
        hasPhoneAspectRatio,
        isTouchDevice
      }
    }
  }

  // Log comprehensive detection info
  console.log('🔍 DEVICE DETECTION RESULT:', detectionResult)

  return detectionResult
}

// Specific device detection helpers
export const isPixelDevice = () => /Pixel/i.test(navigator.userAgent)
export const isIPhone = () => /iPhone/i.test(navigator.userAgent)
export const isIPad = () => /iPad/i.test(navigator.userAgent)
export const isAndroid = () => /Android/i.test(navigator.userAgent)
export const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

// Force mobile mode for testing (can be controlled via localStorage)
export const forceMobileMode = () => {
  return localStorage.getItem('betti_force_mobile') === 'true'
}

// Set force mobile mode
export const setForceMobileMode = (enabled) => {
  if (enabled) {
    localStorage.setItem('betti_force_mobile', 'true')
  } else {
    localStorage.removeItem('betti_force_mobile')
  }
  window.location.reload()
}