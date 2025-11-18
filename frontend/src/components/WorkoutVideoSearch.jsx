import React, { useState, useEffect } from 'react'
import './WorkoutVideoSearch.css'

function WorkoutVideoSearch({ isOpen, onClose, workoutType = '' }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState(null)

  // Popular workout categories for quick access
  const workoutCategories = [
    { name: 'Strength Training', icon: '💪', searchTerms: ['strength training beginner', 'weight lifting workout'] },
    { name: 'HIIT', icon: '⚡', searchTerms: ['HIIT workout', 'high intensity interval training'] },
    { name: 'Yoga', icon: '🧘', searchTerms: ['yoga for beginners', 'morning yoga flow'] },
    { name: 'Cardio', icon: '🏃', searchTerms: ['cardio workout', 'fat burning workout'] },
    { name: 'Core', icon: '🎯', searchTerms: ['ab workout', 'core strengthening'] },
    { name: 'Pilates', icon: '🤸', searchTerms: ['pilates workout', 'pilates for beginners'] },
    { name: 'Dance', icon: '💃', searchTerms: ['dance workout', 'zumba fitness'] },
    { name: 'Stretching', icon: '🤲', searchTerms: ['stretching routine', 'flexibility workout'] }
  ]

  // Simulated video data (in production, this would come from YouTube API)
  const mockVideoData = {
    'strength training': [
      {
        id: 'str1',
        title: 'Full Body Strength Training - 45 Minutes',
        channel: 'FitnessBlender',
        duration: '45:30',
        views: '2.1M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Complete full body strength training workout for all levels'
      },
      {
        id: 'str2',
        title: 'Beginner Strength Training - No Equipment',
        channel: 'Calisthenic Movement',
        duration: '30:15',
        views: '1.5M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Perfect for beginners, no equipment needed'
      }
    ],
    'hiit': [
      {
        id: 'hiit1',
        title: '20-Minute HIIT Workout - Fat Burning',
        channel: 'Fitness Marshall',
        duration: '20:45',
        views: '3.2M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'High-intensity workout to burn calories fast'
      },
      {
        id: 'hiit2',
        title: 'Tabata HIIT - 15 Minutes',
        channel: 'HASfit',
        duration: '15:30',
        views: '890K views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Quick and effective Tabata-style HIIT workout'
      }
    ],
    'yoga': [
      {
        id: 'yoga1',
        title: 'Morning Yoga Flow - 30 Minutes',
        channel: 'Yoga with Adriene',
        duration: '30:20',
        views: '5.1M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Gentle morning yoga flow to energize your day'
      },
      {
        id: 'yoga2',
        title: 'Yoga for Beginners - Complete Practice',
        channel: 'DoYogaWithMe',
        duration: '45:10',
        views: '2.8M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Perfect introduction to yoga for complete beginners'
      }
    ],
    'cardio': [
      {
        id: 'cardio1',
        title: 'Cardio Dance Workout - 30 Minutes',
        channel: 'POPSUGAR Fitness',
        duration: '30:45',
        views: '4.3M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Fun dance cardio to get your heart pumping'
      },
      {
        id: 'cardio2',
        title: 'Low Impact Cardio - Joint Friendly',
        channel: 'SeniorFitness',
        duration: '25:15',
        views: '1.2M views',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        description: 'Cardio workout that\'s easy on your joints'
      }
    ]
  }

  useEffect(() => {
    if (workoutType) {
      setSearchQuery(workoutType.toLowerCase())
      handleSearch(workoutType.toLowerCase())
    }
  }, [workoutType])

  const handleSearch = (query = searchQuery) => {
    if (!query.trim()) return

    setLoading(true)

    // Simulate API delay
    setTimeout(() => {
      const normalizedQuery = query.toLowerCase()
      let results = []

      // Search through mock data
      Object.keys(mockVideoData).forEach(category => {
        if (normalizedQuery.includes(category) || category.includes(normalizedQuery)) {
          results = [...results, ...mockVideoData[category]]
        }
      })

      // If no specific category matches, show some general results
      if (results.length === 0) {
        results = [
          ...mockVideoData['strength training'].slice(0, 1),
          ...mockVideoData['cardio'].slice(0, 1),
          ...mockVideoData['hiit'].slice(0, 1)
        ]
      }

      setVideos(results)
      setLoading(false)
    }, 800)
  }

  const handleCategoryClick = (category) => {
    const searchTerm = category.searchTerms[0]
    setSearchQuery(searchTerm)
    handleSearch(searchTerm)
  }

  const handleVideoSelect = (video) => {
    setSelectedVideo(video)
  }

  const handleStartWorkout = (video) => {
    // In production, this would open the video in a player or redirect to YouTube
    window.open(`https://youtube.com/watch?v=${video.id}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay video-search-overlay">
      <div className="video-search-modal">
        <div className="modal-header">
          <h2>🎬 Workout Videos</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* Search Bar */}
          <div className="search-section">
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search workout videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="video-search-input"
              />
              <button
                className="search-button"
                onClick={() => handleSearch()}
                disabled={loading}
              >
                {loading ? '🔄' : '🔍'}
              </button>
            </div>

            {/* Popular Categories */}
            <div className="categories-section">
              <h3>Popular Categories</h3>
              <div className="categories-grid">
                {workoutCategories.map((category, index) => (
                  <button
                    key={index}
                    className="category-button"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Video Results */}
          {loading ? (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Searching for workout videos...</p>
            </div>
          ) : (
            <div className="videos-section">
              {videos.length > 0 ? (
                <>
                  <h3>Workout Videos ({videos.length} results)</h3>
                  <div className="videos-grid">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        className={`video-card ${selectedVideo?.id === video.id ? 'selected' : ''}`}
                        onClick={() => handleVideoSelect(video)}
                      >
                        <div className="video-thumbnail">
                          <div className="thumbnail-placeholder">
                            <span className="play-icon">▶️</span>
                          </div>
                          <span className="video-duration">{video.duration}</span>
                        </div>

                        <div className="video-info">
                          <h4 className="video-title">{video.title}</h4>
                          <p className="video-channel">{video.channel}</p>
                          <div className="video-meta">
                            <span className="video-views">{video.views}</span>
                          </div>
                          <p className="video-description">{video.description}</p>
                        </div>

                        <div className="video-actions">
                          <button
                            className="watch-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartWorkout(video)
                            }}
                          >
                            🎬 Watch Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                searchQuery && (
                  <div className="no-results">
                    <p>No videos found for "{searchQuery}"</p>
                    <p>Try searching for different workout types or browse popular categories above.</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Selected Video Details */}
          {selectedVideo && (
            <div className="selected-video-section">
              <h3>Selected Video</h3>
              <div className="selected-video-card">
                <div className="selected-video-info">
                  <h4>{selectedVideo.title}</h4>
                  <p>By {selectedVideo.channel} • {selectedVideo.duration} • {selectedVideo.views}</p>
                  <p className="selected-description">{selectedVideo.description}</p>
                </div>
                <div className="selected-video-actions">
                  <button
                    className="start-workout-button"
                    onClick={() => handleStartWorkout(selectedVideo)}
                  >
                    🎬 Start This Workout
                  </button>
                  <button
                    className="save-workout-button"
                    onClick={() => {
                      // TODO: Save to favorites/playlist
                      console.log('Saving workout to favorites:', selectedVideo.title)
                    }}
                  >
                    ⭐ Save to Favorites
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkoutVideoSearch