import React, { useState, useEffect } from 'react'
import nutritionApi from '../services/nutritionApi'
import './MealLogModal.css'

function MealLogModal({ isOpen, onClose, onMealLogged }) {
  const [currentStep, setCurrentStep] = useState('mealType') // mealType -> foodSearch -> confirm
  const [mealType, setMealType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFoods, setSelectedFoods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('mealType')
      setMealType('')
      setSearchQuery('')
      setSearchResults([])
      setSelectedFoods([])
      setError(null)
    }
  }, [isOpen])

  // Search foods with debounce - fallback to local database if API fails
  useEffect(() => {
    console.log('🔍 Food search useEffect triggered, searchQuery:', searchQuery)

    if (searchQuery.length >= 2) {
      console.log('🔍 Search query length >= 2, starting search...')
      const timeoutId = setTimeout(async () => {
        try {
          console.log('🔍 Setting loading to true')
          setLoading(true)

          // Try API first
          try {
            console.log('🔍 Attempting API search for:', searchQuery)
            const result = await nutritionApi.searchFoods(searchQuery, 10)
            console.log('🔍 API search result:', result)
            setSearchResults(result.data || [])
            console.log('🔍 API search successful, results set')
          } catch (apiError) {
            console.log('🔍 API unavailable, using local food database. Error:', apiError)
            // Fallback to local foods database
            const response = await fetch('/src/data/foods-database.json')
            console.log('🔍 Local database response:', response.ok)
            const localDb = await response.json()
            console.log('🔍 Local database loaded, foods count:', localDb.foods?.length)

            const searchTerm = searchQuery.toLowerCase()
            const matches = localDb.foods
              .filter(food =>
                food.name.toLowerCase().includes(searchTerm) ||
                (food.category && food.category.toLowerCase().includes(searchTerm))
              )
              .slice(0, 10)

            console.log('🔍 Local search matches found:', matches.length, matches)
            setSearchResults(matches)
          }
        } catch (error) {
          console.error('🔍 Food search error:', error)
          setSearchResults([])
        } finally {
          console.log('🔍 Setting loading to false')
          setLoading(false)
        }
      }, 300)

      return () => clearTimeout(timeoutId)
    } else {
      console.log('🔍 Search query too short, clearing results')
      setSearchResults([])
    }
  }, [searchQuery])

  const handleMealTypeSelect = (type) => {
    setMealType(type)
    setCurrentStep('foodSearch')
  }

  const addFood = (food) => {
    const existingIndex = selectedFoods.findIndex(f => f.name === food.name)

    if (existingIndex >= 0) {
      // Increase quantity if food already selected
      const updated = [...selectedFoods]
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
        calories: food.calories * (updated[existingIndex].quantity + 1),
        protein: food.protein * (updated[existingIndex].quantity + 1),
        carbs: food.carbs * (updated[existingIndex].quantity + 1),
        fat: food.fat * (updated[existingIndex].quantity + 1)
      }
      setSelectedFoods(updated)
    } else {
      // Add new food
      setSelectedFoods([...selectedFoods, {
        ...food,
        quantity: 1,
        unit: food.unit || 'serving'
      }])
    }
    setSearchQuery('')
  }

  const removeFood = (index) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index))
  }

  const updateFoodQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFood(index)
      return
    }

    const updated = [...selectedFoods]
    const food = updated[index]
    const baseFood = { // Calculate per-unit values
      calories: food.calories / food.quantity,
      protein: food.protein / food.quantity,
      carbs: food.carbs / food.quantity,
      fat: food.fat / food.quantity
    }

    updated[index] = {
      ...food,
      quantity: parseFloat(quantity),
      calories: baseFood.calories * quantity,
      protein: baseFood.protein * quantity,
      carbs: baseFood.carbs * quantity,
      fat: baseFood.fat * quantity
    }
    setSelectedFoods(updated)
  }

  const handleSubmit = async () => {
    if (selectedFoods.length === 0) {
      setError('Please add at least one food item')
      return
    }

    try {
      setLoading(true)

      try {
        await nutritionApi.logMeal(mealType, selectedFoods)
        onMealLogged()
        onClose()
      } catch (apiError) {
        console.log('Backend unavailable - meal logged locally in modal only')
        // When backend is down, just close modal and notify user
        setError('Backend unavailable - meal data shown but not persisted')
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      setError('Failed to log meal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '🌞' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snack', label: 'Snack', icon: '🍎' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="meal-log-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Meal</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {currentStep === 'mealType' && (
          <div className="meal-type-step">
            <h3>What type of meal?</h3>
            <div className="meal-type-grid">
              {mealTypes.map(type => (
                <button
                  key={type.id}
                  className="meal-type-button"
                  onClick={() => handleMealTypeSelect(type.id)}
                >
                  <span className="meal-icon">{type.icon}</span>
                  <span className="meal-label">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'foodSearch' && (
          <div className="food-search-step">
            <div className="step-header">
              <button
                className="back-button"
                onClick={() => setCurrentStep('mealType')}
              >
                ← Back
              </button>
              <h3>Add Foods to {mealTypes.find(t => t.id === mealType)?.label}</h3>
            </div>

            <div className="food-search">
              <input
                type="text"
                placeholder="Search for foods..."
                value={searchQuery}
                onChange={(e) => {
                  console.log('🔍 Input changed to:', e.target.value)
                  setSearchQuery(e.target.value)
                }}
                className="food-search-input"
              />

              {loading && <div className="search-loading">Searching...</div>}

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((food, index) => (
                    <div key={index} className="search-result-item" onClick={() => addFood(food)}>
                      <div className="food-info">
                        <div className="food-name">{food.name}</div>
                        <div className="food-details">
                          {food.calories} cal • {food.protein}g protein
                        </div>
                      </div>
                      <button className="add-food-button">+</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedFoods.length > 0 && (
              <div className="selected-foods">
                <h4>Selected Foods:</h4>
                {selectedFoods.map((food, index) => (
                  <div key={index} className="selected-food-item">
                    <div className="food-details">
                      <div className="food-name">{food.name}</div>
                      <div className="food-nutrition">
                        {Math.round(food.calories)} cal • {Math.round(food.protein)}g protein
                      </div>
                    </div>
                    <div className="quantity-controls">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={food.quantity}
                        onChange={(e) => updateFoodQuantity(index, e.target.value)}
                        className="quantity-input"
                      />
                      <span className="quantity-unit">{food.unit}</span>
                      <button
                        className="remove-button"
                        onClick={() => removeFood(index)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                <div className="modal-actions">
                  <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Logging...' : 'Log Meal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MealLogModal