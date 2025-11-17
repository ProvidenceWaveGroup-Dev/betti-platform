import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// For now, we'll use JSON files as a simple database
// This will be replaced with a proper database later

class NutritionService {
  constructor() {
    this.dataPath = join(process.cwd(), 'src/data')
    this.nutritionFilePath = join(this.dataPath, 'nutrition.json')
    this.foodsDbPath = join(this.dataPath, 'foods-database.json')
    this.mealsFilePath = join(this.dataPath, 'meals.json')

    // Initialize meals file if it doesn't exist
    this.initializeMealsFile()
  }

  initializeMealsFile() {
    try {
      readFileSync(this.mealsFilePath)
    } catch (error) {
      // File doesn't exist, create it with empty array
      const initialData = {
        meals: [],
        lastUpdated: new Date().toISOString()
      }
      writeFileSync(this.mealsFilePath, JSON.stringify(initialData, null, 2))
    }
  }

  // Read nutrition data from JSON file
  readNutritionData() {
    try {
      const data = readFileSync(this.nutritionFilePath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading nutrition data:', error)
      throw new Error('Failed to read nutrition data')
    }
  }

  // Read foods database
  readFoodsDatabase() {
    try {
      const data = readFileSync(this.foodsDbPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading foods database:', error)
      throw new Error('Failed to read foods database')
    }
  }

  // Read meals data
  readMealsData() {
    try {
      const data = readFileSync(this.mealsFilePath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading meals data:', error)
      return { meals: [], lastUpdated: new Date().toISOString() }
    }
  }

  // Write meals data
  writeMealsData(data) {
    try {
      writeFileSync(this.mealsFilePath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('Error writing meals data:', error)
      throw new Error('Failed to save meals data')
    }
  }

  // Get daily nutrition summary
  async getDailySummary(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0]

    // For now, return the static data from nutrition.json
    // Later this will calculate from actual meals for the date
    const nutritionData = this.readNutritionData()

    // Calculate daily summary from meals if they exist for the date
    const mealsData = this.readMealsData()
    const todaysMeals = mealsData.meals.filter(meal =>
      meal.date === targetDate
    )

    if (todaysMeals.length > 0) {
      // Calculate actual nutrition from logged meals
      return this.calculateDailySummaryFromMeals(todaysMeals, nutritionData.nutritionGoals)
    }

    // Return static data with today's date
    return {
      ...nutritionData.dailySummary,
      date: targetDate,
      todaysMeals: nutritionData.todaysMeals || []
    }
  }

  // Calculate nutrition summary from actual meals
  calculateDailySummaryFromMeals(meals, goals) {
    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein: acc.protein + (meal.totalProtein || 0),
      carbs: acc.carbs + (meal.totalCarbs || 0),
      fat: acc.fat + (meal.totalFat || 0),
      fiber: acc.fiber + (meal.totalFiber || 0),
      sodium: acc.sodium + (meal.totalSodium || 0)
    }), {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0
    })

    // Calculate percentages and remaining values
    const summary = {}
    for (const [key, consumed] of Object.entries(totals)) {
      const target = goals[key] || 0
      summary[key] = {
        consumed: Math.round(consumed),
        target,
        remaining: Math.max(0, target - consumed),
        percentage: target > 0 ? Math.round((consumed / target) * 100) : 0
      }
    }

    return {
      date: meals[0]?.date || new Date().toISOString().split('T')[0],
      ...summary,
      todaysMeals: meals
    }
  }

  // Log a new meal
  async logMeal(mealType, foods) {
    const mealsData = this.readMealsData()
    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    // Calculate meal totals
    const totals = foods.reduce((acc, food) => ({
      calories: acc.calories + (food.calories || 0),
      protein: acc.protein + (food.protein || 0),
      carbs: acc.carbs + (food.carbs || 0),
      fat: acc.fat + (food.fat || 0),
      fiber: acc.fiber + (food.fiber || 0),
      sodium: acc.sodium + (food.sodium || 0)
    }), {
      calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0
    })

    const newMeal = {
      id: Date.now(), // Simple ID generation
      date: currentDate,
      mealType: mealType.toLowerCase(),
      time: currentTime,
      foods,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalFiber: totals.fiber,
      totalSodium: totals.sodium,
      createdAt: new Date().toISOString()
    }

    mealsData.meals.push(newMeal)
    mealsData.lastUpdated = new Date().toISOString()

    this.writeMealsData(mealsData)

    return newMeal
  }

  // Search foods in database
  async searchFoods(query, limit = 20) {
    const foodsDb = this.readFoodsDatabase()
    const searchTerm = query.toLowerCase()

    const matchedFoods = foodsDb.foods.filter(food =>
      food.name.toLowerCase().includes(searchTerm) ||
      food.category?.toLowerCase().includes(searchTerm)
    ).slice(0, limit)

    return matchedFoods
  }

  // Get nutrition goals
  async getNutritionGoals() {
    const nutritionData = this.readNutritionData()
    return nutritionData.nutritionGoals
  }

  // Update nutrition goals
  async updateNutritionGoals(newGoals) {
    const nutritionData = this.readNutritionData()

    // Update goals while preserving existing values for missing fields
    nutritionData.nutritionGoals = {
      ...nutritionData.nutritionGoals,
      ...Object.fromEntries(
        Object.entries(newGoals).filter(([_, value]) => value !== undefined)
      )
    }

    // Save back to file (for now - later this will use a proper database)
    writeFileSync(this.nutritionFilePath, JSON.stringify(nutritionData, null, 2))

    return nutritionData.nutritionGoals
  }

  // Get nutrition history for date range
  async getNutritionHistory({ startDate, endDate, days = 7 }) {
    const mealsData = this.readMealsData()

    let filterStartDate, filterEndDate

    if (startDate && endDate) {
      filterStartDate = startDate
      filterEndDate = endDate
    } else {
      // Default to last N days
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days + 1)

      filterStartDate = start.toISOString().split('T')[0]
      filterEndDate = end.toISOString().split('T')[0]
    }

    // Filter meals by date range
    const filteredMeals = mealsData.meals.filter(meal =>
      meal.date >= filterStartDate && meal.date <= filterEndDate
    )

    // Group by date and calculate daily summaries
    const dailySummaries = {}
    const goals = await this.getNutritionGoals()

    filteredMeals.forEach(meal => {
      if (!dailySummaries[meal.date]) {
        dailySummaries[meal.date] = []
      }
      dailySummaries[meal.date].push(meal)
    })

    const history = Object.entries(dailySummaries).map(([date, meals]) =>
      this.calculateDailySummaryFromMeals(meals, goals)
    )

    return {
      startDate: filterStartDate,
      endDate: filterEndDate,
      history: history.sort((a, b) => new Date(b.date) - new Date(a.date))
    }
  }

  // Delete a meal
  async deleteMeal(mealId) {
    const mealsData = this.readMealsData()
    const mealIndex = mealsData.meals.findIndex(meal => meal.id == mealId)

    if (mealIndex === -1) {
      throw new Error('Meal not found')
    }

    mealsData.meals.splice(mealIndex, 1)
    mealsData.lastUpdated = new Date().toISOString()

    this.writeMealsData(mealsData)
  }

  // Get recently used foods
  async getRecentFoods(limit = 10) {
    const mealsData = this.readMealsData()

    // Extract all foods from recent meals and count usage
    const foodUsage = {}

    // Look at last 30 days of meals
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]

    mealsData.meals
      .filter(meal => meal.date >= cutoffDate)
      .forEach(meal => {
        meal.foods.forEach(food => {
          const foodKey = food.name.toLowerCase()
          if (!foodUsage[foodKey]) {
            foodUsage[foodKey] = { food, count: 0, lastUsed: meal.date }
          }
          foodUsage[foodKey].count++
          if (meal.date > foodUsage[foodKey].lastUsed) {
            foodUsage[foodKey].lastUsed = meal.date
          }
        })
      })

    // Sort by usage count and recency, return top foods
    return Object.values(foodUsage)
      .sort((a, b) => {
        // First by count, then by recency
        if (b.count !== a.count) return b.count - a.count
        return new Date(b.lastUsed) - new Date(a.lastUsed)
      })
      .slice(0, limit)
      .map(item => item.food)
  }
}

// Export singleton instance
export default new NutritionService()